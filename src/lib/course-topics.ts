import { getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  parseListQueryFromUrl,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";

export type CourseTopicRow = {
  id: number;
  companyId: number | null;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  isGlobal: boolean;
  courseCount?: number;
};

export const COURSE_TOPIC_SORT_ALLOWLIST = {
  name: "ct.name",
  slug: "ct.slug",
  sortOrder: "ct.sort_order",
  active: "ct.active",
  createdAt: "ct.created_at",
} as const;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function mapTopicRow(row: Record<string, unknown>): CourseTopicRow {
  return {
    id: Number(row.id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
    isGlobal: row.company_id == null,
    courseCount:
      row.course_count != null ? Number(row.course_count) : undefined,
  };
}

export async function listGlobalCourseTopics(
  activeOnly = true
): Promise<CourseTopicRow[]> {
  const sql = getSql();
  const activeFilter = activeOnly ? sql`AND ct.active = TRUE` : sql``;
  const rows = (await sql`
    SELECT ct.*,
      (
        SELECT COUNT(*)::int FROM master_courses mc WHERE mc.topic_id = ct.id
      ) AS course_count
    FROM course_topics ct
    WHERE ct.company_id IS NULL
    ${activeFilter}
    ORDER BY ct.sort_order ASC, ct.name ASC
  `) as Record<string, unknown>[];
  return rows.map(mapTopicRow);
}

export async function listAssignableCourseTopics(
  companyId: number,
  activeOnly = true
): Promise<CourseTopicRow[]> {
  const sql = getSql();
  const activeFilter = activeOnly ? sql`AND ct.active = TRUE` : sql``;
  const rows = (await sql`
    SELECT ct.*
    FROM course_topics ct
    WHERE (ct.company_id IS NULL OR ct.company_id = ${companyId})
    ${activeFilter}
    ORDER BY ct.company_id NULLS FIRST, ct.sort_order ASC, ct.name ASC
  `) as Record<string, unknown>[];
  return rows.map(mapTopicRow);
}

export async function assertTopicAssignableToCompany(
  companyId: number,
  topicId: number | null
): Promise<void> {
  if (topicId == null) return;
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM course_topics
    WHERE id = ${topicId}
      AND (company_id IS NULL OR company_id = ${companyId})
      AND active = TRUE
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("TOPIC_INVALID");
}

export async function getCourseTopic(
  topicId: number
): Promise<CourseTopicRow | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM course_topics WHERE id = ${topicId} LIMIT 1
  `;
  return rows[0]
    ? mapTopicRow(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function createGlobalCourseTopic(input: {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}): Promise<CourseTopicRow> {
  const sql = getSql();
  const name = input.name.trim();
  const slug = input.slug?.trim() || slugify(name);
  const rows = await sql`
    INSERT INTO course_topics (company_id, name, slug, description, sort_order, active)
    VALUES (
      NULL,
      ${name},
      ${slug},
      ${input.description ?? null},
      ${input.sortOrder ?? 0},
      ${input.active ?? true}
    )
    RETURNING *
  `;
  return mapTopicRow(rows[0] as Record<string, unknown>);
}

export async function createCompanyCourseTopic(
  companyId: number,
  input: {
    name: string;
    slug?: string;
    description?: string | null;
    sortOrder?: number;
    active?: boolean;
  }
): Promise<CourseTopicRow> {
  const sql = getSql();
  const name = input.name.trim();
  const slug = input.slug?.trim() || slugify(name);
  const rows = await sql`
    INSERT INTO course_topics (company_id, name, slug, description, sort_order, active)
    VALUES (
      ${companyId},
      ${name},
      ${slug},
      ${input.description ?? null},
      ${input.sortOrder ?? 0},
      ${input.active ?? true}
    )
    RETURNING *
  `;
  return mapTopicRow(rows[0] as Record<string, unknown>);
}

export async function updateCourseTopic(
  topicId: number,
  patch: {
    name?: string;
    slug?: string;
    description?: string | null;
    sortOrder?: number;
    active?: boolean;
  },
  opts?: { companyId?: number | null; globalOnly?: boolean }
): Promise<CourseTopicRow> {
  const sql = getSql();
  const existing = await getCourseTopic(topicId);
  if (!existing) throw new Error("NOT_FOUND");

  if (opts?.globalOnly && existing.companyId != null) {
    throw new Error("FORBIDDEN");
  }
  if (
    opts?.companyId != null &&
    existing.companyId != null &&
    existing.companyId !== opts.companyId
  ) {
    throw new Error("FORBIDDEN");
  }

  const rows = await sql`
    UPDATE course_topics SET
      name = ${patch.name ?? existing.name},
      slug = ${patch.slug ?? existing.slug},
      description = ${patch.description !== undefined ? patch.description : existing.description},
      sort_order = ${patch.sortOrder ?? existing.sortOrder},
      active = ${patch.active ?? existing.active},
      updated_at = NOW()
    WHERE id = ${topicId}
    RETURNING *
  `;
  return mapTopicRow(rows[0] as Record<string, unknown>);
}

export async function listCourseTopicsPaginated(
  scope: "global" | "company",
  companyId: number | null,
  query: ListQueryState
): Promise<{ topics: CourseTopicRow[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const scopeFilter =
    scope === "global"
      ? sql`AND ct.company_id IS NULL`
      : sql`AND ct.company_id = ${companyId}`;

  const activeFilter =
    query.status === "active"
      ? sql`AND ct.active = TRUE`
      : query.status === "archived"
        ? sql`AND ct.active = FALSE`
        : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(ct.name) LIKE ${searchPattern}
        OR LOWER(ct.slug) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    COURSE_TOPIC_SORT_ALLOWLIST,
    "ct.sort_order",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction, "last");

  const countExpr =
    scope === "global"
      ? sql`(SELECT COUNT(*)::int FROM master_courses mc WHERE mc.topic_id = ct.id)`
      : sql`(SELECT COUNT(*)::int FROM courses c WHERE c.topic_id = ct.id AND c.company_id = ${companyId})`;

  const rows = (await sql`
    SELECT
      ct.*,
      ${countExpr} AS course_count,
      COUNT(*) OVER()::int AS total_count
    FROM course_topics ct
    WHERE TRUE
    ${scopeFilter}
    ${activeFilter}
    ${searchFilter}
    ORDER BY ${orderBy}, ct.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `) as Record<string, unknown>[];

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    topics: rows.map(mapTopicRow),
    meta: buildListMeta(query, total),
  };
}

export function parseCourseTopicListQuery(
  params: URLSearchParams
): ListQueryState {
  return parseListQueryFromUrl(params, {
    sortBy: "sortOrder",
    sortDirection: "asc",
    status: "active",
  });
}

export async function setCompanyCourseTopicId(
  companyId: number,
  courseId: string,
  topicId: number | null
): Promise<void> {
  await assertTopicAssignableToCompany(companyId, topicId);
  const sql = getSql();
  const rows = await sql`
    UPDATE courses
    SET topic_id = ${topicId}, updated_at = NOW()
    WHERE id = ${courseId} AND company_id = ${companyId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error("NOT_FOUND");
}

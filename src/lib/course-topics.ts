import type { CourseTopicRef } from "./types";
import { getSql, isMissingDbObject } from "./db";
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

/** Leichte Liste für Formulare – ohne course_count-Subquery. */
export async function listGlobalCourseTopicOptions(
  activeOnly = true
): Promise<{ id: number; name: string }[]> {
  const sql = getSql();
  const activeFilter = activeOnly ? sql`AND ct.active = TRUE` : sql``;
  const rows = (await sql`
    SELECT ct.id, ct.name
    FROM course_topics ct
    WHERE ct.company_id IS NULL
    ${activeFilter}
    ORDER BY ct.sort_order ASC, ct.name ASC
  `) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
  }));
}

export async function listGlobalCourseTopics(
  activeOnly = true
): Promise<CourseTopicRow[]> {
  const sql = getSql();
  const activeFilter = activeOnly ? sql`AND ct.active = TRUE` : sql``;
  const rows = (await sql`
    SELECT ct.*,
      (
        SELECT COUNT(DISTINCT mct.master_course_id)::int
        FROM master_course_topics mct
        WHERE mct.topic_id = ct.id
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
      ? sql`(SELECT COUNT(DISTINCT mct.master_course_id)::int FROM master_course_topics mct WHERE mct.topic_id = ct.id)`
      : sql`(SELECT COUNT(DISTINCT cta.course_id)::int FROM course_topic_assignments cta JOIN courses c ON c.id = cta.course_id WHERE cta.topic_id = ct.id AND c.company_id = ${companyId})`;

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
  await setCourseTopicAssignments(
    companyId,
    courseId,
    topicId != null ? [topicId] : []
  );
}

function normalizeTopicIds(topicIds: number[] | undefined): number[] {
  if (!topicIds) return [];
  return [...new Set(topicIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
}

export async function assertTopicIdsAssignableToCompany(
  companyId: number,
  topicIds: number[]
): Promise<void> {
  for (const topicId of topicIds) {
    await assertTopicAssignableToCompany(companyId, topicId);
  }
}

export async function getCourseTopicAssignmentsForCourse(
  courseId: string
): Promise<CourseTopicRef[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ct.id, ct.name, ct.sort_order
    FROM course_topic_assignments cta
    JOIN course_topics ct ON ct.id = cta.topic_id
    WHERE cta.course_id = ${courseId}
    ORDER BY ct.sort_order ASC, ct.name ASC
  `) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function getMasterCourseTopicAssignments(
  masterCourseId: string
): Promise<CourseTopicRef[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ct.id, ct.name, ct.sort_order
    FROM master_course_topics mct
    JOIN course_topics ct ON ct.id = mct.topic_id
    WHERE mct.master_course_id = ${masterCourseId}
    ORDER BY ct.sort_order ASC, ct.name ASC
  `) as Record<string, unknown>[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function enrichCoursesWithTopics<
  T extends {
    id: string;
    topicId?: number | null;
    topicName?: string | null;
    topicSortOrder?: number;
  },
>(courses: T[]): Promise<(T & { topicIds: number[]; topics: CourseTopicRef[] })[]> {
  if (courses.length === 0) return [];

  const applyLegacyOnly = () =>
    courses.map((course) => {
      const legacyTopicId = course.topicId ?? null;
      const topics: CourseTopicRef[] =
        legacyTopicId != null
          ? [
              {
                id: legacyTopicId,
                name: course.topicName?.trim() || "Hauptthema",
                sortOrder: course.topicSortOrder ?? 0,
              },
            ]
          : [];
      const topicIds = topics.map((t) => t.id);
      return {
        ...course,
        topics,
        topicIds,
        topicId: topics[0]?.id ?? legacyTopicId,
        topicName: topics[0]?.name ?? course.topicName ?? null,
        topicSortOrder: topics[0]?.sortOrder ?? course.topicSortOrder,
      };
    });

  const sql = getSql();
  const ids = courses.map((c) => c.id);

  let rows: Record<string, unknown>[];
  try {
    rows = (await sql`
      SELECT cta.course_id, ct.id, ct.name, ct.sort_order
      FROM course_topic_assignments cta
      JOIN course_topics ct ON ct.id = cta.topic_id
      WHERE cta.course_id IN ${sql(ids)}
      ORDER BY ct.sort_order ASC, ct.name ASC
    `) as Record<string, unknown>[];
  } catch (err) {
    if (
      isMissingDbObject(err, "course_topic_assignments") ||
      isMissingDbObject(err, "course_topics")
    ) {
      return applyLegacyOnly();
    }
    throw err;
  }

  const byCourse = new Map<string, CourseTopicRef[]>();
  for (const row of rows) {
    const courseId = String(row.course_id);
    if (!byCourse.has(courseId)) byCourse.set(courseId, []);
    byCourse.get(courseId)!.push({
      id: Number(row.id),
      name: String(row.name),
      sortOrder: Number(row.sort_order ?? 0),
    });
  }

  return courses.map((course) => {
    const topics = byCourse.get(course.id) ?? [];
    const legacyTopicId = course.topicId ?? null;
    const topicIds =
      topics.length > 0
        ? topics.map((t) => t.id)
        : legacyTopicId != null
          ? [legacyTopicId]
          : [];
    const primary = topics[0] ?? null;
    return {
      ...course,
      topics,
      topicIds,
      topicId: primary?.id ?? legacyTopicId,
      topicName: primary?.name ?? null,
      topicSortOrder: primary?.sortOrder,
    };
  });
}

export async function enrichMasterCoursesWithTopics<
  T extends { id: string; topicId?: number | null },
>(courses: T[]): Promise<(T & { topicIds: number[]; topics: CourseTopicRef[] })[]> {
  if (courses.length === 0) return [];
  const sql = getSql();
  const ids = courses.map((c) => c.id);
  const rows = (await sql`
    SELECT mct.master_course_id, ct.id, ct.name, ct.sort_order
    FROM master_course_topics mct
    JOIN course_topics ct ON ct.id = mct.topic_id
    WHERE mct.master_course_id IN ${sql(ids)}
    ORDER BY ct.sort_order ASC, ct.name ASC
  `) as Record<string, unknown>[];

  const byMaster = new Map<string, CourseTopicRef[]>();
  for (const row of rows) {
    const masterId = String(row.master_course_id);
    if (!byMaster.has(masterId)) byMaster.set(masterId, []);
    byMaster.get(masterId)!.push({
      id: Number(row.id),
      name: String(row.name),
      sortOrder: Number(row.sort_order ?? 0),
    });
  }

  return courses.map((course) => {
    const topics = byMaster.get(course.id) ?? [];
    const legacyTopicId = course.topicId ?? null;
    const topicIds =
      topics.length > 0
        ? topics.map((t) => t.id)
        : legacyTopicId != null
          ? [legacyTopicId]
          : [];
    const primary = topics[0] ?? null;
    return {
      ...course,
      topics,
      topicIds,
      topicId: primary?.id ?? legacyTopicId,
      topicName: primary?.name ?? null,
      topicSortOrder: primary?.sortOrder,
    };
  });
}

export async function setCourseTopicAssignments(
  companyId: number,
  courseId: string,
  topicIds: number[]
): Promise<CourseTopicRef[]> {
  const normalized = normalizeTopicIds(topicIds);
  await assertTopicIdsAssignableToCompany(companyId, normalized);

  const sql = getSql();
  const courseRows = await sql`
    SELECT id FROM courses WHERE id = ${courseId} AND company_id = ${companyId} LIMIT 1
  `;
  if (courseRows.length === 0) throw new Error("NOT_FOUND");

  const legacyTopicId = normalized[0] ?? null;

  await sql.begin(async (tx) => {
    await tx`DELETE FROM course_topic_assignments WHERE course_id = ${courseId}`;
    for (const topicId of normalized) {
      await tx`
        INSERT INTO course_topic_assignments (course_id, topic_id)
        VALUES (${courseId}, ${topicId})
        ON CONFLICT (course_id, topic_id) DO NOTHING
      `;
    }
    await tx`
      UPDATE courses SET topic_id = ${legacyTopicId}, updated_at = NOW()
      WHERE id = ${courseId} AND company_id = ${companyId}
    `;
  });

  return getCourseTopicAssignmentsForCourse(courseId);
}

export async function setMasterCourseTopicAssignments(
  masterCourseId: string,
  topicIds: number[]
): Promise<CourseTopicRef[]> {
  const normalized = normalizeTopicIds(topicIds);
  for (const topicId of normalized) {
    const topic = await getCourseTopic(topicId);
    if (!topic || !topic.isGlobal || !topic.active) {
      throw new Error("TOPIC_INVALID");
    }
  }

  const sql = getSql();
  const masterRows = await sql`
    SELECT id FROM master_courses WHERE id = ${masterCourseId} LIMIT 1
  `;
  if (masterRows.length === 0) throw new Error("NOT_FOUND");

  const legacyTopicId = normalized[0] ?? null;

  await sql.begin(async (tx) => {
    await tx`DELETE FROM master_course_topics WHERE master_course_id = ${masterCourseId}`;
    for (const topicId of normalized) {
      await tx`
        INSERT INTO master_course_topics (master_course_id, topic_id)
        VALUES (${masterCourseId}, ${topicId})
        ON CONFLICT (master_course_id, topic_id) DO NOTHING
      `;
    }
    await tx`
      UPDATE master_courses SET topic_id = ${legacyTopicId}, updated_at = NOW()
      WHERE id = ${masterCourseId}
    `;
  });

  return getMasterCourseTopicAssignments(masterCourseId);
}

export async function syncCourseTopicsFromMaster(
  companyId: number,
  courseId: string,
  masterCourseId: string
): Promise<void> {
  const masterTopics = await getMasterCourseTopicAssignments(masterCourseId);
  if (masterTopics.length === 0) return;

  const sql = getSql();
  const existing = await sql`
    SELECT topic_id FROM course_topic_assignments WHERE course_id = ${courseId}
  `;
  if (existing.length > 0) return;

  await setCourseTopicAssignments(
    companyId,
    courseId,
    masterTopics.map((t) => t.id)
  );
}

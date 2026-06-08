import { getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import type { ResponsibilityType } from "./types";

export const RESPONSIBILITY_TYPE_SORT_ALLOWLIST = {
  name: "rt.name",
  slug: "rt.slug",
  sortOrder: "rt.sort_order",
  assignmentCount: "assignment_count",
  createdAt: "rt.created_at",
} as const;

export function normalizeResponsibilitySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapResponsibilityType(row: Record<string, unknown>): ResponsibilityType {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    assignmentCount: Number(row.assignment_count ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

export async function getResponsibilityTypeById(
  id: number
): Promise<ResponsibilityType | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      rt.*,
      COUNT(cr.id)::int AS assignment_count
    FROM responsibility_types rt
    LEFT JOIN company_responsibilities cr ON cr.responsibility_type_id = rt.id
    WHERE rt.id = ${id}
    GROUP BY rt.id
    LIMIT 1
  `;
  return rows[0]
    ? mapResponsibilityType(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function createResponsibilityType(input: {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
}): Promise<ResponsibilityType> {
  const sql = getSql();
  const name = input.name.trim();
  const slug = normalizeResponsibilitySlug(input.slug?.trim() || name);
  if (!name || !slug) throw new Error("NAME_REQUIRED");

  const rows = await sql`
    INSERT INTO responsibility_types (name, slug, description, active, sort_order)
    VALUES (
      ${name}, ${slug}, ${input.description?.trim() || null}, TRUE,
      ${input.sortOrder ?? 0}
    )
    RETURNING *
  `;
  return {
    ...mapResponsibilityType({
      ...(rows[0] as Record<string, unknown>),
      assignment_count: 0,
    }),
  };
}

export async function updateResponsibilityType(
  id: number,
  patch: {
    name?: string;
    slug?: string;
    description?: string | null;
    active?: boolean;
    sortOrder?: number;
  }
): Promise<ResponsibilityType | undefined> {
  const sql = getSql();
  const updates: Record<string, string | boolean | null | number> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.slug !== undefined) updates.slug = normalizeResponsibilitySlug(patch.slug);
  if (patch.description !== undefined) {
    updates.description = patch.description?.trim() || null;
  }
  if (patch.active !== undefined) updates.active = Boolean(patch.active);
  if (patch.sortOrder !== undefined) updates.sort_order = Number(patch.sortOrder);

  const keys = Object.keys(updates) as (keyof typeof updates)[];
  if (keys.length === 0) return getResponsibilityTypeById(id);

  await sql`
    UPDATE responsibility_types
    SET ${sql(updates, ...keys)}, updated_at = NOW()
    WHERE id = ${id}
  `;
  return getResponsibilityTypeById(id);
}

export async function listResponsibilityTypesPaginated(
  query: ListQueryState
): Promise<{ responsibilityTypes: ResponsibilityType[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND rt.active = TRUE`
      : query.status === "archived"
        ? sql`AND rt.active = FALSE`
        : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(rt.name) LIKE ${searchPattern}
        OR LOWER(rt.slug) LIKE ${searchPattern}
        OR LOWER(COALESCE(rt.description, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    RESPONSIBILITY_TYPE_SORT_ALLOWLIST,
    "rt.sort_order",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction);

  const rows = await sql`
    SELECT
      rt.*,
      COUNT(cr.id)::int AS assignment_count,
      COUNT(*) OVER()::int AS total_count
    FROM responsibility_types rt
    LEFT JOIN company_responsibilities cr ON cr.responsibility_type_id = rt.id
    WHERE TRUE
    ${activeFilter}
    ${searchFilter}
    GROUP BY rt.id
    ORDER BY ${orderBy}, rt.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    responsibilityTypes: rows.map((r) =>
      mapResponsibilityType(r as Record<string, unknown>)
    ),
    meta: buildListMeta(query, total),
  };
}

export async function listActiveResponsibilityTypes(): Promise<
  Pick<ResponsibilityType, "id" | "name" | "slug" | "description" | "sortOrder">[]
> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, slug, description, sort_order
    FROM responsibility_types
    WHERE active = TRUE
    ORDER BY sort_order, name
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    slug: String(r.slug),
    description: r.description != null ? String(r.description) : null,
    sortOrder: Number(r.sort_order ?? 0),
  }));
}

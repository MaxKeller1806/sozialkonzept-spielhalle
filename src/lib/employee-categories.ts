import { validateAssignableCourseIds } from "./course-db";
import { sumEstimatedDurationMinutes } from "./course-duration";
import { ensureSeeded, getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import type { EmployeeCategory } from "./types";

export const EMPLOYEE_CATEGORY_SORT_ALLOWLIST = {
  name: "ec.name",
  courseCount: "course_count",
  totalDurationMinutes: "total_duration_minutes",
  active: "ec.active",
  createdAt: "ec.created_at",
} as const;

function mapCategory(row: Record<string, unknown>): EmployeeCategory {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    active: Boolean(row.active),
    masterTemplateId:
      row.master_template_id != null ? Number(row.master_template_id) : null,
    courseCount: Number(row.course_count ?? 0),
    totalDurationMinutes: Number(row.total_duration_minutes ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

export async function listEmployeeCategories(
  companyId: number,
  filter: "active" | "archived" | "all" = "active"
): Promise<EmployeeCategory[]> {
  await ensureSeeded();
  const sql = getSql();
  const activeFilter =
    filter === "active"
      ? sql`AND ec.active = TRUE`
      : filter === "archived"
        ? sql`AND ec.active = FALSE`
        : sql``;

  const rows = await sql`
    SELECT
      ec.*,
      COUNT(ecca.course_id)::int AS course_count,
      COALESCE(SUM(c.estimated_duration_minutes), 0)::int AS total_duration_minutes
    FROM employee_categories ec
    LEFT JOIN employee_category_course_assignments ecca
      ON ecca.employee_category_id = ec.id
    LEFT JOIN courses c ON c.id = ecca.course_id AND c.company_id = ec.company_id
    WHERE ec.company_id = ${companyId}
    ${activeFilter}
    GROUP BY ec.id
    ORDER BY ec.name
  `;
  return rows.map((r) => mapCategory(r as Record<string, unknown>));
}

export async function listEmployeeCategoriesPaginated(
  companyId: number,
  query: ListQueryState
): Promise<{ categories: EmployeeCategory[]; meta: ListMeta }> {
  await ensureSeeded();
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND ec.active = TRUE`
      : query.status === "archived"
        ? sql`AND ec.active = FALSE`
        : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(ec.name) LIKE ${searchPattern}
        OR LOWER(COALESCE(ec.description, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    EMPLOYEE_CATEGORY_SORT_ALLOWLIST,
    "ec.name",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction);

  const rows = await sql`
    SELECT
      ec.*,
      COUNT(ecca.course_id)::int AS course_count,
      COALESCE(SUM(c.estimated_duration_minutes), 0)::int AS total_duration_minutes,
      COUNT(*) OVER()::int AS total_count
    FROM employee_categories ec
    LEFT JOIN employee_category_course_assignments ecca
      ON ecca.employee_category_id = ec.id
    LEFT JOIN courses c ON c.id = ecca.course_id AND c.company_id = ec.company_id
    WHERE ec.company_id = ${companyId}
    ${activeFilter}
    ${searchFilter}
    GROUP BY ec.id
    ORDER BY ${orderBy}, ec.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    categories: rows.map((r) => mapCategory(r as Record<string, unknown>)),
    meta: buildListMeta(query, total),
  };
}

export async function getEmployeeCategory(
  companyId: number,
  categoryId: number
): Promise<EmployeeCategory | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT
      ec.*,
      COUNT(ecca.course_id)::int AS course_count,
      COALESCE(SUM(c.estimated_duration_minutes), 0)::int AS total_duration_minutes
    FROM employee_categories ec
    LEFT JOIN employee_category_course_assignments ecca
      ON ecca.employee_category_id = ec.id
    LEFT JOIN courses c ON c.id = ecca.course_id AND c.company_id = ec.company_id
    WHERE ec.company_id = ${companyId} AND ec.id = ${categoryId}
    GROUP BY ec.id
    LIMIT 1
  `;
  return rows[0] ? mapCategory(rows[0] as Record<string, unknown>) : undefined;
}

export async function getEmployeeCategoryCourseIds(
  categoryId: number,
  companyId: number
): Promise<string[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT ecca.course_id
    FROM employee_category_course_assignments ecca
    JOIN employee_categories ec ON ec.id = ecca.employee_category_id
    JOIN courses c ON c.id = ecca.course_id AND c.company_id = ec.company_id
    LEFT JOIN company_course_provisions p
      ON p.course_id = c.id AND p.company_id = c.company_id
    WHERE ecca.employee_category_id = ${categoryId}
      AND ec.company_id = ${companyId}
      AND c.active = TRUE
      AND (p.status IS NULL OR p.status = 'active')
    ORDER BY ecca.course_id
  `;
  return rows.map((r) => String(r.course_id));
}

export async function createEmployeeCategory(
  companyId: number,
  input: { name: string; description?: string | null }
): Promise<EmployeeCategory> {
  await ensureSeeded();
  const sql = getSql();
  const name = input.name.trim();
  if (!name) throw new Error("NAME_REQUIRED");

  const rows = await sql`
    INSERT INTO employee_categories (company_id, name, description, active)
    VALUES (${companyId}, ${name}, ${input.description?.trim() || null}, TRUE)
    RETURNING *
  `;
  return {
    ...mapCategory(rows[0] as Record<string, unknown>),
    courseCount: 0,
    totalDurationMinutes: 0,
  };
}

export async function updateEmployeeCategory(
  companyId: number,
  categoryId: number,
  patch: {
    name?: string;
    description?: string | null;
    active?: boolean;
  }
): Promise<EmployeeCategory | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const updates: Record<string, string | boolean | null> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.description !== undefined) {
    updates.description = patch.description?.trim() || null;
  }
  if (patch.active !== undefined) updates.active = Boolean(patch.active);

  const keys = Object.keys(updates) as (keyof typeof updates)[];
  if (keys.length === 0) {
    return getEmployeeCategory(companyId, categoryId);
  }

  await sql`
    UPDATE employee_categories
    SET ${sql(updates, ...keys)}, updated_at = NOW()
    WHERE id = ${categoryId} AND company_id = ${companyId}
  `;
  return getEmployeeCategory(companyId, categoryId);
}

export async function setEmployeeCategoryCourseAssignments(
  companyId: number,
  categoryId: number,
  courseIds: string[]
): Promise<void> {
  const existing = await getEmployeeCategory(companyId, categoryId);
  if (!existing) throw new Error("NOT_FOUND");

  const uniqueIds = [...new Set(courseIds.map(String))];
  await validateAssignableCourseIds(companyId, uniqueIds);

  const sql = getSql();
  await sql`
    DELETE FROM employee_category_course_assignments
    WHERE employee_category_id = ${categoryId}
  `;
  for (const courseId of uniqueIds) {
    await sql`
      INSERT INTO employee_category_course_assignments (employee_category_id, course_id)
      VALUES (${categoryId}, ${courseId})
      ON CONFLICT DO NOTHING
    `;
  }
  await sql`
    UPDATE employee_categories SET updated_at = NOW()
    WHERE id = ${categoryId} AND company_id = ${companyId}
  `;
}

export async function resolveCategoryDurationSummary(
  companyId: number,
  courseIds: string[]
): Promise<{ courseCount: number; totalDurationMinutes: number }> {
  if (courseIds.length === 0) {
    return { courseCount: 0, totalDurationMinutes: 0 };
  }
  await ensureSeeded();
  const sql = getSql();
  const uniqueIds = [...new Set(courseIds)];
  const rows = await sql`
    SELECT estimated_duration_minutes
    FROM courses
    WHERE company_id = ${companyId} AND id IN ${sql(uniqueIds)}
  `;
  const totalDurationMinutes = sumEstimatedDurationMinutes(
    rows.map((r) => ({
      estimatedDurationMinutes:
        r.estimated_duration_minutes != null
          ? Number(r.estimated_duration_minutes)
          : null,
    }))
  );
  return { courseCount: rows.length, totalDurationMinutes };
}

export async function assertEmployeeCategoryBelongsToCompany(
  companyId: number,
  categoryId: number | null | undefined
): Promise<void> {
  if (categoryId == null) return;
  const cat = await getEmployeeCategory(companyId, categoryId);
  if (!cat || !cat.active) throw new Error("FORBIDDEN");
}

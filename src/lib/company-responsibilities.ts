import { ensureSeeded, getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import {
  formatResponsibleUserNames,
  getCompanyResponsibilityPlaceholderValuesFromCourses,
  getCourseResponsibleUsers,
  listEmployeeCourseResponsibilities,
  type AssignableEmployee,
} from "./course-responsible-users";
import { buildResponsibilityPlaceholderMap } from "./responsibility-placeholders";
import { listActiveResponsibilityTypes } from "./responsibility-types";
import type {
  CompanyResponsibilityAssignment,
  EmployeeResponsibility,
} from "./types";

export type { AssignableEmployee };

export const COMPANY_RESPONSIBILITY_SORT_ALLOWLIST = {
  responsibilityTypeName: "rt.name",
  sortOrder: "rt.sort_order",
  userName: "u.last_name",
  assignedAt: "cr.assigned_at",
} as const;

function mapAssignment(row: Record<string, unknown>): CompanyResponsibilityAssignment {
  return {
    id: row.cr_id != null ? Number(row.cr_id) : null,
    companyId: Number(row.company_id),
    responsibilityTypeId: Number(row.responsibility_type_id),
    responsibilityTypeName: String(row.responsibility_type_name),
    responsibilityTypeSlug: String(row.responsibility_type_slug),
    responsibilityTypeDescription:
      row.responsibility_type_description != null
        ? String(row.responsibility_type_description)
        : null,
    sortOrder: Number(row.sort_order ?? 0),
    userId: row.user_id != null ? Number(row.user_id) : null,
    userFirstName: row.user_first_name != null ? String(row.user_first_name) : null,
    userLastName: row.user_last_name != null ? String(row.user_last_name) : null,
    userEmail: row.user_email != null ? String(row.user_email) : null,
    assignedAt:
      row.assigned_at != null
        ? new Date(String(row.assigned_at)).toISOString()
        : null,
  };
}

async function assertAssignableEmployee(
  companyId: number,
  userId: number
): Promise<void> {
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM users
    WHERE id = ${userId}
      AND company_id = ${companyId}
      AND role = 'employee'
      AND active = TRUE
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("INVALID_USER");
}

export async function listCompanyResponsibilities(
  companyId: number
): Promise<CompanyResponsibilityAssignment[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT
      cr.id AS cr_id,
      ${companyId}::bigint AS company_id,
      rt.id AS responsibility_type_id,
      rt.name AS responsibility_type_name,
      rt.slug AS responsibility_type_slug,
      rt.description AS responsibility_type_description,
      rt.sort_order,
      cr.user_id,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email AS user_email,
      cr.assigned_at
    FROM responsibility_types rt
    LEFT JOIN company_responsibilities cr
      ON cr.responsibility_type_id = rt.id AND cr.company_id = ${companyId}
    LEFT JOIN users u ON u.id = cr.user_id
    WHERE rt.active = TRUE
    ORDER BY rt.sort_order, rt.name
  `;
  return rows.map((r) => mapAssignment(r as Record<string, unknown>));
}

export async function listCompanyResponsibilitiesPaginated(
  companyId: number,
  query: ListQueryState
): Promise<{ assignments: CompanyResponsibilityAssignment[]; meta: ListMeta }> {
  await ensureSeeded();
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(rt.name) LIKE ${searchPattern}
        OR LOWER(COALESCE(u.first_name, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(u.last_name, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(u.email, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const assignedFilter =
    query.status === "active"
      ? sql`AND cr.id IS NOT NULL`
      : query.status === "archived"
        ? sql`AND cr.id IS NULL`
        : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    COMPANY_RESPONSIBILITY_SORT_ALLOWLIST,
    "rt.sort_order",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction);

  const rows = await sql`
    SELECT
      cr.id AS cr_id,
      ${companyId}::bigint AS company_id,
      rt.id AS responsibility_type_id,
      rt.name AS responsibility_type_name,
      rt.slug AS responsibility_type_slug,
      rt.description AS responsibility_type_description,
      rt.sort_order,
      cr.user_id,
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.email AS user_email,
      cr.assigned_at,
      COUNT(*) OVER()::int AS total_count
    FROM responsibility_types rt
    LEFT JOIN company_responsibilities cr
      ON cr.responsibility_type_id = rt.id AND cr.company_id = ${companyId}
    LEFT JOIN users u ON u.id = cr.user_id
    WHERE rt.active = TRUE
    ${searchFilter}
    ${assignedFilter}
    ORDER BY ${orderBy}, rt.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    assignments: rows.map((r) => mapAssignment(r as Record<string, unknown>)),
    meta: buildListMeta(query, total),
  };
}

export async function upsertCompanyResponsibility(
  companyId: number,
  responsibilityTypeId: number,
  userId: number | null
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();

  const typeRows = await sql`
    SELECT id FROM responsibility_types
    WHERE id = ${responsibilityTypeId} AND active = TRUE
    LIMIT 1
  `;
  if (typeRows.length === 0) throw new Error("TYPE_NOT_FOUND");

  if (userId == null) {
    await sql`
      DELETE FROM company_responsibilities
      WHERE company_id = ${companyId}
        AND responsibility_type_id = ${responsibilityTypeId}
    `;
    return;
  }

  await assertAssignableEmployee(companyId, userId);

  await sql`
    INSERT INTO company_responsibilities (
      company_id, responsibility_type_id, user_id, assigned_at
    )
    VALUES (${companyId}, ${responsibilityTypeId}, ${userId}, NOW())
    ON CONFLICT (company_id, responsibility_type_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      assigned_at = NOW(),
      updated_at = NOW()
  `;
}

export async function updateCompanyResponsibilities(
  companyId: number,
  assignments: Array<{ responsibilityTypeId: number; userId: number | null }>
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();
  await sql.begin(async (tx) => {
    for (const item of assignments) {
      const typeId = Number(item.responsibilityTypeId);
      if (!Number.isFinite(typeId) || typeId <= 0) {
        throw new Error("INVALID_TYPE");
      }

      const typeRows = await tx`
        SELECT id FROM responsibility_types
        WHERE id = ${typeId} AND active = TRUE
        LIMIT 1
      `;
      if (typeRows.length === 0) throw new Error("TYPE_NOT_FOUND");

      if (item.userId == null) {
        await tx`
          DELETE FROM company_responsibilities
          WHERE company_id = ${companyId}
            AND responsibility_type_id = ${typeId}
        `;
        continue;
      }

      const userId = Number(item.userId);
      if (!Number.isFinite(userId) || userId <= 0) throw new Error("INVALID_USER");

      const userRows = await tx`
        SELECT id FROM users
        WHERE id = ${userId}
          AND company_id = ${companyId}
          AND role = 'employee'
          AND active = TRUE
        LIMIT 1
      `;
      if (userRows.length === 0) throw new Error("INVALID_USER");

      await tx`
        INSERT INTO company_responsibilities (
          company_id, responsibility_type_id, user_id, assigned_at
        )
        VALUES (${companyId}, ${typeId}, ${userId}, NOW())
        ON CONFLICT (company_id, responsibility_type_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          assigned_at = NOW(),
          updated_at = NOW()
      `;
    }
  });
}

export async function listEmployeeResponsibilities(
  userId: number,
  companyId: number
): Promise<EmployeeResponsibility[]> {
  const rows = await listEmployeeCourseResponsibilities(userId, companyId);
  if (rows.length > 0) {
    return rows.map((r) => ({
      courseId: r.courseId,
      name: r.courseTitle,
      instructionCode: r.instructionCode,
      assignedAt: r.assignedAt,
    }));
  }

  await ensureSeeded();
  const sql = getSql();
  const legacyRows = await sql`
    SELECT
      rt.id AS responsibility_type_id,
      rt.name,
      cr.assigned_at
    FROM company_responsibilities cr
    JOIN responsibility_types rt ON rt.id = cr.responsibility_type_id
    WHERE cr.company_id = ${companyId}
      AND cr.user_id = ${userId}
      AND rt.active = TRUE
    ORDER BY rt.sort_order, rt.name
  `;
  return legacyRows.map((r) => ({
    courseId: `legacy-type-${r.responsibility_type_id}`,
    name: String(r.name),
    instructionCode: null,
    assignedAt: new Date(String(r.assigned_at)).toISOString(),
  }));
}

/** Vorbereitung für Zertifikat-Designer: Platzhalter → Personenname je Firma. */
export async function getCompanyResponsibilityPlaceholderValues(
  companyId: number
): Promise<Record<string, string>> {
  const fromCourses =
    await getCompanyResponsibilityPlaceholderValuesFromCourses(companyId);
  if (Object.keys(fromCourses).length > 0) {
    return fromCourses;
  }

  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT rt.slug, u.first_name, u.last_name
    FROM company_responsibilities cr
    JOIN responsibility_types rt ON rt.id = cr.responsibility_type_id
    JOIN users u ON u.id = cr.user_id
    WHERE cr.company_id = ${companyId}
      AND rt.active = TRUE
  `;
  return buildResponsibilityPlaceholderMap(
    rows.map((r) => ({
      slug: String(r.slug),
      personName: `${String(r.first_name)} ${String(r.last_name)}`.trim(),
    }))
  );
}

export type CourseResponsibilityContext = {
  responsiblePerson: string;
  responsibilityName: string;
  responsibleEmail: string;
};

/** Verantwortliche Person(en) für Zertifikate/Nachweise eines Firmenkurses. */
export async function getCourseResponsibilityContext(
  companyId: number,
  courseId: string
): Promise<CourseResponsibilityContext | null> {
  await ensureSeeded();
  const sql = getSql();

  const users = await getCourseResponsibleUsers(companyId, courseId);
  if (users.length > 0) {
    const courseRows = await sql`
      SELECT title FROM courses
      WHERE id = ${courseId} AND company_id = ${companyId}
      LIMIT 1
    `;
    return {
      responsiblePerson: formatResponsibleUserNames(users),
      responsibilityName:
        courseRows.length > 0 ? String(courseRows[0].title) : "",
      responsibleEmail: users[0]?.email ?? "",
    };
  }

  const topicRows = await sql`
    SELECT ct.slug
    FROM course_topic_assignments cta
    JOIN course_topics ct ON ct.id = cta.topic_id
    WHERE cta.course_id = ${courseId}
    ORDER BY ct.sort_order ASC, ct.name ASC
  `;

  let slugs = topicRows.map((r) => String(r.slug));

  if (slugs.length === 0) {
    const legacyRows = await sql`
      SELECT ct.slug
      FROM courses c
      JOIN course_topics ct ON ct.id = c.topic_id
      WHERE c.id = ${courseId}
        AND c.company_id = ${companyId}
        AND c.topic_id IS NOT NULL
      LIMIT 1
    `;
    slugs = legacyRows.map((r) => String(r.slug));
  }

  for (const slug of slugs) {
    const rows = await sql`
      SELECT rt.name, u.first_name, u.last_name, u.email
      FROM responsibility_types rt
      JOIN company_responsibilities cr
        ON cr.responsibility_type_id = rt.id AND cr.company_id = ${companyId}
      JOIN users u ON u.id = cr.user_id
      WHERE rt.slug = ${slug}
        AND rt.active = TRUE
        AND cr.user_id IS NOT NULL
      LIMIT 1
    `;
    if (rows.length > 0) {
      const row = rows[0];
      return {
        responsiblePerson: `${String(row.first_name)} ${String(row.last_name)}`.trim(),
        responsibilityName: String(row.name),
        responsibleEmail: row.email != null ? String(row.email) : "",
      };
    }
  }

  return null;
}

export async function listActiveResponsibilityTypeSlugs(): Promise<string[]> {
  const types = await listActiveResponsibilityTypes();
  return types.map((t) => t.slug);
}

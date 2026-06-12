import { ensureSeeded, getSql } from "./db";
import { listCompanyCourses } from "./course-db";
import {
  groupCoursesByTopic,
  UNCategorized_TOPIC_LABEL,
  type CourseTopicGroup,
} from "./course-hierarchy";
import {
  adminAccessFromSession,
  assertEmployeeInAdminScope,
  isCompanyWideAdmin,
  type AdminAccess,
} from "./admin-access";
import { sqlUserAssignedToLocationFilter } from "./user-locations";
import type { CourseMeta } from "./types";

export type ResponsibleUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  assignedAt: string;
};

export type ResponsibilitySource = "course" | "topic" | "none";

export type CourseResponsibilityItem = {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  instructionCode: string | null;
  active: boolean;
  sortOrder: number;
  topics: CourseMeta["topics"];
  topicId: number | null;
  topicIds: number[];
  topicName: string | null;
  topicSortOrder: number;
  responsibleUsers: ResponsibleUser[];
  responsibilitySource: ResponsibilitySource;
  hasCourseOverride: boolean;
};

export type TopicResponsibilityGroup = CourseTopicGroup<CourseResponsibilityItem> & {
  topicResponsibleUsers: ResponsibleUser[];
};

export type AssignableEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type AdminCourseResponsibilitiesPayload = {
  groups: TopicResponsibilityGroup[];
  uncategorized: CourseResponsibilityItem[];
  employees: AssignableEmployee[];
};

export type EmployeeCourseResponsibility = {
  courseId: string;
  courseTitle: string;
  instructionCode: string | null;
  assignedAt: string;
};

function mapResponsibleUser(row: Record<string, unknown>): ResponsibleUser {
  return {
    id: Number(row.user_id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    assignedAt: new Date(String(row.assigned_at)).toISOString(),
  };
}

function formatPersonName(user: Pick<ResponsibleUser, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function formatResponsibleUserNames(users: ResponsibleUser[]): string {
  return users.map(formatPersonName).filter(Boolean).join(", ");
}

function dedupeUsers(users: ResponsibleUser[]): ResponsibleUser[] {
  const seen = new Set<number>();
  const result: ResponsibleUser[] = [];
  for (const user of users) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    result.push(user);
  }
  return result;
}

export async function listAssignableEmployees(
  companyId: number,
  admin?: AdminAccess | null
): Promise<AssignableEmployee[]> {
  await ensureSeeded();
  const sql = getSql();

  const locationFilter =
    admin && !isCompanyWideAdmin(admin)
      ? sqlUserAssignedToLocationFilter(sql, admin.adminLocationId)
      : sql``;

  const rows = await sql`
    SELECT u.id, u.first_name, u.last_name, u.email
    FROM users u
    WHERE u.company_id = ${companyId}
      AND u.role = 'employee'
      AND u.active = TRUE
    ${locationFilter}
    ORDER BY u.last_name, u.first_name
  `;

  return rows.map((r) => ({
    id: Number(r.id),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: String(r.email),
  }));
}

async function loadResponsibleUsersByCourse(
  companyId: number
): Promise<Map<string, ResponsibleUser[]>> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      cru.course_id,
      cru.user_id,
      cru.assigned_at,
      u.first_name,
      u.last_name,
      u.email
    FROM course_responsible_users cru
    JOIN users u ON u.id = cru.user_id
    WHERE cru.company_id = ${companyId}
      AND u.active = TRUE
    ORDER BY u.last_name, u.first_name
  `;

  const map = new Map<string, ResponsibleUser[]>();
  for (const row of rows) {
    const courseId = String(row.course_id);
    const list = map.get(courseId) ?? [];
    list.push(mapResponsibleUser(row as Record<string, unknown>));
    map.set(courseId, list);
  }
  return map;
}

async function loadResponsibleUsersByTopic(
  companyId: number
): Promise<Map<number, ResponsibleUser[]>> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      tru.topic_id,
      tru.user_id,
      tru.assigned_at,
      u.first_name,
      u.last_name,
      u.email
    FROM topic_responsible_users tru
    JOIN users u ON u.id = tru.user_id
    WHERE tru.company_id = ${companyId}
      AND u.active = TRUE
    ORDER BY u.last_name, u.first_name
  `;

  const map = new Map<number, ResponsibleUser[]>();
  for (const row of rows) {
    const topicId = Number(row.topic_id);
    const list = map.get(topicId) ?? [];
    list.push(mapResponsibleUser(row as Record<string, unknown>));
    map.set(topicId, list);
  }
  return map;
}

async function loadCourseOverrideIds(companyId: number): Promise<Set<string>> {
  const sql = getSql();
  const rows = await sql`
    SELECT course_id
    FROM course_responsibility_overrides
    WHERE company_id = ${companyId}
  `;
  return new Set(rows.map((r) => String(r.course_id)));
}

function getCourseTopicIds(course: CourseMeta): number[] {
  if (course.topics && course.topics.length > 0) {
    return course.topics.map((t) => t.id);
  }
  if (course.topicIds && course.topicIds.length > 0) {
    return course.topicIds;
  }
  if (course.topicId != null) {
    return [course.topicId];
  }
  return [];
}

function resolveEffectiveForTopicContext(
  course: CourseMeta,
  topicId: number | null,
  courseUsers: Map<string, ResponsibleUser[]>,
  topicUsers: Map<number, ResponsibleUser[]>,
  overrides: Set<string>
): { users: ResponsibleUser[]; source: ResponsibilitySource } {
  const hasOverride = overrides.has(course.id);

  if (hasOverride) {
    const users = courseUsers.get(course.id) ?? [];
    return { users, source: users.length > 0 ? "course" : "none" };
  }

  if (topicId != null) {
    const users = topicUsers.get(topicId) ?? [];
    return { users, source: users.length > 0 ? "topic" : "none" };
  }

  return { users: [], source: "none" };
}

function resolveEffectiveForCertificate(
  course: CourseMeta,
  courseUsers: Map<string, ResponsibleUser[]>,
  topicUsers: Map<number, ResponsibleUser[]>,
  overrides: Set<string>
): ResponsibleUser[] {
  if (overrides.has(course.id)) {
    return courseUsers.get(course.id) ?? [];
  }

  const topicIds = getCourseTopicIds(course);
  const merged: ResponsibleUser[] = [];
  for (const topicId of topicIds) {
    merged.push(...(topicUsers.get(topicId) ?? []));
  }
  return dedupeUsers(merged);
}

function courseToResponsibilityItem(
  course: CourseMeta,
  effective: { users: ResponsibleUser[]; source: ResponsibilitySource },
  hasCourseOverride: boolean
): CourseResponsibilityItem {
  return {
    id: course.id,
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    instructionCode: course.instructionCode ?? null,
    active: course.active,
    sortOrder: course.sortOrder ?? 0,
    topics: course.topics,
    topicId: course.topicId ?? null,
    topicIds: course.topicIds ?? [],
    topicName: course.topicName ?? null,
    topicSortOrder: course.topicSortOrder ?? 0,
    responsibleUsers: effective.users,
    responsibilitySource: effective.source,
    hasCourseOverride,
  };
}

export async function listAdminCourseResponsibilities(
  companyId: number,
  admin?: AdminAccess | null
): Promise<AdminCourseResponsibilitiesPayload> {
  await ensureSeeded();
  const [courses, byCourse, byTopic, overrides, employees] = await Promise.all([
    listCompanyCourses(companyId, "active"),
    loadResponsibleUsersByCourse(companyId),
    loadResponsibleUsersByTopic(companyId),
    loadCourseOverrideIds(companyId),
    listAssignableEmployees(companyId, admin),
  ]);

  const items = courses.map((course) => {
    const effective = resolveEffectiveForCertificate(
      course,
      byCourse,
      byTopic,
      overrides
    );
    const hasOverride = overrides.has(course.id);
    return courseToResponsibilityItem(
      course,
      {
        users: effective,
        source: hasOverride
          ? effective.length > 0
            ? "course"
            : "none"
          : effective.length > 0
            ? "topic"
            : "none",
      },
      hasOverride
    );
  });

  const { groups, uncategorized } = groupCoursesByTopic(items);

  const courseById = new Map(courses.map((c) => [c.id, c]));

  const topicGroups: TopicResponsibilityGroup[] = groups.map((group) => ({
    ...group,
    topicResponsibleUsers: group.topicId != null ? byTopic.get(group.topicId) ?? [] : [],
    courses: group.courses.map((course) => {
      const meta = courseById.get(course.courseId)!;
      const effective = resolveEffectiveForTopicContext(
        meta,
        group.topicId,
        byCourse,
        byTopic,
        overrides
      );
      return courseToResponsibilityItem(
        meta,
        effective,
        overrides.has(course.courseId)
      );
    }),
  }));

  const uncategorizedItems = uncategorized.map((course) => {
    const meta = courseById.get(course.courseId)!;
    const effective = resolveEffectiveForTopicContext(
      meta,
      null,
      byCourse,
      byTopic,
      overrides
    );
    return courseToResponsibilityItem(meta, effective, overrides.has(course.courseId));
  });

  return { groups: topicGroups, uncategorized: uncategorizedItems, employees };
}

async function assertCourseBelongsToCompany(
  companyId: number,
  courseId: string
): Promise<void> {
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM courses
    WHERE id = ${courseId}
      AND company_id = ${companyId}
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("COURSE_NOT_FOUND");
}

async function assertTopicExists(topicId: number): Promise<void> {
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM course_topics
    WHERE id = ${topicId}
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("TOPIC_NOT_FOUND");
}

async function assertAssignableEmployees(
  companyId: number,
  userIds: number[],
  admin?: AdminAccess | null
): Promise<void> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;

  const sql = getSql();
  for (const userId of uniqueIds) {
    const rows = await sql`
      SELECT id FROM users
      WHERE id = ${userId}
        AND company_id = ${companyId}
        AND role = 'employee'
        AND active = TRUE
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("INVALID_USER");
    if (admin) {
      await assertEmployeeInAdminScope(admin, userId);
    }
  }
}

export async function setTopicResponsibleUsers(
  companyId: number,
  topicId: number,
  userIds: number[],
  admin?: AdminAccess | null
): Promise<ResponsibleUser[]> {
  await ensureSeeded();
  await assertTopicExists(topicId);

  const uniqueIds = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  await assertAssignableEmployees(companyId, uniqueIds, admin);

  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM topic_responsible_users
      WHERE company_id = ${companyId}
        AND topic_id = ${topicId}
    `;

    for (const userId of uniqueIds) {
      await tx`
        INSERT INTO topic_responsible_users (
          company_id, topic_id, user_id, assigned_at
        )
        VALUES (${companyId}, ${topicId}, ${userId}, NOW())
      `;
    }
  });

  const map = await loadResponsibleUsersByTopic(companyId);
  return map.get(topicId) ?? [];
}

export async function setCourseResponsibleUsers(
  companyId: number,
  courseId: string,
  userIds: number[],
  admin?: AdminAccess | null
): Promise<ResponsibleUser[]> {
  await ensureSeeded();
  await assertCourseBelongsToCompany(companyId, courseId);

  const uniqueIds = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  await assertAssignableEmployees(companyId, uniqueIds, admin);

  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM course_responsible_users
      WHERE company_id = ${companyId}
        AND course_id = ${courseId}
    `;

    for (const userId of uniqueIds) {
      await tx`
        INSERT INTO course_responsible_users (
          company_id, course_id, user_id, assigned_at
        )
        VALUES (${companyId}, ${courseId}, ${userId}, NOW())
      `;
    }

    await tx`
      INSERT INTO course_responsibility_overrides (company_id, course_id)
      VALUES (${companyId}, ${courseId})
      ON CONFLICT (company_id, course_id) DO UPDATE SET updated_at = NOW()
    `;
  });

  const map = await loadResponsibleUsersByCourse(companyId);
  return map.get(courseId) ?? [];
}

export async function resetCourseToTopicDefault(
  companyId: number,
  courseId: string
): Promise<void> {
  await ensureSeeded();
  await assertCourseBelongsToCompany(companyId, courseId);

  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM course_responsible_users
      WHERE company_id = ${companyId}
        AND course_id = ${courseId}
    `;
    await tx`
      DELETE FROM course_responsibility_overrides
      WHERE company_id = ${companyId}
        AND course_id = ${courseId}
    `;
  });
}

async function loadCourseMetaForEffective(
  companyId: number,
  courseId: string
): Promise<CourseMeta | null> {
  const courses = await listCompanyCourses(companyId, "all");
  return courses.find((c) => c.id === courseId) ?? null;
}

/** Zertifikate/Nachweise: effektive verantwortliche Personen (Override oder Hauptthema). */
export async function getCourseResponsibleUserNames(
  companyId: number,
  courseId: string
): Promise<string> {
  const users = await getCourseResponsibleUsers(companyId, courseId);
  return formatResponsibleUserNames(users);
}

export async function getCourseResponsibleUsers(
  companyId: number,
  courseId: string
): Promise<ResponsibleUser[]> {
  await ensureSeeded();
  const [course, byCourse, byTopic, overrides] = await Promise.all([
    loadCourseMetaForEffective(companyId, courseId),
    loadResponsibleUsersByCourse(companyId),
    loadResponsibleUsersByTopic(companyId),
    loadCourseOverrideIds(companyId),
  ]);

  if (!course) return [];

  return resolveEffectiveForCertificate(course, byCourse, byTopic, overrides);
}

export async function listEmployeeCourseResponsibilities(
  userId: number,
  companyId: number
): Promise<EmployeeCourseResponsibility[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT course_id, course_title, instruction_code, MIN(assigned_at) AS assigned_at
    FROM (
      SELECT
        c.id AS course_id,
        c.title AS course_title,
        c.instruction_code,
        cru.assigned_at
      FROM course_responsible_users cru
      JOIN course_responsibility_overrides cro
        ON cro.company_id = cru.company_id AND cro.course_id = cru.course_id
      JOIN courses c ON c.id = cru.course_id AND c.company_id = ${companyId}
      WHERE cru.company_id = ${companyId}
        AND cru.user_id = ${userId}

      UNION ALL

      SELECT
        c.id AS course_id,
        c.title AS course_title,
        c.instruction_code,
        tru.assigned_at
      FROM courses c
      JOIN course_topic_assignments cta ON cta.course_id = c.id
      JOIN topic_responsible_users tru
        ON tru.topic_id = cta.topic_id AND tru.company_id = ${companyId}
      LEFT JOIN course_responsibility_overrides cro
        ON cro.company_id = c.company_id AND cro.course_id = c.id
      WHERE c.company_id = ${companyId}
        AND c.active = TRUE
        AND tru.user_id = ${userId}
        AND cro.course_id IS NULL

      UNION ALL

      SELECT
        c.id AS course_id,
        c.title AS course_title,
        c.instruction_code,
        tru.assigned_at
      FROM courses c
      JOIN topic_responsible_users tru
        ON tru.topic_id = c.topic_id AND tru.company_id = ${companyId}
      LEFT JOIN course_responsibility_overrides cro
        ON cro.company_id = c.company_id AND cro.course_id = c.id
      WHERE c.company_id = ${companyId}
        AND c.active = TRUE
        AND c.topic_id IS NOT NULL
        AND tru.user_id = ${userId}
        AND cro.course_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM course_topic_assignments cta2 WHERE cta2.course_id = c.id
        )
    ) AS combined
    GROUP BY course_id, course_title, instruction_code
    ORDER BY course_title
  `;

  if (rows.length > 0) {
    return rows.map((r) => ({
      courseId: String(r.course_id),
      courseTitle: String(r.course_title),
      instructionCode:
        r.instruction_code != null ? String(r.instruction_code) : null,
      assignedAt: new Date(String(r.assigned_at)).toISOString(),
    }));
  }

  const legacyRows = await sql`
    SELECT
      rt.name AS course_title,
      cr.assigned_at
    FROM company_responsibilities cr
    JOIN responsibility_types rt ON rt.id = cr.responsibility_type_id
    WHERE cr.company_id = ${companyId}
      AND cr.user_id = ${userId}
      AND rt.active = TRUE
    ORDER BY rt.sort_order, rt.name
  `;

  return legacyRows.map((r, index) => ({
    courseId: `legacy-type-${index}`,
    courseTitle: String(r.course_title),
    instructionCode: null,
    assignedAt: new Date(String(r.assigned_at)).toISOString(),
  }));
}

/** Slug-Platzhalter aus effektiven Verantwortlichen je Hauptthema. */
export async function getCompanyResponsibilityPlaceholderValuesFromCourses(
  companyId: number
): Promise<Record<string, string>> {
  await ensureSeeded();
  const sql = getSql();
  const [courses, byCourse, byTopic, overrides, topicSlugRows] = await Promise.all([
    listCompanyCourses(companyId, "active"),
    loadResponsibleUsersByCourse(companyId),
    loadResponsibleUsersByTopic(companyId),
    loadCourseOverrideIds(companyId),
    sql`SELECT id, slug FROM course_topics`,
  ]);

  const slugByTopicId = new Map<number, string>(
    topicSlugRows.map((r) => [Number(r.id), String(r.slug).toLowerCase()])
  );

  const bySlug = new Map<string, string[]>();

  for (const course of courses) {
    const users = resolveEffectiveForCertificate(course, byCourse, byTopic, overrides);
    if (users.length === 0) continue;

    const names = users.map(formatPersonName).filter(Boolean);
    for (const topicId of getCourseTopicIds(course)) {
      const slug = slugByTopicId.get(topicId);
      if (!slug) continue;
      const list = bySlug.get(slug) ?? [];
      for (const name of names) {
        if (!list.includes(name)) list.push(name);
      }
      bySlug.set(slug, list);
    }
  }

  const map: Record<string, string> = {};
  for (const [slug, names] of bySlug) {
    const key = `responsible_person_${slug.replace(/-/g, "_")}`;
    map[key] = names.join(", ");
  }
  return map;
}

export { UNCategorized_TOPIC_LABEL };

export function adminAccessForResponsibilities(
  user: Parameters<typeof adminAccessFromSession>[0]
): AdminAccess | null {
  return adminAccessFromSession(user);
}

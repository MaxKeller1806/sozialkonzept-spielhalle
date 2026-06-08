import { getSql } from "./db";
import { formatValidityRuleLabel } from "./course-validity";
import { DUE_SOON_DAYS } from "./status";
import {
  buildListMeta,
  parseListQueryFromUrl,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import {
  computeNextDueAt,
  employeeMatchesTrainingFilter,
  formatValidUntil,
  parseEmploymentFilter,
  parseTrainingStatusFilter,
  projectedValidUntil,
  resolveCourseTrainingStatus,
  summarizeEmployeeCourses,
  validityRuleFromCourseRow,
  type CourseTrainingStatusKey,
  type EmployeeTrainingSummary,
  type EmploymentFilter,
  type TrainingStatusFilter,
} from "./training-status";

export const TRAINING_STATUS_SORT_ALLOWLIST = {
  lastName: "u.last_name",
  firstName: "u.first_name",
  email: "u.email",
  categoryName: "ec.name",
  joinedCompanyAt: "u.joined_company_at",
  createdAt: "u.created_at",
} as const;

export type EmployeeCourseTrainingRow = {
  courseId: string;
  courseTitle: string;
  instructionCode: string | null;
  validityLabel: string;
  assignedAt: string | null;
  statusKey: CourseTrainingStatusKey;
  statusLabel: string;
  statusColor: "gray" | "blue" | "green" | "yellow" | "red" | "darkred";
  completedAt: string | null;
  validUntil: string | null;
  validUntilLabel: string;
  nextDueAt: string | null;
  certificateId: number | null;
  certificateNumber: string | null;
  pdfUrl: string | null;
};

export type AdminTrainingStatusEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  employeeCategoryId: number | null;
  employeeCategoryName: string | null;
  joinedCompanyAt: string | null;
  active: boolean;
  summary: EmployeeTrainingSummary;
  courses: EmployeeCourseTrainingRow[];
};

export type TrainingStatusListQuery = ListQueryState & {
  trainingFilter: TrainingStatusFilter;
  employmentFilter: EmploymentFilter;
};

export function parseTrainingStatusListQuery(
  params: URLSearchParams
): TrainingStatusListQuery {
  return {
    ...parseListQueryFromUrl(params, {
      sortBy: "lastName",
      sortDirection: "asc",
      status: "active",
    }),
    trainingFilter: parseTrainingStatusFilter(params.get("trainingFilter")),
    employmentFilter: parseEmploymentFilter(params.get("employmentFilter")),
  };
}

type RawCourseRow = Record<string, unknown> & {
  user_id: number;
};

function mapCourseTrainingRow(
  row: RawCourseRow,
  joinedCompanyAt: string | null
): EmployeeCourseTrainingRow {
  const validityRule = validityRuleFromCourseRow(row);
  const certId = row.certificate_id != null ? Number(row.certificate_id) : null;
  const certRevoked = Boolean(row.cert_revoked);
  const inProgress = Boolean(row.in_progress);

  const latestCert =
    certId != null
      ? {
          id: certId,
          issuedAt: new Date(String(row.cert_issued_at)).toISOString(),
          validUntil: row.cert_valid_until
            ? new Date(String(row.cert_valid_until)).toISOString()
            : null,
          revoked: certRevoked,
          certificateNumber:
            row.certificate_number != null
              ? String(row.certificate_number)
              : null,
        }
      : null;

  const latestFailedAttemptAt = row.failed_completed_at
    ? new Date(String(row.failed_completed_at)).toISOString()
    : null;

  const status = resolveCourseTrainingStatus({
    inProgress,
    latestCert,
    latestFailedAttemptAt,
    validityRule,
    assignedAt: row.assigned_at
      ? new Date(String(row.assigned_at)).toISOString()
      : null,
    joinedCompanyAt,
  });

  const completedAt =
    latestCert && !certRevoked
      ? latestCert.issuedAt
      : latestFailedAttemptAt;

  const validUntil =
    latestCert && !certRevoked
      ? latestCert.validUntil
      : completedAt
        ? projectedValidUntil(completedAt, validityRule)
        : null;

  const nextDueAt = computeNextDueAt(
    status.key,
    validUntil,
    validityRule.validityType
  );

  return {
    courseId: String(row.course_id),
    courseTitle: String(row.course_title),
    instructionCode:
      row.instruction_code != null ? String(row.instruction_code) : null,
    validityLabel: formatValidityRuleLabel(validityRule),
    assignedAt: row.assigned_at
      ? new Date(String(row.assigned_at)).toISOString()
      : null,
    statusKey: status.key,
    statusLabel: status.label,
    statusColor: status.color,
    completedAt,
    validUntil,
    validUntilLabel: formatValidUntil(
      validUntil,
      validityRule.validityType
    ),
    nextDueAt,
    certificateId: certId && !certRevoked ? certId : null,
    certificateNumber:
      latestCert?.certificateNumber && !certRevoked
        ? latestCert.certificateNumber
        : null,
    pdfUrl:
      certId && !certRevoked ? `/api/certificates/${certId}/pdf` : null,
  };
}

async function fetchCourseRowsForUsers(
  companyId: number,
  userIds: number[],
  search: string,
  joinedAtByUser: Map<number, string | null>
): Promise<Map<number, EmployeeCourseTrainingRow[]>> {
  const result = new Map<number, EmployeeCourseTrainingRow[]>();
  if (userIds.length === 0) return result;

  const sql = getSql();
  const searchPattern = search.trim()
    ? `%${search.trim().toLowerCase()}%`
    : null;

  const courseSearchFilter = searchPattern
    ? sql`AND (
        LOWER(c.title) LIKE ${searchPattern}
        OR LOWER(COALESCE(c.instruction_code, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(c.instruction_title, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const rows = (await sql`
    SELECT
      uca.user_id,
      uca.assigned_at,
      c.id AS course_id,
      c.title AS course_title,
      c.instruction_code,
      c.validity_type,
      c.validity_interval_value,
      c.validity_interval_unit,
      c.validity_months,
      latest_cert.id AS certificate_id,
      latest_cert.certificate_number,
      latest_cert.issued_at AS cert_issued_at,
      latest_cert.valid_until AS cert_valid_until,
      latest_cert.revoked AS cert_revoked,
      failed_attempt.completed_at AS failed_completed_at,
      COALESCE(active_attempt.in_progress, FALSE) AS in_progress
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id AND c.company_id = ${companyId} AND c.active = TRUE
    JOIN users u ON u.id = uca.user_id AND u.company_id = ${companyId} AND u.id = uca.user_id
    LEFT JOIN LATERAL (
      SELECT cert.id, cert.certificate_number, cert.issued_at, cert.valid_until, cert.revoked
      FROM certificates cert
      WHERE cert.user_id = uca.user_id AND cert.course_id = c.id
      ORDER BY cert.issued_at DESC
      LIMIT 1
    ) latest_cert ON TRUE
    LEFT JOIN LATERAL (
      SELECT ta.completed_at
      FROM training_attempts ta
      WHERE ta.user_id = uca.user_id
        AND ta.course_id = c.id
        AND ta.completed_at IS NOT NULL
        AND ta.passed = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM certificates cert2
          WHERE cert2.user_id = ta.user_id
            AND cert2.course_id = ta.course_id
            AND cert2.revoked = FALSE
            AND cert2.issued_at >= ta.completed_at
        )
      ORDER BY ta.completed_at DESC
      LIMIT 1
    ) failed_attempt ON TRUE
    LEFT JOIN LATERAL (
      SELECT TRUE AS in_progress
      FROM training_attempts ta
      WHERE ta.user_id = uca.user_id
        AND ta.course_id = c.id
        AND ta.completed_at IS NULL
      LIMIT 1
    ) active_attempt ON TRUE
    WHERE uca.user_id IN ${sql(userIds)}
    ${courseSearchFilter}
    ORDER BY uca.user_id, c.main_category NULLS LAST, c.seminar NULLS LAST, c.sort_order, c.title
  `) as RawCourseRow[];

  for (const row of rows) {
    const userId = Number(row.user_id);
    const joinedCompanyAt = joinedAtByUser.get(userId) ?? null;
    const course = mapCourseTrainingRow(row, joinedCompanyAt);
    const list = result.get(userId) ?? [];
    list.push(course);
    result.set(userId, list);
  }

  return result;
}

function sortEmployees(
  employees: AdminTrainingStatusEmployee[],
  query: TrainingStatusListQuery
): AdminTrainingStatusEmployee[] {
  const dir = query.sortDirection === "desc" ? -1 : 1;

  if (query.sortBy === "expiredCount") {
    return [...employees].sort(
      (a, b) => (a.summary.expiredCount - b.summary.expiredCount) * dir
    );
  }
  if (query.sortBy === "dueSoonCount") {
    return [...employees].sort(
      (a, b) => (a.summary.dueSoonCount - b.summary.dueSoonCount) * dir
    );
  }
  if (query.sortBy === "nextDueAt") {
    return [...employees].sort((a, b) => {
      const av = a.summary.nextDueAt
        ? new Date(a.summary.nextDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bv = b.summary.nextDueAt
        ? new Date(b.summary.nextDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      return (av - bv) * dir;
    });
  }
  if (query.sortBy === "courseCount") {
    return [...employees].sort(
      (a, b) => (a.summary.courseCount - b.summary.courseCount) * dir
    );
  }

  return employees;
}

export async function buildAdminTrainingStatusEmployees(
  companyId: number,
  query: TrainingStatusListQuery
): Promise<AdminTrainingStatusEmployee[]> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND u.active = TRUE`
      : query.status === "archived"
        ? sql`AND u.active = FALSE`
        : sql``;

  const categoryFilter =
    query.categoryId != null
      ? sql`AND u.employee_category_id = ${query.categoryId}`
      : sql``;

  const employmentFilter =
    query.employmentFilter === "departed"
      ? sql`AND u.left_company_at IS NOT NULL AND u.left_company_at <= CURRENT_DATE`
      : query.employmentFilter === "all"
        ? sql``
        : sql`AND (u.left_company_at IS NULL OR u.left_company_at > CURRENT_DATE)`;

  const userSearchFilter = searchPattern
    ? sql`AND (
        LOWER(u.email) LIKE ${searchPattern}
        OR LOWER(u.first_name) LIKE ${searchPattern}
        OR LOWER(u.last_name) LIKE ${searchPattern}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE ${searchPattern}
        OR EXISTS (
          SELECT 1 FROM user_course_assignments uca2
          JOIN courses c2 ON c2.id = uca2.course_id AND c2.company_id = ${companyId}
          WHERE uca2.user_id = u.id
            AND (
              LOWER(c2.title) LIKE ${searchPattern}
              OR LOWER(COALESCE(c2.instruction_code, '')) LIKE ${searchPattern}
            )
        )
      )`
    : sql``;

  const userRows = (await sql`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.active,
      u.employee_category_id,
      u.joined_company_at,
      ec.name AS category_name
    FROM users u
    LEFT JOIN employee_categories ec ON ec.id = u.employee_category_id
    WHERE u.company_id = ${companyId}
      AND u.role = 'employee'
    ${activeFilter}
    ${employmentFilter}
    ${categoryFilter}
    ${userSearchFilter}
    ORDER BY u.last_name ASC, u.first_name ASC
  `) as Record<string, unknown>[];

  const allUserIds = userRows.map((r) => Number(r.id));
  const joinedAtByUser = new Map<number, string | null>();
  for (const row of userRows) {
    const userId = Number(row.id);
    joinedAtByUser.set(
      userId,
      row.joined_company_at
        ? new Date(String(row.joined_company_at)).toISOString().slice(0, 10)
        : null
    );
  }

  const courseMap = await fetchCourseRowsForUsers(
    companyId,
    allUserIds,
    query.search,
    joinedAtByUser
  );

  return userRows.map((row) => {
    const userId = Number(row.id);
    const joinedCompanyAt = joinedAtByUser.get(userId) ?? null;
    const courses = courseMap.get(userId) ?? [];

    const summary = summarizeEmployeeCourses(
      courses.map((c) => c.statusKey),
      courses.map((c) => c.nextDueAt ?? c.validUntil)
    );

    return {
      id: userId,
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      email: String(row.email),
      employeeCategoryId:
        row.employee_category_id != null
          ? Number(row.employee_category_id)
          : null,
      employeeCategoryName:
        row.category_name != null ? String(row.category_name) : null,
      joinedCompanyAt,
      active: Boolean(row.active),
      summary,
      courses,
    };
  });
}

export type AdminTrainingDashboardCounts = {
  expired: number;
  dueSoon: number;
  notStarted: number;
};

function isMissingColumnError(err: unknown, column: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes(column) &&
    (msg.includes("does not exist") || msg.includes("42703"))
  );
}

async function queryTrainingDashboardCounts(
  companyId: number,
  useLeftCompanyFilter: boolean
): Promise<AdminTrainingDashboardCounts> {
  const sql = getSql();
  const employmentFilter = useLeftCompanyFilter
    ? sql`AND (u.left_company_at IS NULL OR u.left_company_at > CURRENT_DATE)`
    : sql``;

  const rows = (await sql`
    WITH assignment_status AS (
      SELECT
        uca.user_id,
        CASE
          WHEN latest_cert.id IS NOT NULL AND NOT COALESCE(latest_cert.revoked, FALSE) THEN
            CASE
              WHEN latest_cert.valid_until IS NOT NULL AND latest_cert.valid_until < NOW()
                THEN 'expired'
              WHEN latest_cert.valid_until IS NOT NULL
                AND latest_cert.valid_until >= NOW()
                AND latest_cert.valid_until <= NOW() + make_interval(days => ${DUE_SOON_DAYS})
                THEN 'due_soon'
              ELSE NULL
            END
          WHEN COALESCE(active_attempt.in_progress, FALSE) THEN NULL
          WHEN failed_attempt.completed_at IS NOT NULL THEN NULL
          ELSE 'not_started'
        END AS status_key
      FROM user_course_assignments uca
      JOIN courses c ON c.id = uca.course_id AND c.company_id = ${companyId} AND c.active = TRUE
      JOIN users u ON u.id = uca.user_id AND u.company_id = ${companyId}
        AND u.role = 'employee'
        AND u.active = TRUE
        ${employmentFilter}
      LEFT JOIN LATERAL (
        SELECT cert.id, cert.valid_until, cert.revoked
        FROM certificates cert
        WHERE cert.user_id = uca.user_id AND cert.course_id = c.id
        ORDER BY cert.issued_at DESC
        LIMIT 1
      ) latest_cert ON TRUE
      LEFT JOIN LATERAL (
        SELECT ta.completed_at
        FROM training_attempts ta
        WHERE ta.user_id = uca.user_id
          AND ta.course_id = c.id
          AND ta.completed_at IS NOT NULL
          AND ta.passed = FALSE
          AND NOT EXISTS (
            SELECT 1 FROM certificates cert2
            WHERE cert2.user_id = ta.user_id
              AND cert2.course_id = ta.course_id
              AND cert2.revoked = FALSE
              AND cert2.issued_at >= ta.completed_at
          )
        ORDER BY ta.completed_at DESC
        LIMIT 1
      ) failed_attempt ON TRUE
      LEFT JOIN LATERAL (
        SELECT TRUE AS in_progress
        FROM training_attempts ta
        WHERE ta.user_id = uca.user_id
          AND ta.course_id = c.id
          AND ta.completed_at IS NULL
        LIMIT 1
      ) active_attempt ON TRUE
    )
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE status_key = 'expired')::int AS expired,
      COUNT(DISTINCT user_id) FILTER (WHERE status_key = 'due_soon')::int AS due_soon,
      COUNT(DISTINCT user_id) FILTER (WHERE status_key = 'not_started')::int AS not_started
    FROM assignment_status
    WHERE status_key IS NOT NULL
  `) as Record<string, unknown>[];

  const row = rows[0] ?? {};
  return {
    expired: Number(row.expired ?? 0),
    dueSoon: Number(row.due_soon ?? 0),
    notStarted: Number(row.not_started ?? 0),
  };
}

export async function getAdminTrainingDashboardCounts(
  companyId: number
): Promise<AdminTrainingDashboardCounts> {
  try {
    return await queryTrainingDashboardCounts(companyId, true);
  } catch (err) {
    if (!isMissingColumnError(err, "left_company_at")) throw err;
    return queryTrainingDashboardCounts(companyId, false);
  }
}

export async function listAdminTrainingStatus(
  companyId: number,
  query: TrainingStatusListQuery
): Promise<{ employees: AdminTrainingStatusEmployee[]; meta: ListMeta }> {
  let employees = await buildAdminTrainingStatusEmployees(companyId, query);

  if (query.trainingFilter !== "all") {
    employees = employees.filter((e) =>
      employeeMatchesTrainingFilter(
        e.courses.map((c) => c.statusKey),
        query.trainingFilter
      )
    );
  }

  employees = sortEmployees(employees, query);

  const total = employees.length;
  const paged = employees.slice(query.offset, query.offset + query.pageSize);

  return {
    employees: paged,
    meta: buildListMeta(query, total),
  };
}

export async function getAdminEmployeeTrainingCourses(
  companyId: number,
  userId: number
): Promise<EmployeeCourseTrainingRow[] | null> {
  const sql = getSql();
  const userRows = await sql`
    SELECT id, joined_company_at FROM users
    WHERE id = ${userId} AND company_id = ${companyId} AND role = 'employee'
    LIMIT 1
  `;
  if (userRows.length === 0) return null;

  const joinedCompanyAt = userRows[0].joined_company_at
    ? new Date(String(userRows[0].joined_company_at)).toISOString().slice(0, 10)
    : null;

  const courseMap = await fetchCourseRowsForUsers(
    companyId,
    [userId],
    "",
    new Map([[userId, joinedCompanyAt]])
  );
  return courseMap.get(userId) ?? [];
}

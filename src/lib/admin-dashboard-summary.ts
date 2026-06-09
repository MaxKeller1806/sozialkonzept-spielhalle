import { getSql } from "./db";
import { DUE_SOON_DAYS } from "./status";
import { sqlUserAssignedToLocationFilter } from "./user-locations";
import type { AdminTrainingDashboardCounts } from "./admin-training-status-list";

export type AdminDashboardSummary = {
  companyId: number;
  companyName: string;
  activeEmployees: number;
  locationId: number | null;
  privacy: {
    open: number;
    accepted: number;
  };
  training: AdminTrainingDashboardCounts;
};

function isMissingColumnError(err: unknown, column: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes(column) &&
    (msg.includes("does not exist") || msg.includes("42703"))
  );
}

/** Ein DB-Roundtrip für alle Dashboard-Kennzahlen (Serverless/Pooler-tauglich). */
async function queryDashboardSummary(
  companyId: number,
  useLeftCompanyFilter: boolean,
  locationId: number | null
): Promise<AdminDashboardSummary> {
  const sql = getSql();
  const employmentFilter = useLeftCompanyFilter
    ? sql`AND (u.left_company_at IS NULL OR u.left_company_at > CURRENT_DATE)`
    : sql``;
  const locationFilter = sqlUserAssignedToLocationFilter(sql, locationId);

  const rows = (await sql`
    WITH active_policy AS (
      SELECT id
      FROM privacy_policy_versions
      WHERE active = TRUE
      ORDER BY effective_from DESC, id DESC
      LIMIT 1
    ),
    company_row AS (
      SELECT name FROM companies WHERE id = ${companyId}
    ),
    active_employee_count AS (
      SELECT COUNT(*)::int AS total
      FROM users u
      WHERE u.company_id = ${companyId}
        AND u.role = 'employee'
        AND u.active = TRUE
        ${locationFilter}
    ),
    privacy_counts AS (
      SELECT
        COUNT(*) FILTER (WHERE p.accepted_at IS NOT NULL)::int AS accepted,
        COUNT(*) FILTER (WHERE p.accepted_at IS NULL)::int AS open
      FROM users u
      LEFT JOIN privacy_policy_acceptances p
        ON p.user_id = u.id
        AND p.version_id = (SELECT id FROM active_policy)
      WHERE u.company_id = ${companyId}
        AND u.role = 'employee'
        AND u.active = TRUE
        ${employmentFilter}
        ${locationFilter}
    ),
    company_assignments AS (
      SELECT uca.user_id, uca.course_id
      FROM user_course_assignments uca
      JOIN courses c ON c.id = uca.course_id AND c.company_id = ${companyId} AND c.active = TRUE
      JOIN users u ON u.id = uca.user_id AND u.company_id = ${companyId}
        AND u.role = 'employee'
        AND u.active = TRUE
        ${employmentFilter}
        ${locationFilter}
    ),
    latest_certs AS (
      SELECT DISTINCT ON (cert.user_id, cert.course_id)
        cert.user_id,
        cert.course_id,
        cert.id,
        cert.valid_until,
        cert.revoked
      FROM certificates cert
      INNER JOIN company_assignments ca
        ON ca.user_id = cert.user_id AND ca.course_id = cert.course_id
      ORDER BY cert.user_id, cert.course_id, cert.issued_at DESC
    ),
    failed_attempts AS (
      SELECT DISTINCT ON (ta.user_id, ta.course_id)
        ta.user_id,
        ta.course_id,
        ta.completed_at
      FROM training_attempts ta
      INNER JOIN company_assignments ca
        ON ca.user_id = ta.user_id AND ca.course_id = ta.course_id
      WHERE ta.completed_at IS NOT NULL
        AND ta.passed = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM certificates cert2
          WHERE cert2.user_id = ta.user_id
            AND cert2.course_id = ta.course_id
            AND cert2.revoked = FALSE
            AND cert2.issued_at >= ta.completed_at
        )
      ORDER BY ta.user_id, ta.course_id, ta.completed_at DESC
    ),
    active_attempts AS (
      SELECT DISTINCT ta.user_id, ta.course_id
      FROM training_attempts ta
      INNER JOIN company_assignments ca
        ON ca.user_id = ta.user_id AND ca.course_id = ta.course_id
      WHERE ta.completed_at IS NULL
    ),
    assignment_status AS (
      SELECT
        ca.user_id,
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
          WHEN active_attempt.user_id IS NOT NULL THEN NULL
          WHEN failed_attempts.completed_at IS NOT NULL THEN NULL
          ELSE 'not_started'
        END AS status_key
      FROM company_assignments ca
      LEFT JOIN latest_certs latest_cert
        ON latest_cert.user_id = ca.user_id AND latest_cert.course_id = ca.course_id
      LEFT JOIN failed_attempts
        ON failed_attempts.user_id = ca.user_id AND failed_attempts.course_id = ca.course_id
      LEFT JOIN active_attempts active_attempt
        ON active_attempt.user_id = ca.user_id AND active_attempt.course_id = ca.course_id
    ),
    training_counts AS (
      SELECT
        COUNT(DISTINCT user_id) FILTER (WHERE status_key = 'expired')::int AS expired,
        COUNT(DISTINCT user_id) FILTER (WHERE status_key = 'due_soon')::int AS due_soon,
        COUNT(DISTINCT user_id) FILTER (WHERE status_key = 'not_started')::int AS not_started
      FROM assignment_status
      WHERE status_key IS NOT NULL
    )
    SELECT
      cr.name AS company_name,
      aec.total AS active_employees,
      pc.open AS privacy_open,
      pc.accepted AS privacy_accepted,
      tc.expired,
      tc.due_soon,
      tc.not_started
    FROM company_row cr
    CROSS JOIN active_employee_count aec
    CROSS JOIN privacy_counts pc
    CROSS JOIN training_counts tc
  `) as Record<string, unknown>[];

  const row = rows[0] ?? {};
  return {
    companyId,
    companyName: row.company_name != null ? String(row.company_name) : "",
    activeEmployees: Number(row.active_employees ?? 0),
    locationId,
    privacy: {
      open: Number(row.privacy_open ?? 0),
      accepted: Number(row.privacy_accepted ?? 0),
    },
    training: {
      expired: Number(row.expired ?? 0),
      dueSoon: Number(row.due_soon ?? 0),
      notStarted: Number(row.not_started ?? 0),
    },
  };
}

export async function getAdminDashboardSummary(
  companyId: number,
  locationId: number | null = null
): Promise<AdminDashboardSummary> {
  try {
    return await queryDashboardSummary(companyId, true, locationId);
  } catch (err) {
    if (!isMissingColumnError(err, "left_company_at")) throw err;
    return queryDashboardSummary(companyId, false, locationId);
  }
}

import { getSql } from "./db";
import { getTenantCompanyByCode, normalizeCompanyCode } from "./tenant-resolve";
import { resetUserPassword } from "./user-password-reset";

export type PasswordResetRequestStatus = "open" | "completed" | "dismissed";

export interface PasswordResetRequest {
  id: number;
  companyId: number;
  userId: number | null;
  email: string;
  companyCode: string;
  status: PasswordResetRequestStatus;
  requestedAt: string;
  handledAt: string | null;
  handledByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordResetRequestListItem extends PasswordResetRequest {
  firstName: string | null;
  lastName: string | null;
}

const PUBLIC_SUCCESS_MESSAGE =
  "Falls die Angaben korrekt sind, wurde die Anfrage an Ihren Administrator übermittelt.";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapRequest(row: Record<string, unknown>): PasswordResetRequest {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    userId: row.user_id != null ? Number(row.user_id) : null,
    email: String(row.email),
    companyCode: String(row.company_code),
    status: row.status as PasswordResetRequestStatus,
    requestedAt: new Date(String(row.requested_at)).toISOString(),
    handledAt: row.handled_at
      ? new Date(String(row.handled_at)).toISOString()
      : null,
    handledByUserId:
      row.handled_by_user_id != null ? Number(row.handled_by_user_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapListItem(row: Record<string, unknown>): PasswordResetRequestListItem {
  return {
    ...mapRequest(row),
    firstName: row.first_name != null ? String(row.first_name) : null,
    lastName: row.last_name != null ? String(row.last_name) : null,
  };
}

async function countRecentAttempts(email: string): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM password_reset_requests
    WHERE LOWER(email) = ${email}
      AND requested_at > NOW() - INTERVAL '1 hour'
  `;
  return Number(rows[0]?.c ?? 0);
}

async function recordRateLimitAttempt(
  companyId: number,
  companyCode: string,
  email: string
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO password_reset_requests (
      company_id, user_id, email, company_code, status, requested_at, updated_at
    ) VALUES (
      ${companyId}, NULL, ${email}, ${companyCode}, 'dismissed', NOW(), NOW()
    )
  `;
}

export async function createOrRefreshPasswordResetRequest(input: {
  companyCode: string;
  email: string;
}): Promise<{ message: string }> {
  const companyCode = normalizeCompanyCode(input.companyCode);
  const email = normalizeEmail(input.email);

  if (!companyCode || !email) {
    return { message: PUBLIC_SUCCESS_MESSAGE };
  }

  const recentAttempts = await countRecentAttempts(email);
  if (recentAttempts >= RATE_LIMIT_MAX) {
    return { message: PUBLIC_SUCCESS_MESSAGE };
  }

  const company = await getTenantCompanyByCode(companyCode);
  if (!company) {
    return { message: PUBLIC_SUCCESS_MESSAGE };
  }

  const sql = getSql();
  const userRows = await sql`
    SELECT id FROM users
    WHERE company_id = ${company.id}
      AND LOWER(email) = ${email}
      AND active = TRUE
    LIMIT 1
  `;

  if (userRows.length === 0) {
    await recordRateLimitAttempt(company.id, companyCode, email);
    return { message: PUBLIC_SUCCESS_MESSAGE };
  }

  const userId = Number(userRows[0].id);

  const existing = await sql`
    SELECT id FROM password_reset_requests
    WHERE company_id = ${company.id}
      AND status = 'open'
      AND (user_id = ${userId} OR LOWER(email) = ${email})
    LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE password_reset_requests SET
        requested_at = NOW(),
        updated_at = NOW(),
        email = ${email},
        company_code = ${companyCode},
        user_id = ${userId}
      WHERE id = ${Number(existing[0].id)}
    `;
  } else {
    await sql`
      INSERT INTO password_reset_requests (
        company_id, user_id, email, company_code, status, requested_at, updated_at
      ) VALUES (
        ${company.id}, ${userId}, ${email}, ${companyCode}, 'open', NOW(), NOW()
      )
    `;
  }

  return { message: PUBLIC_SUCCESS_MESSAGE };
}

export async function countOpenPasswordResetRequests(
  companyId: number
): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM password_reset_requests
    WHERE company_id = ${companyId} AND status = 'open'
  `;
  return Number(rows[0]?.c ?? 0);
}

export async function listOpenPasswordResetRequests(
  companyId: number
): Promise<PasswordResetRequestListItem[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      pr.*,
      u.first_name,
      u.last_name
    FROM password_reset_requests pr
    LEFT JOIN users u ON u.id = pr.user_id
    WHERE pr.company_id = ${companyId} AND pr.status = 'open'
    ORDER BY pr.requested_at DESC
  `;
  return rows.map((row) =>
    mapListItem(row as Record<string, unknown>)
  );
}

async function getOpenRequestForCompany(
  requestId: number,
  companyId: number
): Promise<PasswordResetRequest | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM password_reset_requests
    WHERE id = ${requestId}
      AND company_id = ${companyId}
      AND status = 'open'
    LIMIT 1
  `;
  return rows[0]
    ? mapRequest(rows[0] as Record<string, unknown>)
    : null;
}

export async function completePasswordResetRequest(
  requestId: number,
  adminUserId: number,
  companyId: number
): Promise<{ email: string; initialPassword: string }> {
  const request = await getOpenRequestForCompany(requestId, companyId);
  if (!request?.userId) {
    throw new Error("NOT_FOUND");
  }

  const result = await resetUserPassword(request.userId, companyId);

  const sql = getSql();
  await sql`
    UPDATE password_reset_requests SET
      status = 'completed',
      handled_at = NOW(),
      handled_by_user_id = ${adminUserId},
      updated_at = NOW()
    WHERE id = ${requestId}
  `;

  return result;
}

export async function dismissPasswordResetRequest(
  requestId: number,
  adminUserId: number,
  companyId: number
): Promise<void> {
  const request = await getOpenRequestForCompany(requestId, companyId);
  if (!request) {
    throw new Error("NOT_FOUND");
  }

  const sql = getSql();
  await sql`
    UPDATE password_reset_requests SET
      status = 'dismissed',
      handled_at = NOW(),
      handled_by_user_id = ${adminUserId},
      updated_at = NOW()
    WHERE id = ${requestId}
  `;
}

export { PUBLIC_SUCCESS_MESSAGE, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS };

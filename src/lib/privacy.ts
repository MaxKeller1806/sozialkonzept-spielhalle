import { ensureSeeded, getSql } from "./db";
import type { PrivacyPolicyVersion } from "./types";

function mapVersion(row: Record<string, unknown>): PrivacyPolicyVersion {
  return {
    id: Number(row.id),
    version: String(row.version),
    title: String(row.title),
    content: String(row.content),
    effectiveFrom: new Date(String(row.effective_from)).toISOString(),
    active: Boolean(row.active),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getActivePrivacyPolicy(): Promise<PrivacyPolicyVersion | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM privacy_policy_versions
    WHERE active = TRUE
    ORDER BY effective_from DESC, id DESC
    LIMIT 1
  `;
  return rows[0] ? mapVersion(rows[0] as Record<string, unknown>) : undefined;
}

export async function hasAcceptedCurrentPolicy(userId: number): Promise<boolean> {
  const policy = await getActivePrivacyPolicy();
  if (!policy) return true;

  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM privacy_policy_acceptances
    WHERE user_id = ${userId} AND version_id = ${policy.id}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function recordPrivacyAcceptance(
  userId: number,
  companyId: number,
  versionId: number,
  meta: { ipAddress?: string | null; userAgent?: string | null }
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();
  await sql`
    INSERT INTO privacy_policy_acceptances (
      user_id, company_id, version_id, ip_address, user_agent
    )
    VALUES (
      ${userId}, ${companyId}, ${versionId},
      ${meta.ipAddress ?? null}, ${meta.userAgent ?? null}
    )
    ON CONFLICT DO NOTHING
  `;
}

export async function getUserPrivacyStatus(userId: number): Promise<{
  accepted: boolean;
  currentVersion: string | null;
  acceptedAt: string | null;
}> {
  const policy = await getActivePrivacyPolicy();
  if (!policy) {
    return { accepted: true, currentVersion: null, acceptedAt: null };
  }

  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT accepted_at FROM privacy_policy_acceptances
    WHERE user_id = ${userId} AND version_id = ${policy.id}
    LIMIT 1
  `;

  return {
    accepted: rows.length > 0,
    currentVersion: policy.version,
    acceptedAt: rows[0]
      ? new Date(String(rows[0].accepted_at)).toISOString()
      : null,
  };
}

export async function getCompanyPrivacyStats(companyId: number): Promise<{
  totalEmployees: number;
  acceptedCurrent: number;
  currentVersion: string | null;
}> {
  const policy = await getActivePrivacyPolicy();
  await ensureSeeded();
  const sql = getSql();

  const totalRows = await sql`
    SELECT COUNT(*)::int AS cnt FROM users
    WHERE company_id = ${companyId} AND role = 'employee' AND active = TRUE
  `;
  const totalEmployees = Number(totalRows[0]?.cnt ?? 0);

  if (!policy) {
    return { totalEmployees, acceptedCurrent: totalEmployees, currentVersion: null };
  }

  const acceptedRows = await sql`
    SELECT COUNT(DISTINCT p.user_id)::int AS cnt
    FROM privacy_policy_acceptances p
    JOIN users u ON u.id = p.user_id
    WHERE u.company_id = ${companyId}
      AND u.role = 'employee'
      AND u.active = TRUE
      AND p.version_id = ${policy.id}
  `;

  return {
    totalEmployees,
    acceptedCurrent: Number(acceptedRows[0]?.cnt ?? 0),
    currentVersion: policy.version,
  };
}

import { getSql } from "./db";
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

const DEFAULT_PRIVACY_CONTENT =
  "Datenschutzerklärung\n\n" +
  "Wir verarbeiten personenbezogene Daten ausschließlich zum Zweck der Durchführung und Dokumentation der internen Schulungen.\n\n" +
  "Verantwortlich ist Ihr Arbeitgeber bzw. die jeweilige Spielhallen-Firma, die diese Plattform nutzt.\n\n" +
  "Erhobene Daten umfassen insbesondere Name, E-Mail, Geburtsdatum, Fortschritt in Schulungen, Prüfungsergebnisse und ausgestellte Zertifikate.\n\n" +
  "Die Daten werden nur so lange gespeichert, wie es für Schulungsnachweis und gesetzliche Aufbewahrungspflichten erforderlich ist.\n\n" +
  "Sie haben das Recht auf Auskunft, Berichtigung und Löschung im Rahmen der gesetzlichen Vorgaben.\n\n" +
  "Mit Bestätigung erklären Sie, dass Sie diese Datenschutzerklärung gelesen und verstanden haben.";

export async function getActivePrivacyPolicy(): Promise<PrivacyPolicyVersion | undefined> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT * FROM privacy_policy_versions
      WHERE active = TRUE
      ORDER BY effective_from DESC, id DESC
      LIMIT 1
    `;
    if (rows[0]) {
      return mapVersion(rows[0] as Record<string, unknown>);
    }

    console.log("[privacy] keine aktive Policy – erstelle Standardversion");
    const inserted = await sql`
      INSERT INTO privacy_policy_versions (version, title, content, active)
      VALUES (
        '1.0',
        'Datenschutzerklärung',
        ${DEFAULT_PRIVACY_CONTENT},
        TRUE
      )
      ON CONFLICT (version) DO UPDATE SET active = TRUE
      RETURNING *
    `;
    return inserted[0]
      ? mapVersion(inserted[0] as Record<string, unknown>)
      : undefined;
  } catch (err) {
    console.error("[privacy] getActivePrivacyPolicy Fehler:", err);
    return undefined;
  }
}

export async function hasAcceptedCurrentPolicy(userId: number): Promise<boolean> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT p.id
      FROM privacy_policy_acceptances p
      JOIN privacy_policy_versions v ON v.id = p.version_id AND v.active = TRUE
      WHERE p.user_id = ${userId}
      LIMIT 1
    `;
    if (rows.length > 0) return true;

    const policyRows = await sql`
      SELECT id FROM privacy_policy_versions WHERE active = TRUE LIMIT 1
    `;
    return policyRows.length === 0;
  } catch (err) {
    console.error("[privacy] hasAcceptedCurrentPolicy Fehler:", err);
    return false;
  }
}

export async function recordPrivacyAcceptance(
  userId: number,
  companyId: number,
  versionId: number,
  meta: { ipAddress?: string | null; userAgent?: string | null }
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO privacy_policy_acceptances (
      user_id, company_id, version_id, ip_address, user_agent
    )
    VALUES (
      ${userId}, ${companyId}, ${versionId},
      ${meta.ipAddress ?? null}, ${meta.userAgent ?? null}
    )
    ON CONFLICT (user_id, version_id) DO UPDATE SET
      accepted_at = NOW(),
      company_id = EXCLUDED.company_id,
      ip_address = COALESCE(EXCLUDED.ip_address, privacy_policy_acceptances.ip_address),
      user_agent = COALESCE(EXCLUDED.user_agent, privacy_policy_acceptances.user_agent)
    RETURNING id
  `;
  return rows.length > 0;
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

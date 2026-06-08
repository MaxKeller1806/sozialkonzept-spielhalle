import { getSql } from "./db";
import type { PrivacyPolicyVersion } from "./types";

const ACTIVE_POLICY_CACHE_MS = 60_000;
const ACCEPTANCE_RESULT_CACHE_MS = 5_000;

let activePolicyCache:
  | { policy: PrivacyPolicyVersion | undefined; expiresAt: number }
  | undefined;
let activePolicyInFlight: Promise<PrivacyPolicyVersion | undefined> | undefined;

const acceptanceResultCache = new Map<
  number,
  { accepted: boolean; expiresAt: number }
>();
const acceptanceInFlight = new Map<number, Promise<boolean>>();

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
  const now = Date.now();
  if (activePolicyCache && activePolicyCache.expiresAt > now) {
    return activePolicyCache.policy;
  }

  if (activePolicyInFlight) {
    return activePolicyInFlight;
  }

  activePolicyInFlight = loadActivePrivacyPolicy()
    .then((policy) => {
      activePolicyCache = {
        policy,
        expiresAt: Date.now() + ACTIVE_POLICY_CACHE_MS,
      };
      return policy;
    })
    .finally(() => {
      activePolicyInFlight = undefined;
    });

  return activePolicyInFlight;
}

async function loadActivePrivacyPolicy(): Promise<PrivacyPolicyVersion | undefined> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT id, version, title, content, effective_from, active, created_at
      FROM privacy_policy_versions
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
      RETURNING id, version, title, content, effective_from, active, created_at
    `;
    activePolicyCache = undefined;
    return inserted[0]
      ? mapVersion(inserted[0] as Record<string, unknown>)
      : undefined;
  } catch (err) {
    console.error("[privacy] getActivePrivacyPolicy Fehler:", err);
    return undefined;
  }
}

function invalidateAcceptanceCache(userId: number): void {
  acceptanceResultCache.delete(userId);
}

/** Bei DB-Fehler true: kein fälschlicher Redirect zu /datenschutz/bestaetigen. */
async function queryCurrentPolicyAcceptance(userId: number): Promise<boolean> {
  const policy = await getActivePrivacyPolicy();
  if (!policy) return true;

  const sql = getSql();
  const rows = await sql`
    SELECT 1 AS ok
    FROM privacy_policy_acceptances
    WHERE user_id = ${userId}
      AND version_id = ${policy.id}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function hasAcceptedCurrentPolicy(userId: number): Promise<boolean> {
  const now = Date.now();
  const cached = acceptanceResultCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.accepted;
  }

  const inFlight = acceptanceInFlight.get(userId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const accepted = await queryCurrentPolicyAcceptance(userId);
      acceptanceResultCache.set(userId, {
        accepted,
        expiresAt: Date.now() + ACCEPTANCE_RESULT_CACHE_MS,
      });
      return accepted;
    } catch (err) {
      console.error(
        "[privacy] hasAcceptedCurrentPolicy Fehler – kein Redirect erzwungen:",
        err
      );
      return true;
    }
  })().finally(() => {
    acceptanceInFlight.delete(userId);
  });

  acceptanceInFlight.set(userId, promise);
  return promise;
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
  if (rows.length > 0) {
    invalidateAcceptanceCache(userId);
  }
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
    SELECT COUNT(*)::int AS cnt FROM users u
    WHERE u.company_id = ${companyId}
      AND u.role = 'employee'
      AND u.active = TRUE
      AND (u.left_company_at IS NULL OR u.left_company_at > CURRENT_DATE)
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
      AND (u.left_company_at IS NULL OR u.left_company_at > CURRENT_DATE)
      AND p.version_id = ${policy.id}
  `;

  return {
    totalEmployees,
    acceptedCurrent: Number(acceptedRows[0]?.cnt ?? 0),
    currentVersion: policy.version,
  };
}

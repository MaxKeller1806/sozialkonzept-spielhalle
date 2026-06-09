import { OPERATOR_COMPANY_SLUG } from "./branding-theme";
import { getSql } from "./db";
import { getCompanyById } from "./tenant";

export class CompanyDeleteProtectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyDeleteProtectedError";
  }
}

/**
 * Löscht eine Firma und alle firmengebundenen Daten (Testphase).
 * Globale Stammdaten (master_courses, industries, …) bleiben unberührt.
 */
export async function permanentlyDeleteCompany(companyId: number): Promise<void> {
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("NOT_FOUND");
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    throw new Error("NOT_FOUND");
  }
  if (company.slug === OPERATOR_COMPANY_SLUG) {
    throw new CompanyDeleteProtectedError(
      "Die Betreiber-Firma kann nicht gelöscht werden."
    );
  }

  const sql = getSql();

  await sql.begin(async (tx) => {
    const owned = await tx`
      SELECT id FROM companies WHERE id = ${companyId} LIMIT 1
    `;
    if (owned.length === 0) {
      throw new Error("NOT_FOUND");
    }

    // Kein ON DELETE CASCADE auf company_id – vor Firmenlöschung bereinigen
    await tx`DELETE FROM certificate_counters WHERE company_id = ${companyId}`;
    await tx`DELETE FROM training_attempts WHERE company_id = ${companyId}`;
    await tx`DELETE FROM certificates WHERE company_id = ${companyId}`;
    await tx`DELETE FROM feedback WHERE company_id = ${companyId}`;

    const deleted = await tx`
      DELETE FROM companies WHERE id = ${companyId} RETURNING id
    `;
    if (deleted.length === 0) {
      throw new Error("NOT_FOUND");
    }
  });
}

export async function listCompaniesForDeleteConfirm(): Promise<
  Array<{ id: number; name: string }>
> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, name FROM companies
    WHERE slug != ${OPERATOR_COMPANY_SLUG}
    ORDER BY name ASC
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
  }));
}

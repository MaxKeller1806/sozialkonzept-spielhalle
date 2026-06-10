import { OPERATOR_COMPANY_SLUG } from "@/lib/branding-theme";
import { getSql } from "@/lib/db";
import { invalidateOperatorBrandingCache } from "@/lib/operator-branding";
import { getCompanyById } from "@/lib/tenant";
import { BrandingUploadError } from "@/lib/branding-upload";

export async function resolveBrandingLogoTarget(
  companyIdRaw: FormDataEntryValue | null
): Promise<{ scope: string; companyId: number | null }> {
  if (typeof companyIdRaw !== "string" || !companyIdRaw.trim()) {
    return { scope: "operator", companyId: null };
  }

  const companyId = Number(companyIdRaw.trim());
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new BrandingUploadError("Ungültige Firmen-ID.", "INVALID_COMPANY_ID");
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    throw new BrandingUploadError("Firma nicht gefunden.", "COMPANY_NOT_FOUND", 404);
  }

  if (company.slug === OPERATOR_COMPANY_SLUG) {
    throw new BrandingUploadError(
      "Certiano-Branding bitte unter Plattform-Einstellungen bearbeiten.",
      "OPERATOR_COMPANY",
      400
    );
  }

  return { scope: `company-${companyId}`, companyId };
}

export async function persistBrandingLogoUrl(
  logoUrl: string,
  target: { scope: string; companyId: number | null }
): Promise<void> {
  const sql = getSql();

  if (target.scope === "operator") {
    await sql`
      UPDATE companies
      SET logo_url = ${logoUrl}
      WHERE slug = ${OPERATOR_COMPANY_SLUG}
    `;
    invalidateOperatorBrandingCache();
    return;
  }

  if (target.companyId == null) {
    throw new BrandingUploadError(
      "Logo konnte nicht gespeichert werden.",
      "PERSIST_FAILED",
      500
    );
  }

  const result = await sql`
    UPDATE companies
    SET logo_url = ${logoUrl}
    WHERE id = ${target.companyId}
    RETURNING id
  `;

  if (result.length === 0) {
    throw new BrandingUploadError("Firma nicht gefunden.", "COMPANY_NOT_FOUND", 404);
  }
}

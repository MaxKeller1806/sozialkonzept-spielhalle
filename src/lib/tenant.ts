import { getSql } from "./db";
import type { Company, CompanyBranding, PrivacyPolicyVersion, SessionUser } from "./types";

export function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    street: row.street != null ? String(row.street) : null,
    postalCode: row.postal_code != null ? String(row.postal_code) : null,
    city: row.city != null ? String(row.city) : null,
    country: row.country != null ? String(row.country) : null,
    email: row.email != null ? String(row.email) : null,
    phone: row.phone != null ? String(row.phone) : null,
    website: row.website != null ? String(row.website) : null,
    branding: {
      primaryColor: String(row.primary_color ?? "#000080"),
      secondaryColor: String(row.secondary_color ?? "#4040a0"),
      backgroundColor: String(row.background_color ?? "#f8fafc"),
      accentColor: String(row.accent_color ?? "#2563eb"),
      logoUrl: row.logo_url != null ? String(row.logo_url) : null,
      loginBackgroundUrl:
        row.login_background_url != null ? String(row.login_background_url) : null,
    },
    status: row.status as Company["status"],
    licenseStatus: row.license_status as Company["licenseStatus"],
    licenseExpiresAt: row.license_expires_at
      ? new Date(String(row.license_expires_at)).toISOString()
      : null,
    licenseActivatedAt: row.license_activated_at
      ? new Date(String(row.license_activated_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getCompanyById(id: number): Promise<Company | undefined> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM companies WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapCompany(rows[0] as Record<string, unknown>) : undefined;
}

export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM companies WHERE slug = ${slug} LIMIT 1`;
  return rows[0] ? mapCompany(rows[0] as Record<string, unknown>) : undefined;
}

export function requireCompanyId(user: SessionUser): number {
  if (user.role === "superuser" || !user.companyId) {
    throw new Error("FORBIDDEN");
  }
  return user.companyId;
}

export async function assertCompanyAccess(
  user: SessionUser,
  companyId: number
): Promise<void> {
  if (user.role === "superuser") return;
  if (user.companyId !== companyId) {
    throw new Error("FORBIDDEN");
  }
}

export function brandingToCssVars(branding: CompanyBranding): Record<string, string> {
  return {
    "--brand-primary": branding.primaryColor,
    "--brand-secondary": branding.secondaryColor,
    "--brand-bg": branding.backgroundColor,
    "--brand-accent": branding.accentColor,
  };
}

export async function getCompanySummaries(): Promise<
  Array<{
    id: number;
    name: string;
    status: string;
    licenseStatus: string;
    licenseExpiresAt: string | null;
    createdAt: string;
    employeeCount: number;
    adminCount: number;
    adminName: string | null;
  }>
> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      c.id,
      c.name,
      c.status,
      c.license_status,
      c.license_expires_at,
      c.created_at,
      COUNT(*) FILTER (WHERE u.role = 'employee')::int AS employee_count,
      COUNT(*) FILTER (WHERE u.role = 'admin')::int AS admin_count,
      (
        SELECT CONCAT(a.first_name, ' ', a.last_name)
        FROM users a
        WHERE a.company_id = c.id AND a.role = 'admin' AND a.active = TRUE
        ORDER BY a.id ASC
        LIMIT 1
      ) AS admin_name
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id AND u.role IN ('admin', 'employee')
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    status: String(row.status),
    licenseStatus: String(row.license_status),
    licenseExpiresAt: row.license_expires_at
      ? new Date(String(row.license_expires_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    employeeCount: Number(row.employee_count ?? 0),
    adminCount: Number(row.admin_count ?? 0),
    adminName: row.admin_name != null ? String(row.admin_name) : null,
  }));
}

export async function deleteCompanyUser(userId: number, companyId: number): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM users
    WHERE id = ${userId} AND company_id = ${companyId} AND role != 'superuser'
    RETURNING id
  `;
  return rows.length > 0;
}

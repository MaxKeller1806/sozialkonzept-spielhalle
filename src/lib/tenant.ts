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
    adminContacts: Array<{ name: string; email: string }>;
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
      COUNT(*) FILTER (WHERE u.role = 'admin')::int AS admin_count
    FROM companies c
    LEFT JOIN users u ON u.company_id = c.id AND u.role IN ('admin', 'employee')
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const summaries = [];
  for (const row of rows) {
    const companyId = Number(row.id);
    const adminRows = await sql`
      SELECT first_name, last_name, email
      FROM users
      WHERE company_id = ${companyId} AND role = 'admin' AND active = TRUE
      ORDER BY id ASC
    `;
    summaries.push({
      id: companyId,
      name: String(row.name),
      status: String(row.status),
      licenseStatus: String(row.license_status),
      licenseExpiresAt: row.license_expires_at
        ? new Date(String(row.license_expires_at)).toISOString()
        : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      employeeCount: Number(row.employee_count ?? 0),
      adminCount: Number(row.admin_count ?? 0),
      adminContacts: adminRows.map((a) => ({
        name: `${String(a.first_name)} ${String(a.last_name)}`.trim(),
        email: String(a.email),
      })),
    });
  }
  return summaries;
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

export type UserListFilter = "active" | "archived" | "all";

export async function listCompanyUsersMinimal(
  companyId: number,
  filter: UserListFilter = "all"
): Promise<
  Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    active: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  }>
> {
  if (!Number.isFinite(companyId) || companyId <= 0) {
    return [];
  }
  const sql = getSql();
  let rows: Record<string, unknown>[];
  const activeFilter =
    filter === "active"
      ? sql`AND u.active = TRUE`
      : filter === "archived"
        ? sql`AND u.active = FALSE`
        : sql``;

  try {
    rows = (await sql`
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.role, u.active, u.created_at, u.last_login_at
      FROM users u
      WHERE u.company_id = ${companyId} AND u.role IN ('admin', 'employee')
      ${activeFilter}
      ORDER BY u.active DESC, u.role ASC, u.last_name ASC, u.first_name ASC
    `) as Record<string, unknown>[];
  } catch {
    rows = (await sql`
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.role, u.active, u.created_at
      FROM users u
      WHERE u.company_id = ${companyId} AND u.role IN ('admin', 'employee')
      ${activeFilter}
      ORDER BY u.active DESC, u.role ASC, u.last_name ASC, u.first_name ASC
    `) as Record<string, unknown>[];
  }
  return rows.map((r) => ({
    id: Number(r.id),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: String(r.email),
    role: String(r.role),
    active: Boolean(r.active),
    createdAt: new Date(String(r.created_at)).toISOString(),
    lastLoginAt: r.last_login_at
      ? new Date(String(r.last_login_at)).toISOString()
      : null,
  }));
}

export async function removeOrArchiveCompanyUser(
  userId: number,
  companyId: number
): Promise<{ action: "deactivated" }> {
  const ok = await setCompanyUserActive(userId, companyId, false);
  if (!ok) throw new Error("NOT_FOUND");
  return { action: "deactivated" };
}

export async function setCompanyUserActive(
  userId: number,
  companyId: number,
  active: boolean
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE users SET active = ${active}
    WHERE id = ${userId} AND company_id = ${companyId} AND role != 'superuser'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function touchLastLogin(userId: number): Promise<void> {
  const sql = getSql();
  await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userId}`;
}

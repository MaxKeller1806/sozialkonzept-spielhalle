import { getSql } from "./db";
import { mapCompany } from "./db/row-mappers";
import { brandingToCssVars as themeBrandingToCssVars } from "./branding-theme";
import { OPERATOR_COMPANY_SLUG } from "./branding-theme";

export { mapCompany };
import {
  buildListMeta,
  buildOrderBySql,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import type { Company, CompanyBranding, PrivacyPolicyVersion, SessionUser } from "./types";

export const COMPANY_SORT_ALLOWLIST = {
  companyCode: "c.company_code",
  name: "c.name",
  industryName: "i.name",
  businessTypeName: "bt.name",
  status: "c.status",
  licenseStatus: "c.license_status",
  locationCount: "location_count",
  employeeCount: "employee_count",
  adminCount: "admin_count",
  contactPerson: "c.contact_person",
  createdAt: "c.created_at",
} as const;

export type CompanySummaryRow = {
  id: number;
  companyCode: string;
  name: string;
  status: string;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  createdAt: string;
  employeeCount: number;
  adminCount: number;
  locationCount: number;
  contactPerson: string | null;
  adminContacts: Array<{ name: string; email: string }>;
  industryId: number | null;
  businessTypeId: number | null;
  industryName: string | null;
  businessTypeName: string | null;
};

function mapCompanySummaryRow(row: Record<string, unknown>): CompanySummaryRow {
  const rawContacts = row.admin_contacts;
  let adminContacts: Array<{ name: string; email: string }> = [];
  if (Array.isArray(rawContacts)) {
    adminContacts = rawContacts as Array<{ name: string; email: string }>;
  } else if (typeof rawContacts === "string") {
    try {
      adminContacts = JSON.parse(rawContacts) as Array<{ name: string; email: string }>;
    } catch {
      adminContacts = [];
    }
  }

  return {
    id: Number(row.id),
    companyCode: String(row.company_code ?? ""),
    name: String(row.name),
    status: String(row.status),
    licenseStatus: String(row.license_status),
    licenseExpiresAt: row.license_expires_at
      ? new Date(String(row.license_expires_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    employeeCount: Number(row.employee_count ?? 0),
    adminCount: Number(row.admin_count ?? 0),
    locationCount: Number(row.location_count ?? 0),
    contactPerson:
      row.contact_person != null ? String(row.contact_person) : null,
    adminContacts,
    industryId: row.industry_id != null ? Number(row.industry_id) : null,
    businessTypeId:
      row.business_type_id != null ? Number(row.business_type_id) : null,
    industryName: row.industry_name != null ? String(row.industry_name) : null,
    businessTypeName:
      row.business_type_name != null ? String(row.business_type_name) : null,
  };
}

export async function getCompanyById(id: number): Promise<Company | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      c.*,
      i.name AS industry_name,
      bt.name AS business_type_name
    FROM companies c
    LEFT JOIN industries i ON i.id = c.industry_id
    LEFT JOIN business_types bt ON bt.id = c.business_type_id
    WHERE c.id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapCompany(rows[0] as Record<string, unknown>) : undefined;
}

export async function getCompanyBySlug(slug: string): Promise<Company | undefined> {
  const sql = getSql();
  const normalized = slug.trim().toLowerCase();
  const rows = await sql`
    SELECT * FROM companies WHERE LOWER(slug) = ${normalized} LIMIT 1
  `;
  return rows[0] ? mapCompany(rows[0] as Record<string, unknown>) : undefined;
}

export async function getCompanyByCompanyCode(
  codeRaw: string
): Promise<Company | undefined> {
  const sql = getSql();
  const normalized = codeRaw.trim().toUpperCase();
  if (!normalized) return undefined;
  const rows = await sql`
    SELECT * FROM companies WHERE UPPER(company_code) = ${normalized} LIMIT 1
  `;
  return rows[0] ? mapCompany(rows[0] as Record<string, unknown>) : undefined;
}

export async function getCompanyByLoginDomain(
  domain: string
): Promise<Company | undefined> {
  const sql = getSql();
  const hostname = domain.split(":")[0].toLowerCase();
  const rows = await sql`
    SELECT * FROM companies
    WHERE LOWER(login_domain) = ${hostname}
    LIMIT 1
  `;
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
  return themeBrandingToCssVars(branding);
}

export async function listCompanyOptions(): Promise<Array<{ id: number; name: string }>> {
  const sql = getSql();
  const rows = await sql`SELECT id, name FROM companies ORDER BY name ASC`;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
  }));
}

export async function countTenantUsersStatus(): Promise<{
  active: number;
  archived: number;
}> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE active)::int AS active,
      COUNT(*) FILTER (WHERE NOT active)::int AS archived
    FROM users
    WHERE role IN ('admin', 'employee')
  `;
  return {
    active: Number(rows[0]?.active ?? 0),
    archived: Number(rows[0]?.archived ?? 0),
  };
}

export async function countCompanyUsersStatus(companyId: number): Promise<{
  active: number;
  archived: number;
  adminCount: number;
  employeeCount: number;
}> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE active)::int AS active,
      COUNT(*) FILTER (WHERE NOT active)::int AS archived,
      COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_count,
      COUNT(*) FILTER (WHERE role = 'employee')::int AS employee_count
    FROM users
    WHERE company_id = ${companyId} AND role IN ('admin', 'employee')
  `;
  return {
    active: Number(rows[0]?.active ?? 0),
    archived: Number(rows[0]?.archived ?? 0),
    adminCount: Number(rows[0]?.admin_count ?? 0),
    employeeCount: Number(rows[0]?.employee_count ?? 0),
  };
}

export async function listCompanySummaries(
  query: ListQueryState
): Promise<{ companies: CompanySummaryRow[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const statusFilter =
    query.status === "active"
      ? sql`AND c.status = 'active'`
      : query.status === "archived"
        ? sql`AND c.status != 'active'`
        : sql``;

  const industryFilter =
    query.industryId != null
      ? sql`AND c.industry_id = ${query.industryId}`
      : sql``;

  const businessTypeFilter =
    query.businessTypeId != null
      ? sql`AND c.business_type_id = ${query.businessTypeId}`
      : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(c.name) LIKE ${searchPattern}
        OR LOWER(c.company_code) LIKE ${searchPattern}
        OR LOWER(COALESCE(i.name, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(bt.name, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(c.contact_person, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    COMPANY_SORT_ALLOWLIST,
    "c.created_at",
    "desc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction, "last");

  const rows = await sql`
    WITH user_stats AS (
      SELECT
        company_id,
        COUNT(*) FILTER (WHERE role = 'employee')::int AS employee_count,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_count
      FROM users
      WHERE role IN ('admin', 'employee')
      GROUP BY company_id
    ),
    admin_contacts AS (
      SELECT
        company_id,
        COALESCE(
          json_agg(
            json_build_object(
              'name', TRIM(first_name || ' ' || last_name),
              'email', email
            )
            ORDER BY id
          ),
          '[]'::json
        ) AS admin_contacts
      FROM users
      WHERE role = 'admin' AND active = TRUE
      GROUP BY company_id
    ),
    location_stats AS (
      SELECT company_id, COUNT(*)::int AS location_count
      FROM company_locations
      WHERE active = TRUE
      GROUP BY company_id
    )
    SELECT
      c.id,
      c.company_code,
      c.name,
      c.status,
      c.license_status,
      c.license_expires_at,
      c.created_at,
      c.industry_id,
      c.business_type_id,
      c.contact_person,
      i.name AS industry_name,
      bt.name AS business_type_name,
      COALESCE(us.employee_count, 0) AS employee_count,
      COALESCE(us.admin_count, 0) AS admin_count,
      COALESCE(ls.location_count, 0) AS location_count,
      COALESCE(ac.admin_contacts, '[]'::json) AS admin_contacts,
      COUNT(*) OVER()::int AS total_count
    FROM companies c
    LEFT JOIN industries i ON i.id = c.industry_id
    LEFT JOIN business_types bt ON bt.id = c.business_type_id
    LEFT JOIN user_stats us ON us.company_id = c.id
    LEFT JOIN admin_contacts ac ON ac.company_id = c.id
    LEFT JOIN location_stats ls ON ls.company_id = c.id
    WHERE c.slug != ${OPERATOR_COMPANY_SLUG}
    ${statusFilter}
    ${industryFilter}
    ${businessTypeFilter}
    ${searchFilter}
    ORDER BY ${orderBy}, c.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    companies: rows.map((row) =>
      mapCompanySummaryRow(row as Record<string, unknown>)
    ),
    meta: buildListMeta(query, total),
  };
}

export async function getCompanySummaries(): Promise<CompanySummaryRow[]> {
  const { companies } = await listCompanySummaries({
    page: 1,
    pageSize: 10000,
    offset: 0,
    search: "",
    sortBy: "createdAt",
    sortDirection: "desc",
    status: "all",
    industryId: null,
    businessTypeId: null,
    categoryId: null,
    locationId: null,
    companyId: null,
    role: null,
  });
  return companies;
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
      LIMIT 100
    `) as Record<string, unknown>[];
  } catch {
    rows = (await sql`
      SELECT
        u.id, u.first_name, u.last_name, u.email, u.role, u.active, u.created_at
      FROM users u
      WHERE u.company_id = ${companyId} AND u.role IN ('admin', 'employee')
      ${activeFilter}
      ORDER BY u.active DESC, u.role ASC, u.last_name ASC, u.first_name ASC
      LIMIT 100
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

export interface AllUsersQuery {
  companyId?: number | null;
  role?: "admin" | "employee" | null;
  filter?: UserListFilter;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export async function listAllUsersMinimal(
  query: AllUsersQuery = {}
): Promise<{
  users: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    active: boolean;
    companyId: number | null;
    companyName: string | null;
    lastLoginAt: string | null;
  }>;
  total: number;
  limit: number;
  offset: number;
}> {
  const sql = getSql();
  const filter = query.filter ?? "all";
  const companyId = query.companyId ?? null;
  const role = query.role ?? null;
  const search = query.search?.trim().toLowerCase() ?? "";
  const limit = Math.min(Math.max(query.limit ?? 100, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);

  const activeFilter =
    filter === "active"
      ? sql`AND u.active = TRUE`
      : filter === "archived"
        ? sql`AND u.active = FALSE`
        : sql``;

  const companyFilter =
    companyId != null && companyId > 0
      ? sql`AND u.company_id = ${companyId}`
      : sql``;

  const roleFilter =
    role === "admin" || role === "employee" ? sql`AND u.role = ${role}` : sql``;

  const searchPattern = search ? `%${search}%` : null;
  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(u.email) LIKE ${searchPattern}
        OR LOWER(u.first_name) LIKE ${searchPattern}
        OR LOWER(u.last_name) LIKE ${searchPattern}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE ${searchPattern}
      )`
    : sql``;

  const mapRow = (r: Record<string, unknown>) => ({
    id: Number(r.id),
    firstName: String(r.first_name),
    lastName: String(r.last_name),
    email: String(r.email),
    role: String(r.role),
    active: Boolean(r.active),
    companyId: r.company_id != null ? Number(r.company_id) : null,
    companyName: r.company_name != null ? String(r.company_name) : null,
    lastLoginAt: r.last_login_at
      ? new Date(String(r.last_login_at)).toISOString()
      : null,
  });

  try {
    const rows = await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.active,
        u.last_login_at,
        u.company_id,
        c.name AS company_name,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.role IN ('admin', 'employee')
      ${activeFilter}
      ${companyFilter}
      ${roleFilter}
      ${searchFilter}
      ORDER BY c.name ASC NULLS LAST, u.active DESC, u.role ASC, u.last_name ASC, u.first_name ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    return {
      users: rows.map((r) => mapRow(r as Record<string, unknown>)),
      total,
      limit,
      offset,
    };
  } catch {
    const rows = await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.active,
        u.company_id,
        c.name AS company_name,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.role IN ('admin', 'employee')
      ${activeFilter}
      ${companyFilter}
      ${roleFilter}
      ${searchFilter}
      ORDER BY c.name ASC NULLS LAST, u.active DESC, u.role ASC, u.last_name ASC, u.first_name ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
    return {
      users: rows.map((r) => mapRow(r as Record<string, unknown>)),
      total,
      limit,
      offset,
    };
  }
}

export async function getTenantUserCompanyId(userId: number): Promise<number | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT company_id, role FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) return null;
  if (String(rows[0].role) === "superuser") return null;
  const cid = rows[0].company_id;
  return cid != null ? Number(cid) : null;
}

export async function permanentlyDeleteCompanyUser(
  userId: number,
  companyId: number,
  confirmDelete = false
): Promise<{ action: "deleted"; hadEvidenceData: boolean }> {
  const { executePermanentUserDelete } = await import("./user-delete");
  return executePermanentUserDelete(userId, companyId, confirmDelete);
}

export async function archiveCompanyUser(
  userId: number,
  companyId: number
): Promise<{ action: "deactivated" }> {
  return removeOrArchiveCompanyUser(userId, companyId);
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

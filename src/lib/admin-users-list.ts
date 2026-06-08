import { getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  parseListQueryFromUrl,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import { OPERATOR_COMPANY_SLUG } from "./branding-theme";
import { getLatestCertificate } from "./certificate";
import { getCertificateStatus, statusLabel } from "./status";
import { mapUser } from "./db/row-mappers";
import type { TrainingStatus } from "./types";

export const ADMIN_EMPLOYEE_SORT_ALLOWLIST = {
  firstName: "u.first_name",
  lastName: "u.last_name",
  email: "u.email",
  categoryName: "ec.name",
  active: "u.active",
  lastLoginAt: "u.last_login_at",
  createdAt: "u.created_at",
} as const;

export type AdminEmployeeRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string | null;
  birthPlace: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  location: string | null;
  role: string;
  active: boolean;
  employeeCategoryId: number | null;
  employeeCategoryName: string | null;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  status: TrainingStatus;
  statusLabel: string;
  certificate: {
    id: number;
    certificateNumber: string;
    validUntil: string | null;
    score: number;
  } | null;
};

function mapEmployeeRow(row: Record<string, unknown>): Omit<
  AdminEmployeeRow,
  "status" | "statusLabel" | "certificate"
> {
  return {
    id: Number(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email),
    birthDate: row.birth_date != null ? String(row.birth_date) : null,
    birthPlace: row.birth_place != null ? String(row.birth_place) : null,
    street: row.street != null ? String(row.street) : null,
    houseNumber: row.house_number != null ? String(row.house_number) : null,
    postalCode: row.postal_code != null ? String(row.postal_code) : null,
    city: row.city != null ? String(row.city) : null,
    location: row.location != null ? String(row.location) : null,
    role: String(row.role),
    active: Boolean(row.active),
    employeeCategoryId:
      row.employee_category_id != null
        ? Number(row.employee_category_id)
        : null,
    employeeCategoryName:
      row.category_name != null ? String(row.category_name) : null,
    joinedCompanyAt: row.joined_company_at
      ? new Date(String(row.joined_company_at)).toISOString().slice(0, 10)
      : null,
    leftCompanyAt: row.left_company_at
      ? new Date(String(row.left_company_at)).toISOString().slice(0, 10)
      : null,
    lastLoginAt: row.last_login_at
      ? new Date(String(row.last_login_at)).toISOString()
      : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listAdminEmployees(
  companyId: number,
  query: ListQueryState
): Promise<{ users: AdminEmployeeRow[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND u.active = TRUE`
      : query.status === "archived"
        ? sql`AND u.active = FALSE`
        : sql``;

  const categoryFilter =
    query.categoryId != null
      ? sql`AND u.employee_category_id = ${query.categoryId}`
      : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(u.email) LIKE ${searchPattern}
        OR LOWER(u.first_name) LIKE ${searchPattern}
        OR LOWER(u.last_name) LIKE ${searchPattern}
        OR LOWER(u.first_name || ' ' || u.last_name) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    ADMIN_EMPLOYEE_SORT_ALLOWLIST,
    "u.last_name",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction, "last");

  let rows: Record<string, unknown>[];
  try {
    rows = (await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.birth_date,
        u.birth_place,
        u.place_of_residence,
        u.street,
        u.house_number,
        u.postal_code,
        u.city,
        u.role,
        u.location,
        u.active,
        u.employee_category_id,
        u.joined_company_at,
        u.left_company_at,
        u.created_at,
        u.last_login_at,
        ec.name AS category_name,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN employee_categories ec ON ec.id = u.employee_category_id
      WHERE u.company_id = ${companyId}
        AND u.role = 'employee'
      ${activeFilter}
      ${categoryFilter}
      ${searchFilter}
      ORDER BY ${orderBy}, u.first_name ASC
      LIMIT ${query.pageSize}
      OFFSET ${query.offset}
    `) as Record<string, unknown>[];
  } catch {
    rows = (await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.birth_date,
        u.birth_place,
        u.place_of_residence,
        u.street,
        u.house_number,
        u.postal_code,
        u.city,
        u.role,
        u.location,
        u.active,
        u.employee_category_id,
        u.created_at,
        ec.name AS category_name,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN employee_categories ec ON ec.id = u.employee_category_id
      WHERE u.company_id = ${companyId}
        AND u.role = 'employee'
      ${activeFilter}
      ${categoryFilter}
      ${searchFilter}
      ORDER BY ${orderBy}, u.first_name ASC
      LIMIT ${query.pageSize}
      OFFSET ${query.offset}
    `) as Record<string, unknown>[];
  }

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const users: AdminEmployeeRow[] = [];

  for (const row of rows) {
    const base = mapEmployeeRow(row);
    const user = mapUser(row);
    const cert = await getLatestCertificate(user.id);
    const status = getCertificateStatus(cert);
    users.push({
      ...base,
      status,
      statusLabel: statusLabel(status),
      certificate: cert
        ? {
            id: cert.id,
            certificateNumber: cert.certificateNumber,
            validUntil: cert.validUntil,
            score: cert.score,
          }
        : null,
    });
  }

  return {
    users,
    meta: buildListMeta(query, total),
  };
}

export function parseAdminEmployeeListQuery(
  params: URLSearchParams
): ListQueryState {
  return parseListQueryFromUrl(params, {
    sortBy: "lastName",
    sortDirection: "asc",
    status: "all",
  });
}

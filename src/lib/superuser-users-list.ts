import type postgres from "postgres";
import { getSql, logDbOperation } from "./db";
import { OPERATOR_COMPANY_SLUG } from "./branding-theme";
import type { UserListFilter } from "./tenant";

export interface SuperuserUserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
  companyId: number | null;
  companyName: string | null;
  lastLoginAt: string | null;
}

export interface SuperuserUsersListResult {
  users: SuperuserUserRow[];
  companies: Array<{ id: number; name: string }>;
  total: number;
  limit: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function buildFilters(
  sql: postgres.Sql,
  params: {
    filter: UserListFilter;
    companyId: number | null;
    role: "admin" | "employee" | null;
    search: string;
  }
) {
  const activeFilter =
    params.filter === "active"
      ? sql`AND u.active = TRUE`
      : params.filter === "archived"
        ? sql`AND u.active = FALSE`
        : sql``;

  const companyFilter =
    params.companyId != null && params.companyId > 0
      ? sql`AND u.company_id = ${params.companyId}`
      : sql``;

  const roleFilter =
    params.role === "admin" || params.role === "employee"
      ? sql`AND u.role = ${params.role}`
      : sql``;

  const searchPattern = params.search ? `%${params.search}%` : null;
  const searchFilter = searchPattern
    ? sql`AND (
        u.email ILIKE ${searchPattern}
        OR u.first_name ILIKE ${searchPattern}
        OR u.last_name ILIKE ${searchPattern}
        OR (u.first_name || ' ' || u.last_name) ILIKE ${searchPattern}
      )`
    : sql``;

  return { activeFilter, companyFilter, roleFilter, searchFilter };
}

function mapUser(r: Record<string, unknown>): SuperuserUserRow {
  return {
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
  };
}

function parsePageSize(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(value)));
}

export async function fetchSuperuserUsersList(params: {
  filter?: UserListFilter;
  companyId?: number | null;
  role?: "admin" | "employee" | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<SuperuserUsersListResult> {
  return logDbOperation(
    "superuser/users",
    "fetchSuperuserUsersList",
    async () => {
      const sql = getSql();
      const filter = params.filter ?? "all";
      const companyId = params.companyId ?? null;
      const role = params.role ?? null;
      const search = params.search?.trim().toLowerCase() ?? "";
      const page = Math.max(1, params.page ?? 1);
      const pageSize = parsePageSize(params.pageSize);
      const offset = (page - 1) * pageSize;

      const { activeFilter, companyFilter, roleFilter, searchFilter } = buildFilters(
        sql,
        { filter, companyId, role, search }
      );

      const countRows = await sql`
        SELECT COUNT(*)::int AS total_count
        FROM users u
        WHERE u.role IN ('admin', 'employee')
        ${activeFilter}
        ${companyFilter}
        ${roleFilter}
        ${searchFilter}
      `;
      const total = Number(countRows[0]?.total_count ?? 0);

      const userRows = await sql`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.active,
          u.last_login_at,
          u.company_id,
          c.name AS company_name
        FROM users u
        LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.role IN ('admin', 'employee')
        ${activeFilter}
        ${companyFilter}
        ${roleFilter}
        ${searchFilter}
        ORDER BY u.active DESC, c.name ASC NULLS LAST, u.role ASC, u.last_name ASC, u.first_name ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;

      const companyRows = await sql`
        SELECT id, name
        FROM companies
        WHERE slug != ${OPERATOR_COMPANY_SLUG}
        ORDER BY name ASC
        LIMIT 200
      `;

      return {
        users: userRows.map((r) => mapUser(r as Record<string, unknown>)),
        companies: companyRows.map((r) => ({
          id: Number(r.id),
          name: String(r.name),
        })),
        total,
        limit: pageSize,
        page,
        pageSize,
      };
    },
    (result) => result.users.length
  );
}

import { getSql } from "./db";
import { getActivePrivacyPolicy } from "./privacy";
import {
  buildListMeta,
  parseListQueryFromUrl,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import {
  parseEmploymentFilter,
  parsePrivacyStatusFilter,
  resolvePrivacyStatus,
  type EmploymentFilter,
  type PrivacyStatusFilter,
  type PrivacyStatusKey,
} from "./privacy-status";

export const PRIVACY_STATUS_SORT_ALLOWLIST = {
  lastName: "u.last_name",
  firstName: "u.first_name",
  email: "u.email",
  joinedCompanyAt: "u.joined_company_at",
  leftCompanyAt: "u.left_company_at",
} as const;

export type AdminPrivacyStatusEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  employeeCategoryId: number | null;
  employeeCategoryName: string | null;
  joinedCompanyAt: string | null;
  leftCompanyAt: string | null;
  statusKey: PrivacyStatusKey;
  acceptedAt: string | null;
  acceptedVersion: string | null;
};

export type PrivacyStatusStats = {
  activeTotal: number;
  accepted: number;
  open: number;
  departed: number;
  openActiveCount: number;
  currentVersion: string | null;
};

export type PrivacyStatusListQuery = ListQueryState & {
  privacyFilter: PrivacyStatusFilter;
  employmentFilter: EmploymentFilter;
};

export function parsePrivacyStatusListQuery(
  params: URLSearchParams
): PrivacyStatusListQuery {
  return {
    ...parseListQueryFromUrl(params, {
      sortBy: "lastName",
      sortDirection: "asc",
      status: "active",
    }),
    privacyFilter: parsePrivacyStatusFilter(params.get("privacyFilter")),
    employmentFilter: parseEmploymentFilter(params.get("employmentFilter")),
  };
}

function mapDate(value: unknown): string | null {
  if (value == null) return null;
  return new Date(String(value)).toISOString().slice(0, 10);
}

function mapAcceptedAt(value: unknown): string | null {
  if (value == null) return null;
  return new Date(String(value)).toISOString();
}

function sortEmployees(
  employees: AdminPrivacyStatusEmployee[],
  query: PrivacyStatusListQuery
): AdminPrivacyStatusEmployee[] {
  const dir = query.sortDirection === "desc" ? -1 : 1;

  if (query.sortBy === "acceptedAt") {
    return [...employees].sort((a, b) => {
      const av = a.acceptedAt ? new Date(a.acceptedAt).getTime() : 0;
      const bv = b.acceptedAt ? new Date(b.acceptedAt).getTime() : 0;
      return (av - bv) * dir;
    });
  }

  if (query.sortBy === "privacyStatus") {
    const order: Record<PrivacyStatusKey, number> = {
      accepted: 1,
      open: 2,
      departed: 3,
    };
    return [...employees].sort(
      (a, b) => (order[a.statusKey] - order[b.statusKey]) * dir
    );
  }

  const sortKey = query.sortBy as keyof typeof PRIVACY_STATUS_SORT_ALLOWLIST;
  if (sortKey in PRIVACY_STATUS_SORT_ALLOWLIST) {
    return [...employees].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "lastName":
          av = a.lastName.toLowerCase();
          bv = b.lastName.toLowerCase();
          break;
        case "firstName":
          av = a.firstName.toLowerCase();
          bv = b.firstName.toLowerCase();
          break;
        case "email":
          av = a.email.toLowerCase();
          bv = b.email.toLowerCase();
          break;
        case "joinedCompanyAt":
          av = a.joinedCompanyAt ?? "";
          bv = b.joinedCompanyAt ?? "";
          break;
        case "leftCompanyAt":
          av = a.leftCompanyAt ?? "";
          bv = b.leftCompanyAt ?? "";
          break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return a.firstName.localeCompare(b.firstName, "de") * dir;
    });
  }

  return employees;
}

function computeStats(
  employees: AdminPrivacyStatusEmployee[]
): PrivacyStatusStats {
  let activeTotal = 0;
  let accepted = 0;
  let open = 0;
  let departed = 0;
  let openActiveCount = 0;

  for (const e of employees) {
    if (e.statusKey === "departed") {
      departed += 1;
      continue;
    }
    activeTotal += 1;
    if (e.statusKey === "accepted") {
      accepted += 1;
    } else {
      open += 1;
      openActiveCount += 1;
    }
  }

  return { activeTotal, accepted, open, departed, openActiveCount, currentVersion: null };
}

export async function getAdminPrivacyStatusStats(
  companyId: number
): Promise<PrivacyStatusStats> {
  const sql = getSql();
  const policy = await getActivePrivacyPolicy();
  const policyId = policy?.id ?? null;

  const currentAcceptJoin =
    policyId != null
      ? sql`LEFT JOIN privacy_policy_acceptances p_current
            ON p_current.user_id = u.id AND p_current.version_id = ${policyId}
          LEFT JOIN privacy_policy_versions v_current
            ON v_current.id = p_current.version_id`
      : sql`LEFT JOIN privacy_policy_acceptances p_current ON FALSE
          LEFT JOIN privacy_policy_versions v_current ON FALSE`;

  const statsBaseRows = (await sql`
    SELECT
      u.id,
      u.left_company_at,
      p_current.accepted_at AS current_accepted_at,
      latest_any.accepted_at AS any_accepted_at
    FROM users u
    ${currentAcceptJoin}
    LEFT JOIN LATERAL (
      SELECT pa.accepted_at
      FROM privacy_policy_acceptances pa
      WHERE pa.user_id = u.id
      ORDER BY pa.accepted_at DESC
      LIMIT 1
    ) latest_any ON TRUE
    WHERE u.company_id = ${companyId}
      AND u.role = 'employee'
      AND u.active = TRUE
  `) as Record<string, unknown>[];

  const statsEmployees: AdminPrivacyStatusEmployee[] = statsBaseRows.map(
    (row) => {
      const leftCompanyAt = mapDate(row.left_company_at);
      const currentVersionAcceptedAt = mapAcceptedAt(row.current_accepted_at);
      const anyAcceptedAt = mapAcceptedAt(row.any_accepted_at);
      return {
        id: Number(row.id),
        firstName: "",
        lastName: "",
        email: "",
        employeeCategoryId: null,
        employeeCategoryName: null,
        joinedCompanyAt: null,
        leftCompanyAt,
        statusKey: resolvePrivacyStatus({
          leftCompanyAt,
          currentVersionAcceptedAt,
          anyAcceptedAt,
          activePolicyId: policyId,
        }),
        acceptedAt: null,
        acceptedVersion: null,
      };
    }
  );

  return {
    ...computeStats(statsEmployees),
    currentVersion: policy?.version ?? null,
  };
}

export async function listAdminPrivacyStatus(
  companyId: number,
  query: PrivacyStatusListQuery
): Promise<{
  employees: AdminPrivacyStatusEmployee[];
  meta: ListMeta;
  stats: PrivacyStatusStats;
}> {
  const sql = getSql();
  const policy = await getActivePrivacyPolicy();
  const policyId = policy?.id ?? null;

  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND u.active = TRUE`
      : query.status === "archived"
        ? sql`AND u.active = FALSE`
        : sql``;

  const employmentFilter =
    query.employmentFilter === "departed"
      ? sql`AND u.left_company_at IS NOT NULL AND u.left_company_at <= CURRENT_DATE`
      : query.employmentFilter === "all"
        ? sql``
        : sql`AND (u.left_company_at IS NULL OR u.left_company_at > CURRENT_DATE)`;

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

  const currentAcceptJoin =
    policyId != null
      ? sql`LEFT JOIN privacy_policy_acceptances p_current
            ON p_current.user_id = u.id AND p_current.version_id = ${policyId}
          LEFT JOIN privacy_policy_versions v_current
            ON v_current.id = p_current.version_id`
      : sql`LEFT JOIN privacy_policy_acceptances p_current ON FALSE
          LEFT JOIN privacy_policy_versions v_current ON FALSE`;

  const userRows = (await sql`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.joined_company_at,
      u.left_company_at,
      u.employee_category_id,
      ec.name AS category_name,
      p_current.accepted_at AS current_accepted_at,
      v_current.version AS current_accepted_version,
      latest_any.accepted_at AS any_accepted_at,
      latest_any.version AS any_accepted_version
    FROM users u
    LEFT JOIN employee_categories ec ON ec.id = u.employee_category_id
    ${currentAcceptJoin}
    LEFT JOIN LATERAL (
      SELECT pa.accepted_at, pv.version
      FROM privacy_policy_acceptances pa
      JOIN privacy_policy_versions pv ON pv.id = pa.version_id
      WHERE pa.user_id = u.id
      ORDER BY pa.accepted_at DESC
      LIMIT 1
    ) latest_any ON TRUE
    WHERE u.company_id = ${companyId}
      AND u.role = 'employee'
    ${activeFilter}
    ${employmentFilter}
    ${categoryFilter}
    ${searchFilter}
    ORDER BY u.last_name ASC, u.first_name ASC
  `) as Record<string, unknown>[];

  const allEmployees: AdminPrivacyStatusEmployee[] = userRows.map((row) => {
    const joinedCompanyAt = mapDate(row.joined_company_at);
    const leftCompanyAt = mapDate(row.left_company_at);
    const currentVersionAcceptedAt = mapAcceptedAt(row.current_accepted_at);
    const anyAcceptedAt = mapAcceptedAt(row.any_accepted_at);

    const statusKey = resolvePrivacyStatus({
      leftCompanyAt,
      currentVersionAcceptedAt,
      anyAcceptedAt,
      activePolicyId: policyId,
    });

    const acceptedAt =
      policyId != null ? currentVersionAcceptedAt : anyAcceptedAt;
    const acceptedVersion =
      policyId != null
        ? row.current_accepted_version != null
          ? String(row.current_accepted_version)
          : null
        : row.any_accepted_version != null
          ? String(row.any_accepted_version)
          : null;

    return {
      id: Number(row.id),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      email: String(row.email),
      employeeCategoryId:
        row.employee_category_id != null
          ? Number(row.employee_category_id)
          : null,
      employeeCategoryName:
        row.category_name != null ? String(row.category_name) : null,
      joinedCompanyAt,
      leftCompanyAt,
      statusKey,
      acceptedAt,
      acceptedVersion,
    };
  });

  const stats = await getAdminPrivacyStatusStats(companyId);

  let employees = allEmployees;
  if (query.privacyFilter !== "all") {
    employees = employees.filter((e) => e.statusKey === query.privacyFilter);
  }

  employees = sortEmployees(employees, query);

  const total = employees.length;
  const paged = employees.slice(query.offset, query.offset + query.pageSize);

  return {
    employees: paged,
    meta: buildListMeta(query, total),
    stats,
  };
}

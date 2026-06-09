import type postgres from "postgres";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type SortDirection = "asc" | "desc";
export type StatusFilter = "active" | "archived" | "all";

export type ListQueryState = {
  page: number;
  pageSize: number;
  offset: number;
  search: string;
  sortBy: string;
  sortDirection: SortDirection;
  status: StatusFilter;
  industryId: number | null;
  businessTypeId: number | null;
  categoryId: number | null;
  locationId: number | null;
  companyId: number | null;
  role: "admin" | "employee" | null;
};

export type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sortBy: string;
  sortDirection: SortDirection;
  search: string;
  status: StatusFilter;
};

export function parsePageSize(value: string | null | undefined): number {
  const n = parseInt(value ?? "", 10);
  if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(n)) return n;
  return DEFAULT_PAGE_SIZE;
}

export function parseStatusFilter(
  value: string | null | undefined
): StatusFilter {
  if (value === "active" || value === "archived") return value;
  return "all";
}

export function parseOptionalId(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseSortDirection(
  value: string | null | undefined
): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

export function paramKey(prefix: string, key: string): string {
  return prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
}

export const LIST_FILTER_RESET_KEYS = [
  "search",
  "q",
  "sortBy",
  "sortDirection",
  "status",
  "filter",
  "industryId",
  "businessTypeId",
  "categoryId",
  "locationId",
  "companyId",
  "role",
  "page",
] as const;

export function parseRoleFilter(
  value: string | null | undefined
): "admin" | "employee" | null {
  if (value === "admin" || value === "employee") return value;
  return null;
}

/** Prüft, ob in der URL aktive Suche/Filter/Sortierung/Pagination gesetzt ist. */
export function hasActiveListFilters(
  params: URLSearchParams,
  prefix = "",
  options?: { defaultStatus?: StatusFilter }
): boolean {
  if (params.get(paramKey(prefix, "search"))) return true;
  if (params.get(paramKey(prefix, "q"))) return true;
  if (params.get(paramKey(prefix, "sortBy"))) return true;
  if (params.get(paramKey(prefix, "sortDirection"))) return true;
  if (params.get(paramKey(prefix, "industryId"))) return true;
  if (params.get(paramKey(prefix, "businessTypeId"))) return true;
  if (params.get(paramKey(prefix, "categoryId"))) return true;
  if (params.get(paramKey(prefix, "locationId"))) return true;
  if (params.get(paramKey(prefix, "companyId"))) return true;
  if (params.get(paramKey(prefix, "role"))) return true;

  const page = parseInt(params.get(paramKey(prefix, "page")) ?? "1", 10);
  if (page > 1) return true;

  const status =
    params.get(paramKey(prefix, "status")) ??
    params.get(paramKey(prefix, "filter"));
  if (status && status !== "all") {
    if (!options?.defaultStatus || status !== options.defaultStatus) {
      return true;
    }
  }

  return false;
}

export function parseListQueryFromUrl(
  params: URLSearchParams,
  defaults?: {
    sortBy?: string;
    sortDirection?: SortDirection;
    status?: StatusFilter;
  },
  prefix = ""
): ListQueryState {
  const page = Math.max(
    1,
    parseInt(params.get(paramKey(prefix, "page")) ?? "1", 10) || 1
  );
  const pageSize = parsePageSize(params.get(paramKey(prefix, "pageSize")));
  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    offset,
    search:
      params.get(paramKey(prefix, "search"))?.trim() ??
      params.get(paramKey(prefix, "q"))?.trim() ??
      "",
    sortBy:
      params.get(paramKey(prefix, "sortBy")) ?? defaults?.sortBy ?? "",
    sortDirection: parseSortDirection(
      params.get(paramKey(prefix, "sortDirection")) ?? defaults?.sortDirection
    ),
    status: parseStatusFilter(
      params.get(paramKey(prefix, "status")) ??
        params.get(paramKey(prefix, "filter")) ??
        defaults?.status
    ),
    industryId: parseOptionalId(params.get(paramKey(prefix, "industryId"))),
    businessTypeId: parseOptionalId(
      params.get(paramKey(prefix, "businessTypeId"))
    ),
    categoryId: parseOptionalId(params.get(paramKey(prefix, "categoryId"))),
    locationId: parseOptionalId(params.get(paramKey(prefix, "locationId"))),
    companyId: parseOptionalId(params.get(paramKey(prefix, "companyId"))),
    role: parseRoleFilter(params.get(paramKey(prefix, "role"))),
  };
}

export function buildListMeta(
  query: ListQueryState,
  total: number
): ListMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    search: query.search,
    status: query.status,
  };
}

export type SortAllowlist = Record<string, string>;

export function resolveSortColumn(
  sortBy: string,
  sortDirection: SortDirection,
  allowlist: SortAllowlist,
  defaultColumn: string,
  defaultDirection: SortDirection = "desc"
): { column: string; direction: SortDirection; isDefault: boolean } {
  const column = sortBy && allowlist[sortBy] ? allowlist[sortBy] : defaultColumn;
  const isDefault = !sortBy || !allowlist[sortBy];
  const direction = isDefault
    ? defaultDirection
    : sortDirection === "desc"
      ? "desc"
      : "asc";
  return { column, direction, isDefault };
}

/** Nur mit allowlist-validierten Spaltennamen aufrufen. */
export function buildOrderBySql(
  sql: postgres.Sql,
  column: string,
  direction: SortDirection,
  nulls?: "first" | "last"
): ReturnType<postgres.Sql["unsafe"]> {
  const dir = direction === "desc" ? "DESC" : "ASC";
  const nullsClause =
    nulls === "first" ? " NULLS FIRST" : nulls === "last" ? " NULLS LAST" : "";
  return sql.unsafe(`${column} ${dir}${nullsClause}`);
}

export function buildListApiQuery(
  state: Partial<ListQueryState>,
  prefix = ""
): string {
  const params = new URLSearchParams();
  params.set(paramKey(prefix, "page"), String(state.page ?? 1));
  params.set(paramKey(prefix, "pageSize"), String(state.pageSize ?? DEFAULT_PAGE_SIZE));
  if (state.search) params.set(paramKey(prefix, "search"), state.search);
  if (state.sortBy) params.set(paramKey(prefix, "sortBy"), state.sortBy);
  if (state.sortDirection) {
    params.set(paramKey(prefix, "sortDirection"), state.sortDirection);
  }
  if (state.status && state.status !== "all") {
    params.set(paramKey(prefix, "status"), state.status);
  }
  if (state.industryId) {
    params.set(paramKey(prefix, "industryId"), String(state.industryId));
  }
  if (state.businessTypeId) {
    params.set(paramKey(prefix, "businessTypeId"), String(state.businessTypeId));
  }
  if (state.categoryId) {
    params.set(paramKey(prefix, "categoryId"), String(state.categoryId));
  }
  if (state.locationId) {
    params.set(paramKey(prefix, "locationId"), String(state.locationId));
  }
  if (state.companyId) {
    params.set(paramKey(prefix, "companyId"), String(state.companyId));
  }
  if (state.role) {
    params.set(paramKey(prefix, "role"), state.role);
  }
  return params.toString();
}

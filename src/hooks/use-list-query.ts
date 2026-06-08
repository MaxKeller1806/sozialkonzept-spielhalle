"use client";

import {
  buildListApiQuery,
  DEFAULT_PAGE_SIZE,
  hasActiveListFilters,
  LIST_FILTER_RESET_KEYS,
  paramKey,
  parsePageSize,
  parseSortDirection,
  parseStatusFilter,
  type ListQueryState,
  type SortDirection,
  type StatusFilter,
} from "@/lib/list-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type UseListQueryOptions = {
  defaultSortBy?: string;
  defaultSortDirection?: SortDirection;
  defaultStatus?: StatusFilter;
  prefix?: string;
};

export function useListQuery(options: UseListQueryOptions = {}) {
  const prefix = options.prefix ?? "";
  const defaultSortBy = options.defaultSortBy ?? "";
  const defaultSortDirection = options.defaultSortDirection ?? "asc";
  const defaultStatus = options.defaultStatus;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo((): ListQueryState => {
    const page = Math.max(
      1,
      parseInt(searchParams.get(paramKey(prefix, "page")) ?? "1", 10) || 1
    );
    const pageSize = parsePageSize(searchParams.get(paramKey(prefix, "pageSize")));
    const sortByParam = searchParams.get(paramKey(prefix, "sortBy"));
    const sortDirParam = searchParams.get(paramKey(prefix, "sortDirection"));

    return {
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      search: searchParams.get(paramKey(prefix, "search")) ?? "",
      sortBy: sortByParam ?? defaultSortBy,
      sortDirection: sortDirParam
        ? parseSortDirection(sortDirParam)
        : defaultSortDirection,
      status: parseStatusFilter(
        searchParams.get(paramKey(prefix, "status")) ??
          searchParams.get(paramKey(prefix, "filter")) ??
          defaultStatus
      ),
      industryId: (() => {
        const v = searchParams.get(paramKey(prefix, "industryId"));
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      })(),
      businessTypeId: (() => {
        const v = searchParams.get(paramKey(prefix, "businessTypeId"));
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      })(),
      categoryId: (() => {
        const v = searchParams.get(paramKey(prefix, "categoryId"));
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      })(),
      companyId: (() => {
        const v = searchParams.get(paramKey(prefix, "companyId"));
        if (!v) return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      })(),
      role: (() => {
        const v = searchParams.get(paramKey(prefix, "role"));
        if (v === "admin" || v === "employee") return v;
        return null;
      })(),
    };
  }, [
    searchParams,
    prefix,
    defaultSortBy,
    defaultSortDirection,
    defaultStatus,
  ]);

  const hasActiveFilters = useMemo(
    () =>
      hasActiveListFilters(searchParams, prefix, {
        defaultStatus,
      }),
    [searchParams, prefix, defaultStatus]
  );

  const apiQuery = useMemo(() => buildListApiQuery(state), [state]);

  const replaceIfChanged = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      const currentQs = searchParams.toString();
      if (qs === currentQs) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const updateParams = useCallback(
    (
      patch: Record<string, string | null | undefined>,
      opts?: { resetPage?: boolean }
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        const urlKey = paramKey(prefix, key);
        if (value == null || value === "") params.delete(urlKey);
        else params.set(urlKey, value);
      }
      if (opts?.resetPage) {
        params.set(paramKey(prefix, "page"), "1");
      }
      replaceIfChanged(params);
    },
    [searchParams, prefix, replaceIfChanged]
  );

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const key of LIST_FILTER_RESET_KEYS) {
      const urlKey = paramKey(prefix, key);
      if (params.has(urlKey)) {
        params.delete(urlKey);
        changed = true;
      }
    }
    if (!changed) return;
    replaceIfChanged(params);
  }, [searchParams, prefix, replaceIfChanged]);

  const setSearch = useCallback(
    (search: string) => updateParams({ search: search || null }, { resetPage: true }),
    [updateParams]
  );

  const setStatus = useCallback(
    (status: StatusFilter) =>
      updateParams({ status: status === "all" ? null : status }, { resetPage: true }),
    [updateParams]
  );

  const setPage = useCallback(
    (page: number) => updateParams({ page: String(Math.max(1, page)) }),
    [updateParams]
  );

  const setPageSize = useCallback(
    (pageSize: number) =>
      updateParams(
        { pageSize: String(pageSize), page: "1" },
        { resetPage: true }
      ),
    [updateParams]
  );

  const toggleSort = useCallback(
    (columnKey: string) => {
      const currentKey = state.sortBy;
      const currentDir = state.sortDirection;

      if (currentKey !== columnKey) {
        updateParams({ sortBy: columnKey, sortDirection: "asc" });
        return;
      }
      if (currentDir === "asc") {
        updateParams({ sortBy: columnKey, sortDirection: "desc" });
        return;
      }
      updateParams({ sortBy: null, sortDirection: null });
    },
    [state.sortBy, state.sortDirection, updateParams]
  );

  const getSortState = useCallback(
    (columnKey: string): "asc" | "desc" | null => {
      if (state.sortBy !== columnKey) return null;
      return state.sortDirection;
    },
    [state.sortBy, state.sortDirection]
  );

  return {
    state,
    apiQuery,
    hasActiveFilters,
    updateParams,
    setSearch,
    setStatus,
    setPage,
    setPageSize,
    toggleSort,
    getSortState,
    resetFilters,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  };
}

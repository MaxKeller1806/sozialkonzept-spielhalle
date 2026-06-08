"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useListQuery, type UseListQueryOptions } from "./use-list-query";
import type { ListMeta } from "@/lib/list-query";

type UseAdminListOptions<T> = UseListQueryOptions & {
  apiPath: string;
  dataKey: string;
  metaKey?: string;
  onUnauthorized?: () => void;
  mapRows?: (rows: T[]) => T[];
};

export function useAdminList<T>(options: UseAdminListOptions<T>) {
  const { apiPath, dataKey, mapRows, onUnauthorized } = options;
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const listQuery = useListQuery({
    defaultSortBy: options.defaultSortBy,
    defaultSortDirection: options.defaultSortDirection,
    defaultStatus: options.defaultStatus,
    prefix: options.prefix,
  });

  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    const url =
      apiPath + (listQuery.apiQuery ? `?${listQuery.apiQuery}` : "");
    fetch(url)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          onUnauthorizedRef.current?.();
          return null;
        }
        if (!r.ok) {
          return r.json().then((d) => {
            throw new Error(d.error ?? "Laden fehlgeschlagen.");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const raw = data[dataKey] as T[] | undefined;
        const mapped = mapRows && raw ? mapRows(raw) : raw ?? [];
        setRows(mapped);
        if (data.meta) setMeta(data.meta as ListMeta);
        else if (data.total != null) {
          setMeta({
            page: listQuery.state.page,
            pageSize: listQuery.state.pageSize,
            total: Number(data.total),
            totalPages: Math.max(
              1,
              Math.ceil(Number(data.total) / listQuery.state.pageSize)
            ),
            sortBy: listQuery.state.sortBy,
            sortDirection: listQuery.state.sortDirection,
            search: listQuery.state.search,
            status: listQuery.state.status,
          });
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => setLoading(false));
  }, [apiPath, dataKey, listQuery.apiQuery, mapRows]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    rows,
    meta,
    loading,
    error,
    reload,
    ...listQuery,
  };
}

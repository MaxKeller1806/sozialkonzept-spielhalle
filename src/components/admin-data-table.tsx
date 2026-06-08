"use client";

import { Button, Card, Input } from "@/components/ui";
import {
  PAGE_SIZE_OPTIONS,
  type StatusFilter,
} from "@/lib/list-query";
import type { ReactNode } from "react";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
};

export type AdminTableFilter = {
  key: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

type AdminDataTableProps<T> = {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: StatusFilter;
  onStatusChange?: (status: StatusFilter) => void;
  filters?: AdminTableFilter[];
  toolbarExtra?: ReactNode;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (columnKey: string) => void;
  getSortState?: (columnKey: string) => "asc" | "desc" | null;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  filteredEmptyMessage?: string;
  minWidth?: string;
};

function SortIndicator({
  direction,
}: {
  direction: "asc" | "desc" | null;
}) {
  if (!direction) return null;
  return (
    <span className="ml-1 text-slate-400" aria-hidden>
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyMessage = "Keine Einträge gefunden.",
  search,
  searchPlaceholder = "Suchen…",
  onSearchChange,
  statusFilter,
  onStatusChange,
  filters = [],
  toolbarExtra,
  page = 1,
  pageSize = 25,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onSort,
  getSortState,
  hasActiveFilters = false,
  onResetFilters,
  filteredEmptyMessage = "Keine Treffer für die aktuelle Suche oder Filter.",
  minWidth = "640px",
}: AdminDataTableProps<T>) {
  const total = totalCount ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPagination = onPageChange != null && totalCount != null;
  const showResetButton =
    hasActiveFilters && onResetFilters != null;
  const resolvedEmptyMessage =
    rows.length === 0 && hasActiveFilters
      ? filteredEmptyMessage
      : emptyMessage;

  return (
    <div className="space-y-4">
      {(onSearchChange ||
        onStatusChange ||
        filters.length > 0 ||
        toolbarExtra ||
        showResetButton) && (
        <div className="flex flex-wrap items-end gap-3">
          {onSearchChange != null && (
            <div className="min-w-[200px] flex-1">
              <Input
                label="Suche"
                value={search ?? ""}
                placeholder={searchPlaceholder}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {onStatusChange && statusFilter != null && (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                className="mt-1 block rounded-xl border border-slate-300 px-3 py-2"
                value={statusFilter}
                onChange={(e) =>
                  onStatusChange(e.target.value as StatusFilter)
                }
              >
                <option value="all">Alle</option>
                <option value="active">Aktiv</option>
                <option value="archived">Inaktiv / archiviert</option>
              </select>
            </label>
          )}
          {filters.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="font-medium text-slate-700">{f.label}</span>
              <select
                className="mt-1 block rounded-xl border border-slate-300 px-3 py-2"
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {showResetButton && (
            <Button
              type="button"
              variant="secondary"
              className="!w-auto whitespace-nowrap"
              onClick={onResetFilters}
            >
              Filter zurücksetzen
            </Button>
          )}
          {toolbarExtra}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <p>{error}</p>
          {onRetry && (
            <Button
              type="button"
              variant="secondary"
              onClick={onRetry}
              className="mt-3 !w-auto"
            >
              Erneut laden
            </Button>
          )}
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="p-6 text-sm text-slate-600">Lädt…</p>
        ) : (
          <table
            className="w-full text-left text-sm"
            style={{ minWidth }}
          >
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                {columns.map((col) => {
                  const sortable = col.sortable && onSort;
                  const sortDir = getSortState?.(col.key) ?? null;
                  return (
                    <th key={col.key} className={`p-4 ${col.className ?? ""}`}>
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center font-medium hover:text-slate-900"
                          onClick={() => onSort!(col.key)}
                        >
                          {col.header}
                          <SortIndicator direction={sortDir} />
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-slate-500"
                  >
                    {resolvedEmptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={rowKey(row)} className="border-b last:border-0">
                    {columns.map((col) => (
                      <td key={col.key} className={`p-4 ${col.className ?? ""}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showPagination && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            {total === 0
              ? "Keine Einträge"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} von ${total}`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {onPageSizeChange && (
              <label className="flex items-center gap-2">
                <span>Pro Seite</span>
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!w-auto !min-w-0 px-3"
                disabled={page <= 1}
                onClick={() => onPageChange!(page - 1)}
              >
                Zurück
              </Button>
              <span className="flex items-center px-2">
                Seite {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                className="!w-auto !min-w-0 px-3"
                disabled={page >= totalPages}
                onClick={() => onPageChange!(page + 1)}
              >
                Weiter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Card } from "@/components/ui";
import type { StatusFilter } from "@/lib/list-query";
import type { ReactNode } from "react";
import { IconRotateCcw, IconSearch } from "@/components/table-action-icons";

export type SearchFilterBarFilter = {
  key: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

export type SearchFilterBarStatusOption = {
  value: string;
  label: string;
};

export const SEARCH_FILTER_FIELD_CLASS =
  "focus-brand h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm";

export const SEARCH_FILTER_LABEL_CLASS =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const DEFAULT_STATUS_OPTIONS: SearchFilterBarStatusOption[] = [
  { value: "all", label: "Alle" },
  { value: "active", label: "Aktiv" },
  { value: "archived", label: "Inaktiv / archiviert" },
];

export type SearchFilterBarProps = {
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  statusFilter?: StatusFilter | string;
  onStatusChange?: (status: string) => void;
  statusLabel?: string;
  statusOptions?: SearchFilterBarStatusOption[];
  filters?: SearchFilterBarFilter[];
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  toolbarExtra?: ReactNode;
  className?: string;
};

export function SearchFilterBar({
  search,
  searchPlaceholder = "Suchen…",
  onSearchChange,
  searchLabel = "Suche",
  statusFilter,
  onStatusChange,
  statusLabel = "Status",
  statusOptions = DEFAULT_STATUS_OPTIONS,
  filters = [],
  hasActiveFilters = false,
  onResetFilters,
  toolbarExtra,
  className = "",
}: SearchFilterBarProps) {
  const showResetButton = hasActiveFilters && onResetFilters != null;
  const showBar =
    onSearchChange != null ||
    onStatusChange != null ||
    filters.length > 0 ||
    toolbarExtra != null ||
    showResetButton;

  if (!showBar) return null;

  return (
    <Card className={`!p-4 !shadow-sm ${className}`.trim()}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-4">
          {onSearchChange != null && (
            <label className="block min-w-0 w-full sm:min-w-[220px] sm:flex-[1.4] sm:basis-[220px]">
              <span className={SEARCH_FILTER_LABEL_CLASS}>{searchLabel}</span>
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search ?? ""}
                  placeholder={searchPlaceholder}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={`${SEARCH_FILTER_FIELD_CLASS} pl-10`}
                />
              </div>
            </label>
          )}
          {onStatusChange && statusFilter != null && (
            <label className="block min-w-0 w-full sm:min-w-[140px] sm:flex-1 sm:basis-[140px]">
              <span className={SEARCH_FILTER_LABEL_CLASS}>{statusLabel}</span>
              <select
                className={SEARCH_FILTER_FIELD_CLASS}
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {filters.map((filter) => (
            <label
              key={filter.key}
              className="block min-w-0 w-full sm:min-w-[140px] sm:flex-1 sm:basis-[140px]"
            >
              <span className={SEARCH_FILTER_LABEL_CLASS}>{filter.label}</span>
              <select
                className={SEARCH_FILTER_FIELD_CLASS}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pb-0.5">
          {showResetButton && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-brand"
              onClick={onResetFilters}
            >
              <IconRotateCcw />
              Filter zurücksetzen
            </button>
          )}
          {toolbarExtra}
        </div>
      </div>
    </Card>
  );
}

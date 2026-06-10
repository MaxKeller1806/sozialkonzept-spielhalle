"use client";

import { Button, Card } from "@/components/ui";
import {
  SearchFilterBar,
  type SearchFilterBarFilter,
} from "@/components/search-filter-bar";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTableColumnWidths } from "@/hooks/use-table-column-widths";
import {
  PAGE_SIZE_OPTIONS,
  type StatusFilter,
} from "@/lib/list-query";
import {
  tableWidthStorageKey,
  type TableColumnLayout,
} from "@/lib/table-column-widths";
import type { ReactNode } from "react";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ColumnResizeHandle,
  ResizableTableShell,
} from "@/components/resizable-table-parts";
import {
  stickyCellClass,
  stickyHeaderClass,
} from "@/lib/table-column-widths";
import { TableCellText } from "@/components/table-cell-text";
import {
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
} from "@/components/table-action-icons";

export type { TableColumnLayout };
export { tableWidthStorageKey };

export type AdminTableColumn<T> = Omit<TableColumnLayout, "defaultWidth"> & {
  defaultWidth?: number;
  header: string;
  /** Optionaler Spaltenkopf mit Icon o. Ä. – `header` bleibt für Picker/Sortierung. */
  headerContent?: ReactNode;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
  /** Zellinhalt mit Ellipsis + title (optional pro Zeile). */
  truncate?: boolean;
  getCellTitle?: (row: T) => string | undefined;
  /** Nicht im Spalten-Picker anzeigen (z. B. Aktionen). */
  hideFromPicker?: boolean;
  /** Klick stoppt Zeilenaktion (z. B. Links in der Zelle). */
  stopRowClick?: boolean;
  /** Schmaler Icon-Spaltenkopf ohne Text (Status, Lizenz, …). */
  compactHeader?: boolean;
};

export type AdminTableFilter = SearchFilterBarFilter;

type AdminDataTableProps<T> = {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** z. B. "superuser.companies" → certiano.tableWidths.superuser.companies */
  storageKey?: string;
  /** Modern: luftige SaaS-Optik, einheitliche Filterleiste */
  appearance?: "default" | "modern";
  /** Zeilenklick (z. B. Bearbeiten-Drawer). Aktionen-Zellen stoppen Propagation. */
  onRowClick?: (row: T) => void;
  /** Zweite Zeile pro Eintrag (Taskbar), z. B. Schnellaktionen. */
  renderRowFooter?: (row: T) => ReactNode;
  /** Legende oberhalb der Tabelle (sticky innerhalb der Card). */
  legendBar?: ReactNode;
  /** Primäraktion rechts in der Tabellen-Toolbar (z. B. „Firma hinzufügen“). */
  primaryAction?: ReactNode;
  /** Linker Treffer-Text oberhalb der Tabelle (modern). */
  resultLabel?: (total: number) => string;
  /** Icon/Element links neben dem Treffer-Text (modern). */
  resultLeading?: ReactNode;
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
  /** @deprecated Breite ergibt sich aus Spalten-Defaults + gespeicherten Werten */
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

function toLayoutColumns<T>(columns: AdminTableColumn<T>[]): TableColumnLayout[] {
  return columns.map((col) => ({
    key: col.key,
    defaultWidth:
      col.defaultWidth ?? (col.key === "actions" ? 200 : 140),
    minWidth: col.minWidth,
    maxWidth: col.maxWidth,
    resizable: col.resizable ?? col.key !== "actions",
    sticky: col.sticky ?? (col.key === "actions" ? "right" : undefined),
    visible: col.visible,
  }));
}

function getPageNumbers(current: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, current]);
  if (current > 1) pages.add(current - 1);
  if (current < totalPages) pages.add(current + 1);

  return Array.from(pages).sort((a, b) => a - b);
}

function ColumnPicker({
  columns,
  isVisible,
  onToggle,
}: {
  columns: Array<{ key: string; header: string }>;
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconColumns className="text-slate-500" />
        Spalten anpassen
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
        >
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-brand focus:ring-brand"
                checked={isVisible(col.key)}
                onChange={() => onToggle(col.key)}
              />
              <span>{col.header}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  storageKey,
  appearance = "default",
  onRowClick,
  renderRowFooter,
  legendBar,
  primaryAction,
  resultLabel,
  resultLeading,
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
}: AdminDataTableProps<T>) {
  const isModern = appearance === "modern";

  const visibilityDefs = useMemo(
    () =>
      columns.map((col) => ({
        key: col.key,
        header: col.header,
        defaultVisible: col.visible !== false,
        hideFromPicker:
          col.hideFromPicker ?? (col.key === "actions" || col.key === "rowMenu" || col.header.trim() === ""),
      })),
    [columns]
  );

  const { pickerColumns, isVisible, toggleColumn } = useTableColumnVisibility(
    isModern ? storageKey : undefined,
    visibilityDefs
  );

  const effectiveColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        visible:
          col.visible === false
            ? false
            : isModern
              ? isVisible(col.key)
              : true,
      })),
    [columns, isModern, isVisible]
  );

  const layoutColumns = toLayoutColumns(effectiveColumns);
  const resolvedStorageKey = storageKey
    ? tableWidthStorageKey(storageKey)
    : undefined;

  const { visibleColumns, widths, startResize } = useTableColumnWidths(
    resolvedStorageKey,
    layoutColumns
  );

  const visibleDataColumns = effectiveColumns.filter(
    (col) => col.visible !== false
  );

  const total = totalCount ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPagination = onPageChange != null && totalCount != null;
  const showResetButton = hasActiveFilters && onResetFilters != null;
  const resolvedEmptyMessage =
    rows.length === 0 && hasActiveFilters
      ? filteredEmptyMessage
      : emptyMessage;
  const resolvedResultLabel =
    resultLabel?.(total) ??
    (total === 1 ? "1 Eintrag gefunden" : `${total} Einträge gefunden`);

  const thClass = isModern
    ? "relative px-3 py-3.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"
    : "relative overflow-hidden p-3";
  const tdClass = isModern
    ? "overflow-hidden px-3 py-4 align-middle text-sm text-slate-700"
    : "overflow-hidden p-3 align-top";
  const hasRowGroups = isModern && renderRowFooter != null;
  const rowClass = isModern
    ? hasRowGroups
      ? "group bg-white transition-colors hover:bg-slate-50/70"
      : "group border-b border-slate-100 transition-colors hover:bg-slate-50/70"
    : "border-b last:border-0 hover:bg-slate-50";
  const footerRowClass = isModern
    ? "border-b border-slate-200/80 bg-slate-50/70"
    : "border-b border-slate-200 bg-slate-50/80";
  const theadClass = isModern
    ? "border-b border-slate-100 bg-white text-slate-500"
    : "border-b bg-slate-50 text-slate-600";

  const showFilterBar =
    onSearchChange ||
    onStatusChange ||
    filters.length > 0 ||
    toolbarExtra ||
    showResetButton;

  const showTableToolbar =
    isModern &&
    (resultLabel != null || primaryAction != null || (storageKey && pickerColumns.length > 0));

  function renderCellContent(col: AdminTableColumn<T>, row: T) {
    const content = col.render(row);
    if (!col.truncate) return content;
    const title = col.getCellTitle?.(row);
    if (typeof content === "string" || typeof content === "number") {
      return <TableCellText title={title}>{content}</TableCellText>;
    }
    return (
      <div className="truncate" title={title}>
        {content}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {showFilterBar && (
        <SearchFilterBar
          search={search}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          statusFilter={statusFilter}
          onStatusChange={
            onStatusChange ? (value) => onStatusChange(value as StatusFilter) : undefined
          }
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={onResetFilters}
          toolbarExtra={toolbarExtra}
        />
      )}

      {!isModern && primaryAction ? (
        <div className="flex justify-end">{primaryAction}</div>
      ) : null}

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

      {showTableToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {resultLeading ? (
              <span className="text-slate-400" aria-hidden>
                {resultLeading}
              </span>
            ) : null}
            <p>{resolvedResultLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {storageKey && pickerColumns.length > 0 ? (
              <ColumnPicker
                columns={pickerColumns}
                isVisible={isVisible}
                onToggle={toggleColumn}
              />
            ) : null}
            {primaryAction}
          </div>
        </div>
      ) : null}

      <Card className="min-w-0 overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-sm text-slate-600">Lädt…</p>
        ) : (
          <>
            {legendBar}
            <ResizableTableShell
            columns={visibleColumns}
            widths={widths}
            tableClassName="text-left text-sm"
          >
            <thead className={theadClass}>
              <tr>
                {visibleDataColumns.map((col) => {
                  const sortable = col.sortable && onSort;
                  const sortDir = getSortState?.(col.key) ?? null;
                  const resizable = col.resizable !== false;
                  const headerNode = col.headerContent ?? col.header;
                  const compactTh = isModern && col.compactHeader;

                  return (
                    <th
                      key={col.key}
                      className={`${thClass} ${compactTh ? "px-1.5 text-center" : ""} ${stickyHeaderClass(col.sticky)} ${col.className ?? ""}`.trim()}
                    >
                      <div
                        className={
                          compactTh
                            ? "flex justify-center"
                            : "whitespace-nowrap pr-1"
                        }
                      >
                        {sortable ? (
                          <button
                            type="button"
                            className={`inline-flex max-w-full items-center ${compactTh ? "justify-center" : ""} ${isModern ? "text-slate-400 hover:text-slate-700" : "font-medium hover:text-slate-900"}`}
                            onClick={() => onSort!(col.key)}
                          >
                            <span className={compactTh ? "" : "whitespace-nowrap"}>
                              {headerNode}
                            </span>
                            {!compactTh ? <SortIndicator direction={sortDir} /> : null}
                          </button>
                        ) : (
                          headerNode
                        )}
                      </div>
                      {resizable ? (
                        <ColumnResizeHandle
                          onResizeStart={(clientX) =>
                            startResize(col.key, clientX)
                          }
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleDataColumns.length}
                    className={`${isModern ? "px-4 py-12" : "p-8"} text-center text-slate-500`}
                  >
                    {resolvedEmptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={rowKey(row)}>
                    <tr
                      className={`${rowClass}${onRowClick ? " cursor-pointer" : ""}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onRowClick(row);
                              }
                            }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? "button" : undefined}
                    >
                      {visibleDataColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`${tdClass} ${stickyCellClass(col.sticky)} ${col.className ?? ""}`.trim()}
                          {...(col.key === "actions" ||
                          col.key === "rowMenu" ||
                          col.stopRowClick
                            ? { "data-row-action": true }
                            : {})}
                          onClick={
                            col.key === "actions" ||
                            col.key === "rowMenu" ||
                            col.stopRowClick
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
                          {renderCellContent(col, row)}
                        </td>
                      ))}
                    </tr>
                    {renderRowFooter ? (
                      <tr className={footerRowClass}>
                        <td
                          colSpan={visibleDataColumns.length}
                          className="p-0"
                          data-row-action
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex w-full items-center px-4 py-2">
                            {renderRowFooter(row)}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </ResizableTableShell>
          </>
        )}
      </Card>

      {showPagination && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          {isModern && onPageSizeChange ? (
            <label className="flex items-center gap-2">
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>Einträge pro Seite</span>
            </label>
          ) : (
            <p>
              {total === 0
                ? "Keine Einträge"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} von ${total}`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!isModern && onPageSizeChange && (
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
            {isModern ? (
              <>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => onPageChange!(page - 1)}
                  aria-label="Vorherige Seite"
                >
                  <IconChevronLeft />
                </button>
                {getPageNumbers(page, totalPages).map((pageNumber, index, arr) => {
                  const prev = arr[index - 1];
                  const showEllipsis = prev != null && pageNumber - prev > 1;
                  return (
                    <span key={pageNumber} className="inline-flex items-center gap-2">
                      {showEllipsis ? (
                        <span className="px-1 text-slate-400">…</span>
                      ) : null}
                      <button
                        type="button"
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition ${
                          pageNumber === page
                            ? "border-brand text-brand"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        onClick={() => onPageChange!(pageNumber)}
                        aria-current={pageNumber === page ? "page" : undefined}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange!(page + 1)}
                  aria-label="Nächste Seite"
                >
                  <IconChevronRight />
                </button>
              </>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

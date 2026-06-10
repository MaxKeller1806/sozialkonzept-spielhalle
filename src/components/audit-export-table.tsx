"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { ResizableTableShell, ResizableTh, tableBodyCellClass } from "@/components/resizable-table-parts";
import { Button } from "@/components/ui";
import { useTableColumnWidths } from "@/hooks/use-table-column-widths";
import {
  tableWidthStorageKey,
  type TableColumnLayout,
} from "@/lib/table-column-widths";
import {
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  parseSortDirection,
  parseStatusFilter,
  type ListMeta,
} from "@/lib/list-query";
import type { AuditExportEmployeeRow } from "@/lib/admin-audit-export";
import {
  employmentFilterLabel,
  formatTrainingDate,
  parseEmploymentFilter,
  type EmploymentFilter,
} from "@/lib/training-status";

type CategoryOption = { id: number; name: string };
type LocationOption = { id: number; label: string };

const AUDIT_EXPORT_COLUMNS: TableColumnLayout[] = [
  { key: "select", defaultWidth: 44, minWidth: 44, resizable: false },
  { key: "name", defaultWidth: 180, minWidth: 120 },
  { key: "email", defaultWidth: 200, minWidth: 140 },
  { key: "location", defaultWidth: 120, minWidth: 90 },
  { key: "category", defaultWidth: 140, minWidth: 100 },
  { key: "joined", defaultWidth: 110, minWidth: 90 },
  { key: "left", defaultWidth: 110, minWidth: 90 },
  { key: "certificates", defaultWidth: 88, minWidth: 72 },
  { key: "lastCompleted", defaultWidth: 130, minWidth: 100 },
  { key: "status", defaultWidth: 120, minWidth: 90 },
];

function AuditExportTableInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<AuditExportEmployeeRow[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [includeCertificates, setIncludeCertificates] = useState(true);
  const [includeLearningContent, setIncludeLearningContent] = useState(false);
  const [includeExams, setIncludeExams] = useState(false);
  const [showExamCorrectAnswers, setShowExamCorrectAnswers] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "lastName";
  const sortDirection = parseSortDirection(searchParams.get("sortDirection"));
  const status = parseStatusFilter(searchParams.get("status") ?? "active");
  const categoryId = searchParams.get("categoryId") ?? "";
  const locationId = searchParams.get("locationId") ?? "";
  const employmentFilter = parseEmploymentFilter(
    searchParams.get("employmentFilter")
  );

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search) params.set("search", search);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDirection) params.set("sortDirection", sortDirection);
    if (status !== "all") params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (locationId) params.set("locationId", locationId);
    if (employmentFilter !== "active") {
      params.set("employmentFilter", employmentFilter);
    }
    return params.toString();
  }, [
    page,
    pageSize,
    search,
    sortBy,
    sortDirection,
    status,
    categoryId,
    locationId,
    employmentFilter,
  ]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in patch)) params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    fetch("/api/admin/employee-categories?filter=active")
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => undefined);
    fetch("/api/admin/locations?filter=active")
      .then((r) => (r.ok ? r.json() : { locations: [] }))
      .then((d) =>
        setLocations(
          (d.locations ?? []).map((loc: { id: number; label: string }) => ({
            id: loc.id,
            label: loc.label,
          }))
        )
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/audit-export?${apiQuery}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Laden fehlgeschlagen.");
        return d;
      })
      .then((d) => {
        setRows(d.employees ?? []);
        setMeta(d.meta ?? null);
        setSelected(new Set());
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        setRows([]);
        setMeta(null);
      })
      .finally(() => setLoading(false));
  }, [apiQuery]);

  const visibleIds = rows.map((r) => r.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  const hasExportContent =
    includeCertificates || includeLearningContent || includeExams;

  async function downloadAuditPackage() {
    if (selected.size === 0 || !hasExportContent) return;
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch("/api/admin/audit-export/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [...selected],
          includeCertificates,
          includeLearningContent,
          includeExams,
          showExamCorrectAnswers,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Export fehlgeschlagen.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "Audit-Export.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export fehlgeschlagen.");
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    router.push(pathname);
  }

  const hasActiveFilters =
    !!search ||
    status !== "active" ||
    employmentFilter !== "active" ||
    !!categoryId ||
    !!locationId ||
    page > 1;

  const { visibleColumns, widths, startResize } = useTableColumnWidths(
    tableWidthStorageKey("admin.auditExport"),
    AUDIT_EXPORT_COLUMNS
  );

  return (
    <div>
      <SearchFilterBar
        className="mb-6"
        search={search}
        searchPlaceholder="Name, E-Mail…"
        onSearchChange={(value) =>
          updateParams({ search: value.trim() || null })
        }
        filters={[
          {
            key: "locationId",
            label: "Standort",
            value: locationId,
            options: [
              { value: "", label: "Alle Standorte" },
              ...locations.map((loc) => ({
                value: String(loc.id),
                label: loc.label,
              })),
            ],
            onChange: (value) =>
              updateParams({ locationId: value || null }),
          },
          {
            key: "categoryId",
            label: "Kategorie",
            value: categoryId,
            options: [
              { value: "", label: "Alle Kategorien" },
              ...categories.map((c) => ({
                value: String(c.id),
                label: c.name,
              })),
            ],
            onChange: (value) =>
              updateParams({ categoryId: value || null }),
          },
          {
            key: "employmentFilter",
            label: "Beschäftigung",
            value: employmentFilter,
            options: (["active", "departed", "all"] as EmploymentFilter[]).map(
              (f) => ({
                value: f,
                label: employmentFilterLabel(f),
              })
            ),
            onChange: (value) =>
              updateParams({
                employmentFilter: value === "active" ? null : value,
              }),
          },
        ]}
        statusFilter={status}
        statusLabel="Konto"
        statusOptions={[
          { value: "active", label: "Aktiv" },
          { value: "archived", label: "Inaktiv" },
          { value: "all", label: "Alle" },
        ]}
        onStatusChange={(value) =>
          updateParams({ status: value === "all" ? null : value })
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-sm font-semibold text-slate-800">Exportoptionen</p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeCertificates}
              onChange={(e) => setIncludeCertificates(e.target.checked)}
              className="rounded border-slate-300"
            />
            Zertifikate/Nachweise exportieren
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeLearningContent}
              onChange={(e) => setIncludeLearningContent(e.target.checked)}
              className="rounded border-slate-300"
            />
            Lerninhalte der Seminare exportieren
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeExams}
              onChange={(e) => {
                setIncludeExams(e.target.checked);
                if (!e.target.checked) setShowExamCorrectAnswers(false);
              }}
              className="rounded border-slate-300"
            />
            Abschlusstests / Prüfungsfragen exportieren
          </label>
          {includeExams && (
            <label className="ml-6 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showExamCorrectAnswers}
                onChange={(e) => setShowExamCorrectAnswers(e.target.checked)}
                className="rounded border-slate-300"
              />
              Richtige Antworten im Abschlusstest-Export anzeigen
            </label>
          )}
        </div>
        {!hasExportContent && (
          <p className="mt-3 text-sm text-amber-800">
            Bitte wählen Sie mindestens einen Exportinhalt aus.
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={selected.size === 0 || !hasExportContent || exporting}
          onClick={() => void downloadAuditPackage()}
        >
          {exporting ? "Erstelle Paket…" : "Audit-Paket herunterladen"}
        </Button>
        <span className="text-sm text-slate-600">
          {selected.size} ausgewählt
          {selected.size > 0 && ` (max. 100 pro Export)`}
        </span>
      </div>

      {exportError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {exportError}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Lädt…</p>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
          <ResizableTableShell columns={visibleColumns} widths={widths} tableClassName="text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <ResizableTh col={visibleColumns[0]} onResizeStart={startResize}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Alle sichtbaren auswählen"
                  />
                </ResizableTh>
                <ResizableTh col={visibleColumns[1]} onResizeStart={startResize}>
                  Name
                </ResizableTh>
                <ResizableTh col={visibleColumns[2]} onResizeStart={startResize}>
                  E-Mail
                </ResizableTh>
                <ResizableTh col={visibleColumns[3]} onResizeStart={startResize}>
                  Standort
                </ResizableTh>
                <ResizableTh col={visibleColumns[4]} onResizeStart={startResize}>
                  Kategorie
                </ResizableTh>
                <ResizableTh col={visibleColumns[5]} onResizeStart={startResize}>
                  Eintritt
                </ResizableTh>
                <ResizableTh col={visibleColumns[6]} onResizeStart={startResize}>
                  Austritt
                </ResizableTh>
                <ResizableTh col={visibleColumns[7]} onResizeStart={startResize}>
                  Nachweise
                </ResizableTh>
                <ResizableTh col={visibleColumns[8]} onResizeStart={startResize}>
                  Letzter Abschluss
                </ResizableTh>
                <ResizableTh col={visibleColumns[9]} onResizeStart={startResize}>
                  Status
                </ResizableTh>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-slate-500">
                    Keine Mitarbeiter gefunden.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const nameLabel = `${row.lastName}, ${row.firstName}`;
                  return (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className={`${tableBodyCellClass(undefined, "px-3 py-2")} !overflow-visible`}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`${row.firstName} ${row.lastName} auswählen`}
                        />
                      </td>
                      <td
                        className={`${tableBodyCellClass(undefined, "px-3 py-2 font-medium")}`}
                        title={nameLabel}
                      >
                        {nameLabel}
                      </td>
                      <td
                        className={tableBodyCellClass(undefined, "px-3 py-2")}
                        title={row.email}
                      >
                        {row.email}
                      </td>
                      <td
                        className={tableBodyCellClass(undefined, "px-3 py-2")}
                        title={row.locationLabel ?? undefined}
                      >
                        {row.locationLabel ?? "—"}
                      </td>
                      <td
                        className={tableBodyCellClass(undefined, "px-3 py-2")}
                        title={row.employeeCategoryName ?? undefined}
                      >
                        {row.employeeCategoryName ?? "—"}
                      </td>
                      <td className={tableBodyCellClass(undefined, "px-3 py-2")}>
                        {formatTrainingDate(row.joinedCompanyAt)}
                      </td>
                      <td className={tableBodyCellClass(undefined, "px-3 py-2")}>
                        {formatTrainingDate(row.leftCompanyAt)}
                      </td>
                      <td className={tableBodyCellClass(undefined, "px-3 py-2")}>
                        {row.certificateCount}
                      </td>
                      <td className={tableBodyCellClass(undefined, "px-3 py-2")}>
                        {formatTrainingDate(row.lastCompletedAt)}
                      </td>
                      <td
                        className={tableBodyCellClass(undefined, "px-3 py-2")}
                        title={row.statusLabel}
                      >
                        {row.statusLabel}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ResizableTableShell>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            Zurück
          </Button>
          <span>
            Seite {meta.page} von {meta.totalPages} ({meta.total} Mitarbeiter)
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Weiter
          </Button>
          <select
            value={pageSize}
            onChange={(e) =>
              updateParams({ pageSize: e.target.value, page: "1" })
            }
            className="rounded-lg border border-slate-300 px-2 py-1"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} pro Seite
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function AuditExportTable() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
      <AuditExportTableInner />
    </Suspense>
  );
}

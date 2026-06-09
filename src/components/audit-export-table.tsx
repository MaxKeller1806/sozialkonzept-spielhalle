"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui";
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Suche</span>
          <input
            type="search"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({
                  search: (e.target as HTMLInputElement).value.trim() || null,
                });
              }
            }}
            placeholder="Name, E-Mail…"
            className="mt-1 block min-w-[200px] rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Standort</span>
          <select
            value={locationId}
            onChange={(e) => updateParams({ locationId: e.target.value || null })}
            className="mt-1 block min-w-[160px] rounded-xl border border-slate-300 px-3 py-2"
          >
            <option value="">Alle</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Kategorie</span>
          <select
            value={categoryId}
            onChange={(e) => updateParams({ categoryId: e.target.value || null })}
            className="mt-1 block min-w-[160px] rounded-xl border border-slate-300 px-3 py-2"
          >
            <option value="">Alle</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Beschäftigung</span>
          <select
            value={employmentFilter}
            onChange={(e) =>
              updateParams({
                employmentFilter:
                  e.target.value === "active" ? null : e.target.value,
              })
            }
            className="mt-1 block min-w-[160px] rounded-xl border border-slate-300 px-3 py-2"
          >
            {(["active", "departed", "all"] as EmploymentFilter[]).map((f) => (
              <option key={f} value={f}>
                {employmentFilterLabel(f)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Konto</span>
          <select
            value={status}
            onChange={(e) =>
              updateParams({
                status: e.target.value === "all" ? null : e.target.value,
              })
            }
            className="mt-1 block min-w-[140px] rounded-xl border border-slate-300 px-3 py-2"
          >
            <option value="active">Aktiv</option>
            <option value="archived">Inaktiv</option>
            <option value="all">Alle</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={resetFilters}>
          Filter zurücksetzen
        </Button>
      </div>

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
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Alle sichtbaren auswählen"
                  />
                </th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">E-Mail</th>
                <th className="px-3 py-2">Standort</th>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2">Eintritt</th>
                <th className="px-3 py-2">Austritt</th>
                <th className="px-3 py-2">Nachweise</th>
                <th className="px-3 py-2">Letzter Abschluss</th>
                <th className="px-3 py-2">Status</th>
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
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`${row.firstName} ${row.lastName} auswählen`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {row.lastName}, {row.firstName}
                    </td>
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.locationLabel ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.employeeCategoryName ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatTrainingDate(row.joinedCompanyAt)}
                    </td>
                    <td className="px-3 py-2">
                      {formatTrainingDate(row.leftCompanyAt)}
                    </td>
                    <td className="px-3 py-2">{row.certificateCount}</td>
                    <td className="px-3 py-2">
                      {formatTrainingDate(row.lastCompletedAt)}
                    </td>
                    <td className="px-3 py-2">{row.statusLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

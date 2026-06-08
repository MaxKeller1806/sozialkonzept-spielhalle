"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import {
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  parseSortDirection,
  parseStatusFilter,
} from "@/lib/list-query";
import type {
  AdminPrivacyStatusEmployee,
  PrivacyStatusStats,
} from "@/lib/admin-privacy-status-list";
import type { ListMeta } from "@/lib/list-query";
import {
  employmentFilterLabel,
  formatPrivacyDate,
  parseEmploymentFilter,
  parsePrivacyStatusFilter,
  privacyStatusBadgeClass,
  privacyStatusFilterLabel,
  privacyStatusLabel,
  type EmploymentFilter,
  type PrivacyStatusFilter,
} from "@/lib/privacy-status";

type CategoryOption = { id: number; name: string };

function PrivacyStatusTableInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<AdminPrivacyStatusEmployee[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [stats, setStats] = useState<PrivacyStatusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const page = Math.max(
    1,
    parseInt(searchParams.get("page") ?? "1", 10) || 1
  );
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "lastName";
  const sortDirection = parseSortDirection(searchParams.get("sortDirection"));
  const status = parseStatusFilter(searchParams.get("status") ?? "active");
  const categoryId = searchParams.get("categoryId") ?? "";
  const privacyFilter = parsePrivacyStatusFilter(
    searchParams.get("privacyFilter")
  );
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
    if (privacyFilter !== "all") params.set("privacyFilter", privacyFilter);
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
    privacyFilter,
    employmentFilter,
  ]);

  const hasActiveFilters =
    !!search ||
    status !== "active" ||
    employmentFilter !== "active" ||
    privacyFilter !== "all" ||
    !!categoryId ||
    page > 1 ||
    !!searchParams.get("sortBy");

  const replaceParams = useCallback(
    (updates: Record<string, string | null>, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  useEffect(() => {
    fetch("/api/admin/employee-categories?filter=active")
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) =>
        setCategories(
          (d.categories ?? []).map((c: CategoryOption) => ({
            id: c.id,
            name: c.name,
          }))
        )
      );
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/privacy-status?${apiQuery}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          window.location.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.error) {
          setError(d.error);
          return;
        }
        setRows(d.employees ?? []);
        setMeta(d.meta ?? null);
        setStats(d.stats ?? null);
      })
      .catch(() => setError("Laden fehlgeschlagen."))
      .finally(() => setLoading(false));
  }, [apiQuery]);

  function toggleSort(column: string) {
    const nextDir =
      sortBy === column && sortDirection === "asc" ? "desc" : "asc";
    replaceParams(
      {
        sortBy: column,
        sortDirection: nextDir,
      },
      true
    );
  }

  function sortIndicator(column: string) {
    if (sortBy !== column) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  const total = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Mitarbeiter aktiv gesamt" value={stats.activeTotal} />
            <StatCard
              label="Datenschutz bestätigt"
              value={stats.accepted}
              accent="green"
            />
            <StatCard
              label="Datenschutz offen"
              value={stats.open}
              accent="orange"
            />
            <StatCard label="Ausgeschieden" value={stats.departed} accent="gray" />
          </div>
          {stats.currentVersion && (
            <p className="text-sm text-slate-600">
              Aktuelle Datenschutzversion:{" "}
              <span className="font-medium">{stats.currentVersion}</span>
            </p>
          )}
          {stats.openActiveCount > 0 && (
            <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              Es gibt {stats.openActiveCount} aktive Mitarbeiter ohne bestätigte
              Datenschutzerklärung.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="sr-only">Suche</span>
          <input
            type="search"
            placeholder="Vorname, Nachname oder E-Mail…"
            defaultValue={search}
            className="focus-brand w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                replaceParams(
                  { search: (e.target as HTMLInputElement).value || null },
                  true
                );
              }
            }}
          />
        </label>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={privacyFilter}
          onChange={(e) =>
            replaceParams(
              {
                privacyFilter:
                  e.target.value === "all" ? null : e.target.value,
              },
              true
            )
          }
          aria-label="Datenschutzstatus"
        >
          {(["all", "accepted", "open", "departed"] as PrivacyStatusFilter[]).map(
            (f) => (
              <option key={f} value={f}>
                {privacyStatusFilterLabel(f)}
              </option>
            )
          )}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={categoryId}
          onChange={(e) =>
            replaceParams({ categoryId: e.target.value || null }, true)
          }
          aria-label="Mitarbeiterkategorie"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={employmentFilter}
          onChange={(e) =>
            replaceParams(
              {
                employmentFilter:
                  e.target.value === "active" ? null : e.target.value,
              },
              true
            )
          }
          aria-label="Beschäftigungsstatus"
        >
          {(["active", "departed", "all"] as EmploymentFilter[]).map((f) => (
            <option key={f} value={f}>
              {employmentFilterLabel(f)}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="secondary"
            className="!w-auto"
            onClick={resetFilters}
          >
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Lädt Datenschutzstatus…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          {hasActiveFilters
            ? "Keine Treffer für die aktuelle Suche oder Filter."
            : "Keine Mitarbeiter gefunden."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">
                  <button
                    type="button"
                    className="font-semibold hover:text-brand"
                    onClick={() => toggleSort("lastName")}
                  >
                    Mitarbeiter{sortIndicator("lastName")}
                  </button>
                </th>
                <th className="p-3">Kategorie</th>
                <th className="p-3">
                  <button
                    type="button"
                    className="font-semibold hover:text-brand"
                    onClick={() => toggleSort("joinedCompanyAt")}
                  >
                    Eintritt{sortIndicator("joinedCompanyAt")}
                  </button>
                </th>
                <th className="p-3">
                  <button
                    type="button"
                    className="font-semibold hover:text-brand"
                    onClick={() => toggleSort("leftCompanyAt")}
                  >
                    Austritt{sortIndicator("leftCompanyAt")}
                  </button>
                </th>
                <th className="p-3">
                  <button
                    type="button"
                    className="font-semibold hover:text-brand"
                    onClick={() => toggleSort("privacyStatus")}
                  >
                    Datenschutz{sortIndicator("privacyStatus")}
                  </button>
                </th>
                <th className="p-3">
                  <button
                    type="button"
                    className="font-semibold hover:text-brand"
                    onClick={() => toggleSort("acceptedAt")}
                  >
                    Bestätigt am{sortIndicator("acceptedAt")}
                  </button>
                </th>
                <th className="p-3">Version</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => (
                <tr key={employee.id} className="border-b last:border-0">
                  <td className="p-3">
                    <span className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </span>
                    <br />
                    <span className="text-slate-500">{employee.email}</span>
                  </td>
                  <td className="p-3">
                    {employee.employeeCategoryName ?? "—"}
                  </td>
                  <td className="p-3">
                    {formatPrivacyDate(employee.joinedCompanyAt)}
                  </td>
                  <td className="p-3">
                    {formatPrivacyDate(employee.leftCompanyAt)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${privacyStatusBadgeClass(employee.statusKey)}`}
                    >
                      {privacyStatusLabel(employee.statusKey)}
                    </span>
                  </td>
                  <td className="p-3">
                    {employee.statusKey === "departed"
                      ? "—"
                      : formatPrivacyDate(employee.acceptedAt)}
                  </td>
                  <td className="p-3">
                    {employee.acceptedVersion ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-slate-600">
            {total} Mitarbeiter · Seite {page} von {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Pro Seite</span>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1"
                value={pageSize}
                onChange={(e) =>
                  replaceParams({ pageSize: e.target.value, page: null }, true)
                }
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="secondary"
              className="!w-auto"
              disabled={page <= 1}
              onClick={() => replaceParams({ page: String(page - 1) })}
            >
              Zurück
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!w-auto"
              disabled={page >= totalPages}
              onClick={() => replaceParams({ page: String(page + 1) })}
            >
              Weiter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "orange" | "gray";
}) {
  const valueClass =
    accent === "green"
      ? "text-green-700"
      : accent === "orange"
        ? "text-orange-700"
        : accent === "gray"
          ? "text-slate-600"
          : "text-slate-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function PrivacyStatusTable() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
      <PrivacyStatusTableInner />
    </Suspense>
  );
}

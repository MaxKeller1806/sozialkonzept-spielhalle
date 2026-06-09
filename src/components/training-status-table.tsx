"use client";

import Link from "next/link";
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
  AdminTrainingStatusEmployee,
  EmployeeCourseTrainingRow,
} from "@/lib/admin-training-status-list";
import type { ListMeta } from "@/lib/list-query";
import {
  employmentFilterLabel,
  formatTrainingDate,
  parseEmploymentFilter,
  parseTrainingStatusFilter,
  trainingStatusBadgeClass,
  trainingStatusFilterLabel,
  type EmploymentFilter,
  type TrainingStatusFilter,
} from "@/lib/training-status";

type CategoryOption = { id: number; name: string };
type LocationOption = { id: number; label: string };

function TrainingStatusTableInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<AdminTrainingStatusEmployee[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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
  const locationId = searchParams.get("locationId") ?? "";
  const trainingFilter = parseTrainingStatusFilter(
    searchParams.get("trainingFilter")
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
    if (locationId) params.set("locationId", locationId);
    if (trainingFilter !== "all") params.set("trainingFilter", trainingFilter);
    if (employmentFilter !== "active") {
      params.set("employmentFilter", employmentFilter);
    }
    return params.toString();
  }, [page, pageSize, search, sortBy, sortDirection, status, categoryId, locationId, trainingFilter, employmentFilter]);

  const hasActiveFilters =
    !!search ||
    status !== "active" ||
    employmentFilter !== "active" ||
    !!categoryId ||
    !!locationId ||
    trainingFilter !== "all" ||
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
    fetch("/api/admin/locations?filter=active")
      .then((r) => (r.ok ? r.json() : { locations: [] }))
      .then((d) =>
        setLocations(
          (d.locations ?? []).map((loc: { id: number; label: string }) => ({
            id: loc.id,
            label: loc.label,
          }))
        )
      );
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/training-status?${apiQuery}`)
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
      })
      .catch(() => setError("Laden fehlgeschlagen."))
      .finally(() => setLoading(false));
  }, [apiQuery]);

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      <div className="flex flex-wrap gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="sr-only">Suche</span>
          <input
            type="search"
            placeholder="Mitarbeiter, E-Mail oder Seminar…"
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
          value={categoryId}
          onChange={(e) =>
            replaceParams({ categoryId: e.target.value || null }, true)
          }
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
          value={locationId}
          onChange={(e) =>
            replaceParams({ locationId: e.target.value || null }, true)
          }
          aria-label="Standort"
        >
          <option value="">Alle Standorte</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={trainingFilter}
          onChange={(e) =>
            replaceParams(
              {
                trainingFilter:
                  e.target.value === "all" ? null : e.target.value,
              },
              true
            )
          }
        >
            {(
              [
                "all",
                "expired",
                "due_soon",
                "not_started",
                "valid",
                "unlimited_valid",
                "in_progress",
                "failed",
              ] as TrainingStatusFilter[]
            ).map((f) => (
            <option key={f} value={f}>
              {trainingStatusFilterLabel(f)}
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
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) =>
            replaceParams({ status: e.target.value === "all" ? null : e.target.value }, true)
          }
        >
          <option value="active">Aktive Mitarbeiter</option>
          <option value="archived">Archivierte</option>
          <option value="all">Alle</option>
        </select>
        {hasActiveFilters && (
          <Button type="button" variant="secondary" className="!w-auto" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Lädt Schulungsstatus…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          {hasActiveFilters
            ? "Keine Treffer für die aktuelle Suche oder Filter."
            : "Keine Mitarbeiter gefunden."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="w-10 p-3" />
                <th className="p-3">
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("lastName")}>
                    Mitarbeiter{sortIndicator("lastName")}
                  </button>
                </th>
                <th className="p-3">Kategorie</th>
                <th className="p-3">Standort</th>
                <th className="p-3">
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("joinedCompanyAt")}>
                    Eintritt{sortIndicator("joinedCompanyAt")}
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("courseCount")}>
                    Schulungen{sortIndicator("courseCount")}
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("expiredCount")}>
                    Abgelaufen{sortIndicator("expiredCount")}
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("dueSoonCount")}>
                    Bald fällig{sortIndicator("dueSoonCount")}
                  </button>
                </th>
                <th className="p-3">
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("nextDueAt")}>
                    Nächste Fälligkeit{sortIndicator("nextDueAt")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  expanded={expandedIds.has(employee.id)}
                  onToggle={() => toggleExpanded(employee.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Seite {page} von {totalPages} ({total} Mitarbeiter)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-300 px-2 py-1"
              value={pageSize}
              onChange={(e) =>
                replaceParams({ pageSize: e.target.value, page: "1" })
              }
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / Seite
                </option>
              ))}
            </select>
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

function EmployeeRow({
  employee,
  expanded,
  onToggle,
}: {
  employee: AdminTrainingStatusEmployee;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { summary } = employee;

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-slate-50">
        <td className="p-3">
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-200"
            aria-expanded={expanded}
            aria-label={expanded ? "Details schließen" : "Details öffnen"}
            onClick={onToggle}
          >
            {expanded ? "▼" : "▶"}
          </button>
        </td>
        <td className="p-3">
          <span className="font-medium">
            {employee.firstName} {employee.lastName}
          </span>
          <br />
          <span className="text-slate-500">{employee.email}</span>
        </td>
        <td className="p-3">{employee.employeeCategoryName ?? "—"}</td>
        <td className="p-3">{employee.locationLabel ?? "—"}</td>
        <td className="p-3">{formatTrainingDate(employee.joinedCompanyAt)}</td>
        <td className="p-3">{summary.courseCount}</td>
        <td className="p-3">
          {summary.expiredCount > 0 ? (
            <span className="font-medium text-red-700">{summary.expiredCount}</span>
          ) : (
            "0"
          )}
        </td>
        <td className="p-3">
          {summary.dueSoonCount > 0 ? (
            <span className="font-medium text-amber-700">{summary.dueSoonCount}</span>
          ) : (
            "0"
          )}
        </td>
        <td className="p-3">{formatTrainingDate(summary.nextDueAt)}</td>
      </tr>
      {expanded && (
        <tr className="border-b bg-slate-50/80">
          <td colSpan={8} className="p-4">
            {employee.courses.length === 0 ? (
              <p className="text-sm text-slate-600">Keine zugewiesenen Schulungen.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Seminar</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Bestanden am</th>
                      <th className="p-3">Gültig bis</th>
                      <th className="p-3">Wiederholung fällig</th>
                      <th className="p-3">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employee.courses.map((course) => (
                      <CourseRow key={course.courseId} course={course} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CourseRow({ course }: { course: EmployeeCourseTrainingRow }) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-3">
        <span className="font-medium">{course.courseTitle}</span>
        {course.instructionCode && (
          <span className="ml-2 text-xs text-slate-500">{course.instructionCode}</span>
        )}
        <br />
        <span className="text-xs text-slate-500">{course.validityLabel}</span>
      </td>
      <td className="p-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${trainingStatusBadgeClass(course.statusColor)}`}
        >
          {course.statusLabel}
        </span>
      </td>
      <td className="p-3">{formatTrainingDate(course.completedAt)}</td>
      <td className="p-3">{course.validUntilLabel}</td>
      <td className="p-3">{formatTrainingDate(course.nextDueAt)}</td>
      <td className="p-3">
        <div className="flex flex-col gap-1">
          {course.pdfUrl && (
            <a
              href={course.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              Zertifikat
            </a>
          )}
          <Link href="/dashboard" className="text-brand hover:underline">
            Mitarbeiter bearbeiten
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function TrainingStatusTable() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
      <TrainingStatusTableInner />
    </Suspense>
  );
}

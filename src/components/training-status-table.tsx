"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { CourseTitleDisplay } from "@/components/course-title-display";
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
  countPendingTrainings,
  trainingStatusBadgeClass,
  trainingStatusFilterLabel,
  type EmploymentFilter,
  type TrainingStatusFilter,
} from "@/lib/training-status";

type CategoryOption = { id: number; name: string };
type LocationOption = { id: number; label: string };

const TRAINING_STATUS_COLUMNS: TableColumnLayout[] = [
  { key: "expand", defaultWidth: 44, minWidth: 44, resizable: false },
  { key: "employee", defaultWidth: 200, minWidth: 140 },
  { key: "category", defaultWidth: 140, minWidth: 100 },
  { key: "location", defaultWidth: 120, minWidth: 90 },
  { key: "joined", defaultWidth: 110, minWidth: 90 },
  { key: "courses", defaultWidth: 88, minWidth: 72 },
  { key: "expired", defaultWidth: 88, minWidth: 72 },
  { key: "dueSoon", defaultWidth: 88, minWidth: 72 },
  { key: "nextDue", defaultWidth: 130, minWidth: 100 },
];

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

  const { visibleColumns, widths, startResize } = useTableColumnWidths(
    tableWidthStorageKey("admin.trainingStatus"),
    TRAINING_STATUS_COLUMNS
  );

  return (
    <div className="space-y-4">
      <SearchFilterBar
        search={search}
        searchPlaceholder="Mitarbeiter, E-Mail oder Seminar…"
        onSearchChange={(value) =>
          replaceParams({ search: value.trim() || null }, true)
        }
        filters={[
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
              replaceParams({ categoryId: value || null }, true),
          },
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
              replaceParams({ locationId: value || null }, true),
          },
          {
            key: "trainingFilter",
            label: "Schulungsstatus",
            value: trainingFilter,
            options: (
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
            ).map((f) => ({
              value: f,
              label: trainingStatusFilterLabel(f),
            })),
            onChange: (value) =>
              replaceParams(
                { trainingFilter: value === "all" ? null : value },
                true
              ),
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
              replaceParams(
                {
                  employmentFilter: value === "active" ? null : value,
                },
                true
              ),
          },
        ]}
        statusFilter={status}
        statusLabel="Konto"
        statusOptions={[
          { value: "active", label: "Aktive Mitarbeiter" },
          { value: "archived", label: "Archivierte" },
          { value: "all", label: "Alle" },
        ]}
        onStatusChange={(value) =>
          replaceParams({ status: value === "all" ? null : value }, true)
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
      />

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
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ResizableTableShell
            columns={visibleColumns}
            widths={widths}
            tableClassName="text-left text-sm"
          >
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <ResizableTh col={visibleColumns[0]} onResizeStart={startResize}>
                  <span className="sr-only">Details</span>
                </ResizableTh>
                <ResizableTh col={visibleColumns[1]} onResizeStart={startResize}>
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("lastName")}>
                    Mitarbeiter{sortIndicator("lastName")}
                  </button>
                </ResizableTh>
                <ResizableTh col={visibleColumns[2]} onResizeStart={startResize}>
                  Kategorie
                </ResizableTh>
                <ResizableTh col={visibleColumns[3]} onResizeStart={startResize}>
                  Standort
                </ResizableTh>
                <ResizableTh col={visibleColumns[4]} onResizeStart={startResize}>
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("joinedCompanyAt")}>
                    Eintritt{sortIndicator("joinedCompanyAt")}
                  </button>
                </ResizableTh>
                <ResizableTh col={visibleColumns[5]} onResizeStart={startResize}>
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("courseCount")}>
                    Schulungen{sortIndicator("courseCount")}
                  </button>
                </ResizableTh>
                <ResizableTh col={visibleColumns[6]} onResizeStart={startResize}>
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("expiredCount")}>
                    Abgelaufen{sortIndicator("expiredCount")}
                  </button>
                </ResizableTh>
                <ResizableTh col={visibleColumns[7]} onResizeStart={startResize}>
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("dueSoonCount")}>
                    Bald fällig{sortIndicator("dueSoonCount")}
                  </button>
                </ResizableTh>
                <ResizableTh col={visibleColumns[8]} onResizeStart={startResize}>
                  <button type="button" className="font-semibold hover:text-brand" onClick={() => toggleSort("nextDueAt")}>
                    Nächste Fälligkeit{sortIndicator("nextDueAt")}
                  </button>
                </ResizableTh>
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
          </ResizableTableShell>
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

function CourseCountCell({ summary }: { summary: AdminTrainingStatusEmployee["summary"] }) {
  const pending = countPendingTrainings(summary);
  const title =
    pending > 0
      ? `${summary.courseCount} Schulungen gesamt, ${pending} noch zu absolvieren`
      : `${summary.courseCount} Schulungen, alle erledigt oder gültig`;

  return (
    <span title={title}>
      {summary.courseCount}
      {pending > 0 ? (
        <>
          <span className="text-slate-400">/</span>
          <span className="font-medium text-red-700">{pending}</span>
        </>
      ) : null}
    </span>
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
  const employeeTitle = `${employee.firstName} ${employee.lastName} · ${employee.email}`;

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-slate-50">
        <td className={`${tableBodyCellClass()} !overflow-visible`}>
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
        <td className={tableBodyCellClass()} title={employeeTitle}>
          <div className="truncate font-medium">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="truncate text-slate-500">{employee.email}</div>
        </td>
        <td
          className={tableBodyCellClass()}
          title={employee.employeeCategoryName ?? undefined}
        >
          {employee.employeeCategoryName ?? "—"}
        </td>
        <td
          className={tableBodyCellClass()}
          title={employee.locationLabel ?? undefined}
        >
          {employee.locationLabel ?? "—"}
        </td>
        <td className={tableBodyCellClass()}>
          {formatTrainingDate(employee.joinedCompanyAt)}
        </td>
        <td className={tableBodyCellClass()}>
          <CourseCountCell summary={summary} />
        </td>
        <td className={tableBodyCellClass()}>
          {summary.expiredCount > 0 ? (
            <span className="font-medium text-red-700">{summary.expiredCount}</span>
          ) : (
            "0"
          )}
        </td>
        <td className={tableBodyCellClass()}>
          {summary.dueSoonCount > 0 ? (
            <span className="font-medium text-amber-700">{summary.dueSoonCount}</span>
          ) : (
            "0"
          )}
        </td>
        <td className={tableBodyCellClass()}>
          {formatTrainingDate(summary.nextDueAt)}
        </td>
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
        <CourseTitleDisplay
          code={course.instructionCode}
          title={course.courseTitle}
          className="font-medium"
          badgeClassName="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600"
        />
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

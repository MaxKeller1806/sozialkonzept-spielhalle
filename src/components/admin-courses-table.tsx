"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { useAdminList } from "@/hooks/use-admin-list";
import { formatEstimatedDuration } from "@/lib/course-duration";
import type { ValidityType } from "@/lib/course-validity";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  active: boolean;
  validityType: ValidityType;
  validityLabel: string;
  estimatedDurationMinutes?: number | null;
  permissions?: {
    canArchive?: boolean;
    canReactivate?: boolean;
    fromMaster?: boolean;
  };
};

type Props = {
  onDelete: (course: CourseRow) => void;
  onReactivate: (course: CourseRow) => void;
  refreshKey?: number;
};

function AdminCoursesTableInner({ onDelete, onReactivate, refreshKey = 0 }: Props) {
  const {
    rows,
    meta,
    loading,
    error,
    reload,
    state,
    setSearch,
    setStatus,
    setPage,
    setPageSize,
    toggleSort,
    getSortState,
    hasActiveFilters,
    resetFilters,
  } = useAdminList<CourseRow>({
    apiPath: "/api/admin/courses",
    dataKey: "courses",
    defaultSortBy: "title",
    defaultSortDirection: "asc",
    defaultStatus: "active",
    onUnauthorized: () => window.location.replace("/login"),
  });

  useEffect(() => {
    if (refreshKey > 0) reload();
  }, [refreshKey, reload]);

  const columns: AdminTableColumn<CourseRow>[] = [
    {
      key: "title",
      header: "Seminar",
      sortable: true,
      render: (c) => (
        <>
          <span className="font-medium">{c.title}</span>
          {!c.active && (
            <span className="ml-2 text-xs text-amber-700">(archiviert)</span>
          )}
          {c.permissions?.fromMaster ? (
            <span className="ml-2 text-xs text-slate-500">(Master)</span>
          ) : null}
        </>
      ),
    },
    {
      key: "slug",
      header: "Kurzname",
      sortable: true,
      render: (c) => c.slug,
    },
    {
      key: "validityLabel",
      header: "Gültigkeit",
      render: (c) => c.validityLabel,
    },
    {
      key: "estimatedDurationMinutes",
      header: "Dauer",
      render: (c) => formatEstimatedDuration(c.estimatedDurationMinutes),
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (c) => (c.active ? "Aktiv" : "Archiviert"),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (c) => (
        <div className="flex flex-col gap-2">
          <Link
            href={`/dashboard/seminare/${encodeURIComponent(c.id)}/inhalte`}
            className="text-brand hover:underline"
          >
            Inhalte bearbeiten
          </Link>
          <Link
            href={`/dashboard/seminare/${encodeURIComponent(c.id)}`}
            className="text-brand hover:underline"
          >
            Einstellungen
          </Link>
          {(c.active
            ? c.permissions?.canArchive !== false
            : c.permissions?.canReactivate ||
              c.permissions?.canArchive !== false) ? (
            <button
              type="button"
              onClick={() => onDelete(c)}
              className="text-left text-red-700 hover:underline"
            >
              Löschen
            </button>
          ) : null}
          {!c.active && c.permissions?.canReactivate ? (
            <button
              type="button"
              onClick={() => onReactivate(c)}
              className="text-left text-slate-600 hover:underline"
            >
              Reaktivieren
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      rowKey={(c) => c.id}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyMessage="Noch keine Seminare angelegt."
      search={state.search}
      searchPlaceholder="Seminar oder Kurzname…"
      onSearchChange={setSearch}
      statusFilter={state.status}
      onStatusChange={setStatus}
      page={meta?.page ?? state.page}
      pageSize={meta?.pageSize ?? state.pageSize}
      totalCount={meta?.total}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSort={toggleSort}
      getSortState={getSortState}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={resetFilters}
      minWidth="640px"
    />
  );
}

export function AdminCoursesTable(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt Seminare…</p>}>
      <AdminCoursesTableInner {...props} />
    </Suspense>
  );
}

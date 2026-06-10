"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { useAdminList } from "@/hooks/use-admin-list";

type MasterCourseRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  validityLabel?: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  onDelete: (course: MasterCourseRow) => void;
  onReactivate: (course: MasterCourseRow) => void;
  refreshKey?: number;
};

function formatMasterStatus(status: string): string {
  if (status === "disabled") return "Deaktiviert";
  if (status === "published") return "Veröffentlicht";
  if (status === "active") return "Aktiv";
  return status;
}

function MasterCoursesTableInner({
  onDelete,
  onReactivate,
  refreshKey = 0,
}: Props) {
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
  } = useAdminList<MasterCourseRow>({
    apiPath: "/api/superuser/master-courses",
    dataKey: "courses",
    defaultSortBy: "title",
    defaultSortDirection: "asc",
    defaultStatus: "active",
    onUnauthorized: () => window.location.replace("/certiano/login"),
  });

  useEffect(() => {
    if (refreshKey > 0) reload();
  }, [refreshKey, reload]);

  const columns: AdminTableColumn<MasterCourseRow>[] = [
    {
      key: "title",
      header: "Titel",
      sortable: true,
      defaultWidth: 240,
      minWidth: 140,
      truncate: true,
      getCellTitle: (c) => c.title,
      render: (c) => (
        <>
          <span className="font-medium">{c.title}</span>
          {c.description ? (
            <p className="text-xs text-slate-500">{c.description}</p>
          ) : null}
        </>
      ),
    },
    {
      key: "validityLabel",
      header: "Gültigkeit",
      defaultWidth: 120,
      render: (c) => c.validityLabel ?? "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      defaultWidth: 100,
      render: (c) => formatMasterStatus(c.status),
    },
    {
      key: "createdAt",
      header: "Erstellt",
      sortable: true,
      defaultWidth: 110,
      render: (c) => new Date(c.createdAt).toLocaleDateString("de-DE"),
    },
    {
      key: "updatedAt",
      header: "Aktualisiert",
      sortable: true,
      defaultWidth: 110,
      render: (c) => new Date(c.updatedAt).toLocaleDateString("de-DE"),
    },
    {
      key: "actions",
      header: "Aktionen",
      defaultWidth: 120,
      resizable: false,
      sticky: "right",
      render: (c) => (
        <div className="flex flex-col gap-2">
          <Link
            href={`/certiano/master-courses/${encodeURIComponent(c.id)}`}
            className="text-brand hover:underline"
          >
            Bearbeiten
          </Link>
          <button
            type="button"
            onClick={() => onDelete(c)}
            className="text-left text-red-700 hover:underline"
          >
            Löschen
          </button>
          {c.status === "disabled" ? (
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
      appearance="modern"
      storageKey="superuser.masterCourses"
      columns={columns}
      rows={rows}
      rowKey={(c) => c.id}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyMessage="Noch keine Masterkurse vorhanden."
      search={state.search}
      searchPlaceholder="Masterkurs suchen…"
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
    />
  );
}

export function MasterCoursesTable(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt Masterkurse…</p>}>
      <MasterCoursesTableInner {...props} />
    </Suspense>
  );
}

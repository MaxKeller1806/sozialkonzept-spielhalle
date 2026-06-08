"use client";

import { Suspense, useEffect } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { useAdminList } from "@/hooks/use-admin-list";
import { formatDurationSummary } from "@/lib/course-duration";

export type EmployeeCategoryRow = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  courseCount: number;
  totalDurationMinutes: number;
  durationLabel?: string;
};

type Props = {
  onEdit: (cat: EmployeeCategoryRow) => void;
  onToggleActive: (cat: EmployeeCategoryRow) => void;
  refreshKey?: number;
};

function EmployeeCategoriesTableInner({
  onEdit,
  onToggleActive,
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
  } = useAdminList<EmployeeCategoryRow>({
    apiPath: "/api/admin/employee-categories",
    dataKey: "categories",
    defaultSortBy: "name",
    defaultSortDirection: "asc",
    defaultStatus: "active",
    onUnauthorized: () => window.location.replace("/login"),
  });

  useEffect(() => {
    if (refreshKey > 0) reload();
  }, [refreshKey, reload]);

  const columns: AdminTableColumn<EmployeeCategoryRow>[] = [
    {
      key: "name",
      header: "Kategorie",
      sortable: true,
      render: (cat) => (
        <>
          <p className="font-medium">{cat.name}</p>
          {cat.description && (
            <p className="text-xs text-slate-500">{cat.description}</p>
          )}
        </>
      ),
    },
    {
      key: "courseCount",
      header: "Schulungen",
      sortable: true,
      render: (cat) => cat.courseCount,
    },
    {
      key: "totalDurationMinutes",
      header: "Dauer",
      sortable: true,
      render: (cat) =>
        cat.totalDurationMinutes > 0
          ? `ca. ${formatDurationSummary(cat.totalDurationMinutes)}`
          : "—",
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (cat) => (cat.active ? "Aktiv" : "Archiviert"),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (cat) => (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onEdit(cat)}
            className="text-left text-brand hover:underline"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(cat)}
            className="text-left text-slate-600 hover:underline"
          >
            {cat.active ? "Archivieren" : "Reaktivieren"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      rowKey={(cat) => cat.id}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyMessage="Noch keine Mitarbeiterkategorien angelegt."
      search={state.search}
      searchPlaceholder="Kategorie suchen…"
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

export function EmployeeCategoriesTable(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt Kategorien…</p>}>
      <EmployeeCategoriesTableInner {...props} />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import { ActionMenu } from "@/components/action-menu";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { StatusDot } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";
import type { AdminEmployeeRow } from "@/lib/admin-users-list";
import { formatUserAddress } from "@/lib/user-profile";

type CategoryOption = { id: number; name: string };
type LocationOption = { id: number; label: string };

type Props = {
  onEdit: (user: AdminEmployeeRow) => void;
  onToggleActive: (user: AdminEmployeeRow) => void;
  categories: CategoryOption[];
  locations: LocationOption[];
  refreshKey?: number;
};

function EmployeeListTableInner({
  onEdit,
  onToggleActive,
  categories,
  locations,
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
    updateParams,
    hasActiveFilters,
    resetFilters,
  } = useAdminList<AdminEmployeeRow>({
    apiPath: "/api/admin/users",
    dataKey: "users",
    defaultSortBy: "lastName",
    defaultSortDirection: "asc",
    onUnauthorized: () => window.location.replace("/login"),
  });

  useEffect(() => {
    if (refreshKey > 0) reload();
  }, [refreshKey, reload]);

  const columns: AdminTableColumn<AdminEmployeeRow>[] = [
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span className="flex items-center gap-2">
          <StatusDot status={u.status} />
          <span className="text-xs">{u.statusLabel}</span>
        </span>
      ),
    },
    {
      key: "lastName",
      header: "Name",
      sortable: true,
      render: (u) => (
        <>
          {u.firstName} {u.lastName}
          {!u.active && (
            <span className="ml-2 text-xs text-red-600">(deaktiviert)</span>
          )}
        </>
      ),
    },
    {
      key: "email",
      header: "E-Mail",
      sortable: true,
      render: (u) => u.email,
    },
    {
      key: "categoryName",
      header: "Kategorie",
      sortable: true,
      render: (u) => u.employeeCategoryName ?? "—",
    },
    {
      key: "active",
      header: "Aktiv",
      sortable: true,
      render: (u) => (u.active ? "Ja" : "Nein"),
    },
    {
      key: "lastLoginAt",
      header: "Letzte Anmeldung",
      sortable: true,
      render: (u) =>
        u.lastLoginAt
          ? new Date(u.lastLoginAt).toLocaleString("de-DE")
          : "—",
    },
    {
      key: "address",
      header: "Anschrift",
      render: (u) => (
        <span className="text-xs text-slate-600">{formatUserAddress(u)}</span>
      ),
    },
    {
      key: "locationName",
      header: "Hauptstandort",
      sortable: true,
      render: (u) => u.locationLabel ?? u.location ?? "—",
    },
    {
      key: "otherLocations",
      header: "Weitere Standorte",
      render: (u) => u.additionalLocationLabels ?? "—",
    },
    {
      key: "certificate",
      header: "Zertifikat",
      render: (u) =>
        u.certificate ? (
          <div>
            <p className="text-xs">{u.certificate.certificateNumber}</p>
            <a
              href={`/api/certificates/${u.certificate.id}/pdf`}
              className="text-brand underline"
            >
              PDF
            </a>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <ActionMenu
          ariaLabel={`Aktionen für ${u.firstName} ${u.lastName}`}
          items={[
            { label: "Bearbeiten", onClick: () => onEdit(u) },
            {
              label: u.active ? "Archivieren" : "Reaktivieren",
              onClick: () => onToggleActive(u),
              destructive: u.active,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={rows}
      rowKey={(u) => u.id}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyMessage="Noch keine Mitarbeiter angelegt."
      search={state.search}
      searchPlaceholder="Name oder E-Mail…"
      onSearchChange={setSearch}
      statusFilter={state.status}
      onStatusChange={setStatus}
      filters={[
        {
          key: "categoryId",
          label: "Kategorie",
          value: state.categoryId ? String(state.categoryId) : "",
          options: [
            { value: "", label: "Alle Kategorien" },
            ...categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ],
          onChange: (value) =>
            updateParams({ categoryId: value || null }, { resetPage: true }),
        },
        {
          key: "locationId",
          label: "Standort",
          value: state.locationId ? String(state.locationId) : "",
          options: [
            { value: "", label: "Alle Standorte" },
            ...locations.map((loc) => ({
              value: String(loc.id),
              label: loc.label,
            })),
          ],
          onChange: (value) =>
            updateParams({ locationId: value || null }, { resetPage: true }),
        },
      ]}
      page={meta?.page ?? state.page}
      pageSize={meta?.pageSize ?? state.pageSize}
      totalCount={meta?.total}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSort={toggleSort}
      getSortState={getSortState}
      hasActiveFilters={hasActiveFilters}
      onResetFilters={resetFilters}
      minWidth="960px"
    />
  );
}

export function EmployeeListTable(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt Mitarbeiter…</p>}>
      <EmployeeListTableInner {...props} />
    </Suspense>
  );
}

// Reload when parent saves — pass refreshKey from parent after mutations
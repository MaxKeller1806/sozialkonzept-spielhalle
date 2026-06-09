"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";

type LocationRow = {
  id: number;
  name: string;
  city: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  addressLabel: string;
  employeeCount: number;
  active: boolean;
  label: string;
};

export default function StandortePage() {
  const [adminScope, setAdminScope] = useState<"company" | "location">("company");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    addressLine1: "",
    postalCode: "",
    city: "",
    sortOrder: "0",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const {
    rows,
    meta,
    loading,
    error: listError,
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
  } = useAdminList<LocationRow>({
    apiPath: "/api/admin/locations",
    dataKey: "locations",
    defaultSortBy: "sortOrder",
    defaultSortDirection: "asc",
    defaultStatus: "active",
    onUnauthorized: () => window.location.replace("/login"),
  });

  useEffect(() => {
    if (listRefreshKey > 0) reload();
  }, [listRefreshKey, reload]);

  useEffect(() => {
    fetch("/api/admin/locations?filter=active")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.adminScope) setAdminScope(d.adminScope);
      })
      .catch(() => undefined);
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      addressLine1: "",
      postalCode: "",
      city: "",
      sortOrder: "0",
    });
    setEditId(null);
    setShowForm(false);
    setError("");
  }, []);

  function startEdit(row: LocationRow) {
    setEditId(row.id);
    setForm({
      name: row.name,
      addressLine1: row.addressLine1 ?? "",
      postalCode: row.postalCode ?? "",
      city: row.city ?? "",
      sortOrder: "0",
    });
    setShowForm(true);
    setError("");
  }

  async function saveLocation(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name erforderlich.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      addressLine1: form.addressLine1.trim() || null,
      postalCode: form.postalCode.trim() || null,
      city: form.city.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };

    const res = editId
      ? await fetch(`/api/admin/locations/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    resetForm();
    setListRefreshKey((k) => k + 1);
    setMessage("Gespeichert.");
  }

  async function deactivate(row: LocationRow) {
    if (
      !confirm(
        `Standort „${row.label}“ deaktivieren? (Nur möglich ohne aktive Mitarbeiter.)`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/locations/${row.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Deaktivieren fehlgeschlagen.");
      return;
    }
    setListRefreshKey((k) => k + 1);
    setMessage("Standort deaktiviert.");
  }

  const columns: AdminTableColumn<LocationRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => row.label,
    },
    {
      key: "city",
      header: "Stadt",
      sortable: true,
      render: (row) => row.city ?? "—",
    },
    {
      key: "addressLabel",
      header: "Adresse",
      render: (row) => row.addressLabel,
    },
    {
      key: "employeeCount",
      header: "Mitarbeiter",
      sortable: true,
      render: (row) => row.employeeCount,
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (row) => (row.active ? "Aktiv" : "Inaktiv"),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        adminScope === "company" ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!w-auto !py-1 !text-xs"
              onClick={() => startEdit(row)}
            >
              Bearbeiten
            </Button>
            {row.active && (
              <Button
                type="button"
                variant="secondary"
                className="!w-auto !py-1 !text-xs"
                onClick={() => void deactivate(row)}
              >
                Deaktivieren
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Standorte"
        description="Standorte Ihrer Firma verwalten und Mitarbeitern zuordnen."
        actions={
          adminScope === "company" ? (
            <Button className="!w-auto" onClick={() => setShowForm(true)}>
              + Standort anlegen
            </Button>
          ) : undefined
        }
      />

      {message && (
        <p className="mb-4 text-sm text-green-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showForm && adminScope === "company" && (
        <Card className="mb-6">
          <h2 className="text-base font-bold text-slate-900">
            {editId ? "Standort bearbeiten" : "Neuer Standort"}
          </h2>
          <form onSubmit={saveLocation} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Stadt"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="Adresse"
              value={form.addressLine1}
              onChange={(e) =>
                setForm({ ...form, addressLine1: e.target.value })
              }
            />
            <Input
              label="PLZ"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" className="!w-auto">
                Speichern
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!w-auto"
                onClick={resetForm}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        error={listError}
        onRetry={reload}
        emptyMessage="Noch keine Standorte angelegt."
        search={state.search}
        searchPlaceholder="Name oder Stadt…"
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
    </>
  );
}

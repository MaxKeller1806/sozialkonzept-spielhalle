"use client";

import { Suspense, useState } from "react";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "@/components/admin-data-table";
import { AdminModal } from "@/components/admin-modal";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Input } from "@/components/ui";
import { useAdminList } from "@/hooks/use-admin-list";
import { formatResponsibilityPlaceholder } from "@/lib/responsibility-placeholders";
import type { ResponsibilityType } from "@/lib/types";

function VerantwortlichkeitenPageContent() {
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: "0",
  });

  const list = useAdminList<ResponsibilityType>({
    apiPath: "/api/superuser/responsibility-types",
    dataKey: "responsibilityTypes",
    defaultSortBy: "sortOrder",
    defaultSortDirection: "asc",
    onUnauthorized: () => window.location.replace("/certiano/login"),
  });

  function resetForm() {
    setForm({ name: "", slug: "", description: "", sortOrder: "0" });
    setEditId(null);
    setShowForm(false);
    setFormError("");
    setSaving(false);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(item: ResponsibilityType) {
    setEditId(item.id);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description ?? "",
      sortOrder: String(item.sortOrder),
    });
    setFormError("");
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setFormError("");
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      const res = await fetch(
        editId
          ? `/api/superuser/responsibility-types/${editId}`
          : "/api/superuser/responsibility-types",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      resetForm();
      list.reload();
      setMessage("Verantwortungstyp gespeichert.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: ResponsibilityType) {
    await fetch(`/api/superuser/responsibility-types/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    list.reload();
  }

  const columns: AdminTableColumn<ResponsibilityType>[] = [
    {
      key: "name",
      header: "Verantwortungstyp",
      sortable: true,
      render: (item) => (
        <>
          <span className="font-medium">{item.name}</span>
          {!item.active && (
            <span className="ml-2 text-xs text-red-600">(inaktiv)</span>
          )}
          {item.description ? (
            <p className="text-xs text-slate-500">{item.description}</p>
          ) : null}
        </>
      ),
    },
    {
      key: "assignmentCount",
      header: "Zuordnungen",
      sortable: true,
      render: (item) => item.assignmentCount ?? 0,
    },
    {
      key: "sortOrder",
      header: "Sortierung",
      sortable: true,
      render: (item) => item.sortOrder,
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (item) => (item.active ? "Aktiv" : "Inaktiv"),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (item) => (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => openEdit(item)}
            className="text-left text-brand hover:underline"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => void toggleActive(item)}
            className="text-left text-slate-600 hover:underline"
          >
            {item.active ? "Deaktivieren" : "Reaktivieren"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <CertianoShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verantwortlichkeiten</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Globale Verantwortungstypen für alle Firmen. Admins weisen pro Firma
            verantwortliche Personen zu — getrennt von Rollen und
            Mitarbeiterkategorien.
          </p>
        </div>
        <Button onClick={openCreate}>Verantwortungstyp anlegen</Button>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <AdminDataTable
        appearance="modern"
        storageKey="superuser.responsibilities"
        columns={columns}
        rows={list.rows}
        rowKey={(item) => item.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        emptyMessage="Noch keine Verantwortungstypen angelegt."
        search={list.state.search}
        searchPlaceholder="Name oder Kurzname…"
        onSearchChange={list.setSearch}
        statusFilter={list.state.status}
        onStatusChange={list.setStatus}
        page={list.meta?.page ?? list.state.page}
        pageSize={list.meta?.pageSize ?? list.state.pageSize}
        totalCount={list.meta?.total}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSort={list.toggleSort}
        getSortState={list.getSortState}
        hasActiveFilters={list.hasActiveFilters}
        onResetFilters={list.resetFilters}
      />

      <AdminModal
        open={showForm}
        onClose={resetForm}
        title={
          editId ? "Verantwortungstyp bearbeiten" : "Verantwortungstyp anlegen"
        }
        error={formError}
        saving={saving}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" form="responsibility-type-form" disabled={saving}>
              Speichern
            </Button>
          </div>
        }
      >
        <form id="responsibility-type-form" onSubmit={save} className="grid gap-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Kurzname"
            required
            placeholder="z. B. sozialkonzept"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            Der Kurzname wird intern für Dokumentenvariablen in Zertifikaten und
            Nachweisen verwendet (z. B. im Zertifikatsdesigner).
          </p>
          <Input
            label="Beschreibung"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Sortierung"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          />
          {form.slug.trim() ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Dokumentenvariable: </span>
              <code className="break-all">{formatResponsibilityPlaceholder(form.slug)}</code>
            </div>
          ) : null}
        </form>
      </AdminModal>
    </CertianoShell>
  );
}

export default function VerantwortlichkeitenPage() {
  return (
    <Suspense
      fallback={
        <CertianoShell>
          <p className="text-sm text-slate-600">Lädt Verantwortlichkeiten…</p>
        </CertianoShell>
      }
    >
      <VerantwortlichkeitenPageContent />
    </Suspense>
  );
}

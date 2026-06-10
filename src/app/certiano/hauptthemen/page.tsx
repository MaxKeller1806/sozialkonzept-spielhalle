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
import type { CourseTopicRow } from "@/lib/course-topics";

function HauptthemenPageContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: "0",
    active: true,
  });

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
  } = useAdminList<CourseTopicRow>({
    apiPath: "/api/superuser/course-topics",
    dataKey: "topics",
    defaultSortBy: "sortOrder",
    defaultSortDirection: "asc",
    defaultStatus: "active",
    onUnauthorized: () => window.location.replace("/certiano/login"),
  });

  function resetForm() {
    setForm({ name: "", slug: "", description: "", sortOrder: "0", active: true });
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(topic: CourseTopicRow) {
    setEditId(topic.id);
    setForm({
      name: topic.name,
      slug: topic.slug,
      description: topic.description ?? "",
      sortOrder: String(topic.sortOrder),
      active: topic.active,
    });
    setShowForm(true);
    setError("");
  }

  async function saveTopic(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    try {
      const res = await fetch(
        editId ? `/api/superuser/course-topics/${editId}` : "/api/superuser/course-topics",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      resetForm();
      reload();
      setMessage("Hauptthema gespeichert.");
    } finally {
      setSaving(false);
    }
  }

  const columns: AdminTableColumn<CourseTopicRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (t) => t.name,
    },
    {
      key: "sortOrder",
      header: "Reihenfolge",
      sortable: true,
      render: (t) => t.sortOrder,
    },
    {
      key: "courseCount",
      header: "Masterkurse",
      render: (t) => t.courseCount ?? 0,
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      render: (t) => (t.active ? "Aktiv" : "Inaktiv"),
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <button
          type="button"
          className="text-brand hover:underline"
          onClick={() => startEdit(t)}
        >
          Bearbeiten
        </button>
      ),
    },
  ];

  return (
    <CertianoShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hauptthemen</h1>
            <p className="mt-1 text-sm text-slate-600">
              Globale Gruppierung für Masterkurse und Firmenseminare.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Hauptthema anlegen
          </Button>
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}

        <AdminModal
          open={showForm}
          onClose={resetForm}
          title={editId ? "Hauptthema bearbeiten" : "Neues Hauptthema"}
        >
          {error && (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={saveTopic} className="grid gap-4">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Beschreibung (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Input
              label="Sortierreihenfolge"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Aktiv
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Speichern…" : "Speichern"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
          </form>
        </AdminModal>

        <AdminDataTable
          appearance="modern"
          storageKey="superuser.topics"
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          loading={loading}
          error={listError}
          onRetry={reload}
          emptyMessage="Noch keine Hauptthemen angelegt."
          search={state.search}
          searchPlaceholder="Name suchen…"
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
      </div>
    </CertianoShell>
  );
}

export default function HauptthemenPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-600">Lädt…</p>}>
      <HauptthemenPageContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { MasterCoursesTable } from "@/components/master-courses-table";
import { Button, Card, Input } from "@/components/ui";
import { useCourseDeleteDialog } from "@/hooks/use-course-delete-dialog";

export default function MasterCoursesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const { openDeleteDialog, deleteDialog } = useCourseDeleteDialog({
    kind: "master",
    getPreviewUrl: (id) =>
      `/api/superuser/master-courses/${encodeURIComponent(id)}/delete-preview`,
    getDeleteUrl: (id) =>
      `/api/superuser/master-courses/${encodeURIComponent(id)}`,
    onArchived: (msg) => {
      setError("");
      setMessage(msg);
      setListRefreshKey((k) => k + 1);
    },
    onDeleted: (msg) => {
      setError("");
      setMessage(msg);
      setListRefreshKey((k) => k + 1);
    },
    onError: (msg) => setError(msg),
  });

  async function importExisting() {
    setImporting(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/superuser/master-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "importExisting" }),
    });
    const d = await res.json().catch(() => ({}));
    setImporting(false);
    if (res.ok) {
      setMessage(
        `${d.imported ?? 0} Master-Kurs(e) aus bestehenden Firmenkursen übernommen.`
      );
      setListRefreshKey((k) => k + 1);
    } else {
      setError(d.error ?? "Import fehlgeschlagen.");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/superuser/master-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (res.ok) {
      setMessage("Master-Seminar angelegt.");
      setShowForm(false);
      setForm({ title: "", slug: "" });
      setListRefreshKey((k) => k + 1);
    } else {
      setMessage(d.error ?? "Anlegen fehlgeschlagen.");
    }
  }

  async function reactivateMasterCourse(course: { id: string }) {
    setMessage("");
    setError("");
    const res = await fetch(
      `/api/superuser/master-courses/${encodeURIComponent(course.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(data.message ?? "Masterkurs reaktiviert.");
      setListRefreshKey((k) => k + 1);
    } else {
      setError(data.error ?? "Reaktivieren fehlgeschlagen.");
    }
  }

  return (
    <CertianoShell>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-600">
          Zentrale Master-Seminare für Certiano. Diese können einzelnen Firmen
          oder allen Firmen bereitgestellt werden.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={importing} onClick={importExisting}>
            {importing ? "Import läuft…" : "Bestehende Kurse als Master übernehmen"}
          </Button>
          <Button onClick={() => setShowForm(true)}>Master-Seminar anlegen</Button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-bold">Neues Master-Seminar</h2>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Titel"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Kurzname"
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit">Anlegen</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      <MasterCoursesTable
        refreshKey={listRefreshKey}
        onDelete={openDeleteDialog}
        onReactivate={reactivateMasterCourse}
      />

      {deleteDialog}
    </CertianoShell>
  );
}

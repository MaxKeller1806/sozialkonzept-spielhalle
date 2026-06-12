"use client";

import { useState } from "react";
import { AdminCoursesTable } from "@/components/admin-courses-table";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";
import { useCourseDeleteDialog } from "@/hooks/use-course-delete-dialog";

export default function SeminarePage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const { openDeleteDialog, deleteDialog } = useCourseDeleteDialog({
    kind: "course",
    getPreviewUrl: (id) =>
      `/api/admin/courses/${encodeURIComponent(id)}/delete-preview`,
    getDeleteUrl: (id) => `/api/admin/courses/${encodeURIComponent(id)}`,
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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, withTemplate: false }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    setShowForm(false);
    setForm({ title: "", slug: "" });
    setMessage("Seminar wurde angelegt.");
    setListRefreshKey((k) => k + 1);
  }

  async function reactivateCourse(course: { id: string }) {
    setMessage("");
    setError("");
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(course.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message ?? "Seminar reaktiviert.");
      setListRefreshKey((k) => k + 1);
    } else {
      setError(data.error ?? "Reaktivieren fehlgeschlagen.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Seminarverwaltung"
        actions={
          <Button onClick={() => setShowForm(true)}>Neues Seminar</Button>
        }
      />

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <Card className="mb-6">
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
              placeholder="sicherheitskonzept"
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

      <AdminCoursesTable
        refreshKey={listRefreshKey}
        onDelete={openDeleteDialog}
        onReactivate={reactivateCourse}
      />

      {deleteDialog}
    </div>
  );
}

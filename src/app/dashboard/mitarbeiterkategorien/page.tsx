"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CourseAssignmentPicker,
  type AssignableCourse,
} from "@/components/course-assignment-picker";
import {
  EmployeeCategoriesTable,
  type EmployeeCategoryRow,
} from "@/components/employee-categories-table";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";

interface AdminCourseRow {
  id: string;
  title: string;
  slug: string;
  mainCategory?: string | null;
  seminar?: string | null;
  instructionCode?: string | null;
  instructionTitle?: string | null;
  sortOrder?: number;
  estimatedDurationMinutes?: number | null;
}

function toAssignableCourse(c: AdminCourseRow): AssignableCourse {
  return {
    id: c.id,
    title: c.title,
    fullTitle: c.title,
    code: c.instructionCode ?? null,
    instructionTitle: c.instructionTitle ?? null,
    mainCategory: c.mainCategory ?? null,
    seminar: c.seminar ?? null,
    sortOrder: c.sortOrder ?? 0,
    slug: c.slug,
    estimatedDurationMinutes: c.estimatedDurationMinutes ?? null,
  };
}

export default function MitarbeiterkategorienPage() {
  const [assignableCourses, setAssignableCourses] = useState<AssignableCourse[]>(
    []
  );
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/courses?filter=active")
      .then((r) => (r.status === 403 ? null : r.json()))
      .then((d) => {
        if (d?.courses) {
          setAssignableCourses(
            d.courses.map((c: AdminCourseRow) => toAssignableCourse(c))
          );
        }
      })
      .finally(() => setCoursesLoading(false));
  }, []);

  function resetForm() {
    setForm({ name: "", description: "" });
    setSelectedCourseIds([]);
    setEditId(null);
    setShowForm(false);
    setFormLoading(false);
  }

  async function startEdit(cat: EmployeeCategoryRow) {
    setEditId(cat.id);
    setForm({ name: cat.name, description: cat.description ?? "" });
    setShowForm(true);
    setFormLoading(true);
    setSelectedCourseIds([]);
    try {
      const res = await fetch(`/api/admin/employee-categories/${cat.id}`);
      if (!res.ok) {
        setError("Kategorie konnte nicht geladen werden.");
        return;
      }
      const data = await res.json();
      setSelectedCourseIds(data.courseIds ?? []);
    } catch {
      setError("Kategorie konnte nicht geladen werden.");
    } finally {
      setFormLoading(false);
    }
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!form.name.trim()) {
      setError("Name erforderlich.");
      return;
    }

    if (editId) {
      const res = await fetch(`/api/admin/employee-categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          courseIds: selectedCourseIds,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Speichern fehlgeschlagen.");
        return;
      }
    } else {
      const createRes = await fetch("/api/admin/employee-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        setError(created.error ?? "Anlegen fehlgeschlagen.");
        return;
      }
      const newId = created.category?.id;
      if (newId && selectedCourseIds.length > 0) {
        await fetch(`/api/admin/employee-categories/${newId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseIds: selectedCourseIds }),
        });
      }
    }

    resetForm();
    setListRefreshKey((k) => k + 1);
    setMessage("Gespeichert.");
  }

  async function toggleActive(cat: EmployeeCategoryRow) {
    await fetch(`/api/admin/employee-categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !cat.active }),
    });
    setListRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Mitarbeiterkategorien"
        actions={
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Kategorie anlegen
          </Button>
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
          <h2 className="mb-4 text-lg font-bold">
            {editId ? "Kategorie bearbeiten" : "Neue Kategorie"}
          </h2>
          <form onSubmit={saveCategory} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Beschreibung (optional)"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
            {formLoading || coursesLoading ? (
              <p className="sm:col-span-2 text-sm text-slate-600">
                Standard-Schulungen werden geladen…
              </p>
            ) : (
              <CourseAssignmentPicker
                courses={assignableCourses}
                selectedIds={selectedCourseIds}
                onChange={setSelectedCourseIds}
              />
            )}
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit">Speichern</Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      <EmployeeCategoriesTable
        refreshKey={listRefreshKey}
        onEdit={startEdit}
        onToggleActive={toggleActive}
      />
    </div>
  );
}

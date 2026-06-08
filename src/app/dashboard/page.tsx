"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssignableCourse } from "@/components/course-assignment-picker";
import { AdminDrawer } from "@/components/admin-drawer";
import {
  EmployeeEditForm,
  type EmployeeFormState,
} from "@/components/employee-edit-form";
import { EmployeeListTable } from "@/components/employee-list-table";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  StatusDot,
} from "@/components/ui";
import type { AdminEmployeeRow } from "@/lib/admin-users-list";

interface EmployeeCategoryOption {
  id: number;
  name: string;
  courseCount: number;
  totalDurationMinutes: number;
}

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

const EMPTY_FORM: EmployeeFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  birthDate: "",
  birthPlace: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  location: "",
  joinedCompanyAt: "",
  leftCompanyAt: "",
};

export default function DashboardPage() {
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [assignableCourses, setAssignableCourses] = useState<AssignableCourse[]>(
    []
  );
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [employeeCategories, setEmployeeCategories] = useState<
    EmployeeCategoryOption[]
  >([]);
  const [employeeCategoryId, setEmployeeCategoryId] = useState<number | "">("");
  const [loadedCategoryId, setLoadedCategoryId] = useState<number | null>(null);
  const [categoryPrompt, setCategoryPrompt] = useState<string[] | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFormData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/courses?filter=active"),
      fetch("/api/admin/employee-categories?filter=active"),
    ])
      .then((results) => {
        const [coursesRes, categoriesRes] = results;
        return Promise.all([
          coursesRes.ok ? coursesRes.json() : { courses: [] },
          categoriesRes.ok ? categoriesRes.json() : { categories: [] },
        ]);
      })
      .then((data) => {
        if (!data) return;
        const [coursesData, categoriesData] = data;
        if (coursesData.courses) {
          setAssignableCourses(
            coursesData.courses.map((c: AdminCourseRow) => toAssignableCourse(c))
          );
        }
        if (categoriesData.categories) {
          setEmployeeCategories(categoriesData.categories);
        }
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    setSelectedCourseIds([]);
    setEmployeeCategoryId("");
    setLoadedCategoryId(null);
    setCategoryPrompt(null);
    setFormLoading(false);
    setFormError("");
    setSaving(false);
  }

  async function loadCategoryCourseIds(categoryId: number): Promise<string[]> {
    const res = await fetch(`/api/admin/employee-categories/${categoryId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const assignableIds = new Set(assignableCourses.map((c) => c.id));
    return (data.courseIds as string[]).filter((id) => assignableIds.has(id));
  }

  async function handleCategoryChange(value: string) {
    if (value === "") {
      setEmployeeCategoryId("");
      setCategoryPrompt(null);
      return;
    }
    const newId = Number(value);
    setEmployeeCategoryId(newId);
    const standardIds = await loadCategoryCourseIds(newId);

    if (
      editId &&
      loadedCategoryId != null &&
      loadedCategoryId !== newId &&
      selectedCourseIds.length > 0
    ) {
      setCategoryPrompt(standardIds);
      return;
    }

    setSelectedCourseIds(standardIds);
    setCategoryPrompt(null);
  }

  async function startEdit(u: AdminEmployeeRow) {
    setEditId(u.id);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: "",
      birthDate: u.birthDate ?? "",
      birthPlace: u.birthPlace ?? "",
      street: u.street ?? "",
      houseNumber: u.houseNumber ?? "",
      postalCode: u.postalCode ?? "",
      city: u.city ?? "",
      location: u.location ?? "",
      joinedCompanyAt: u.joinedCompanyAt ?? "",
      leftCompanyAt: u.leftCompanyAt ?? "",
    });
    setFormError("");
    setShowForm(true);
    setFormLoading(true);
    setSelectedCourseIds([]);
    setEmployeeCategoryId("");
    setLoadedCategoryId(null);
    setCategoryPrompt(null);

    try {
      const res = await fetch(`/api/admin/users/${u.id}`);
      if (!res.ok) {
        setFormError("Kurszuweisungen konnten nicht geladen werden.");
        return;
      }
      const data = await res.json();
      const assignableIds = new Set(assignableCourses.map((c) => c.id));
      const assigned = (data.assignedCourseIds as string[]).filter((id) =>
        assignableIds.has(id)
      );
      setSelectedCourseIds(assigned);
      const catId = data.user?.employeeCategoryId as number | null | undefined;
      if (catId) {
        setEmployeeCategoryId(catId);
        setLoadedCategoryId(catId);
      }
      const joined = data.user?.joinedCompanyAt as string | null | undefined;
      const left = data.user?.leftCompanyAt as string | null | undefined;
      setForm((prev) => ({
        ...prev,
        joinedCompanyAt: joined ?? "",
        leftCompanyAt: left ?? "",
      }));
    } catch {
      setFormError("Kurszuweisungen konnten nicht geladen werden.");
    } finally {
      setFormLoading(false);
    }
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      if (editId) {
        const body: Record<string, unknown> = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          birthDate: form.birthDate || null,
          birthPlace: form.birthPlace || null,
          street: form.street || null,
          houseNumber: form.houseNumber || null,
          postalCode: form.postalCode || null,
        city: form.city || null,
        location: form.location || null,
        joinedCompanyAt: form.joinedCompanyAt || null,
        leftCompanyAt: form.leftCompanyAt || null,
        courseIds: selectedCourseIds,
          employeeCategoryId: employeeCategoryId === "" ? null : employeeCategoryId,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/admin/users/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setFormError(d.error ?? "Speichern fehlgeschlagen.");
          return;
        }
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          joinedCompanyAt: form.joinedCompanyAt || null,
          leftCompanyAt: form.leftCompanyAt || null,
          courseIds: selectedCourseIds,
            employeeCategoryId: employeeCategoryId === "" ? null : employeeCategoryId,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setFormError(d.error ?? "Anlegen fehlgeschlagen.");
          return;
        }
      }

      resetForm();
      setListRefreshKey((k) => k + 1);
      setMessage("Gespeichert.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: AdminEmployeeRow) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    setListRefreshKey((k) => k + 1);
  }

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Mitarbeiter"
        actions={
          <>
            <a href="/api/admin/export">
              <Button variant="secondary">CSV-Export</Button>
            </a>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Mitarbeiter anlegen
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 text-sm text-slate-600">
        <span className="flex items-center gap-1">
          <StatusDot status="green" /> Gültig
        </span>
        <span className="flex items-center gap-1">
          <StatusDot status="yellow" /> Läuft in 30 Tagen ab
        </span>
        <span className="flex items-center gap-1">
          <StatusDot status="red" /> Nicht geschult / abgelaufen
        </span>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <AdminDrawer
        open={showForm}
        onClose={resetForm}
        title={editId ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
        error={formError}
        saving={saving}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="employee-edit-form" disabled={saving || formLoading}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
              Abbrechen
            </Button>
          </div>
        }
      >
        <EmployeeEditForm
          editId={editId}
          form={form}
          onFormChange={setForm}
          employeeCategories={employeeCategories}
          employeeCategoryId={employeeCategoryId}
          onCategoryChange={handleCategoryChange}
          categoryPrompt={categoryPrompt}
          onAcceptCategoryPrompt={() => {
            if (categoryPrompt) setSelectedCourseIds(categoryPrompt);
            setCategoryPrompt(null);
          }}
          onDismissCategoryPrompt={() => setCategoryPrompt(null)}
          formLoading={formLoading}
          assignableCourses={assignableCourses}
          selectedCourseIds={selectedCourseIds}
          onSelectedCourseIdsChange={setSelectedCourseIds}
          onSubmit={saveUser}
          hideActions
        />
      </AdminDrawer>

      <EmployeeListTable
        refreshKey={listRefreshKey}
        categories={employeeCategories}
        onEdit={startEdit}
        onToggleActive={toggleActive}
      />
    </div>
  );
}

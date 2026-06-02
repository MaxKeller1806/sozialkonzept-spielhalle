"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader, Button, Card, Input } from "@/components/ui";
import { formatValidityRuleLabel } from "@/lib/course-validity";
import type { ValidityType } from "@/lib/course-validity";

type CourseFilter = "active" | "archived" | "all";

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  active: boolean;
  validityType: ValidityType;
  validityLabel: string;
  permissions?: { canDeactivate?: boolean };
}

export default function SeminarePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/courses?filter=${filter}`)
      .then((r) => {
        if (r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.courses) setCourses(d.courses);
        if (d?.error) setError(d.error);
      })
      .catch(() => setError("Seminare konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [router, filter]);

  useEffect(() => {
    load();
  }, [load]);

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
    load();
  }

  async function toggleActive(course: CourseRow) {
    setMessage("");
    setError("");
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(course.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !course.active }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message ?? "Status aktualisiert.");
      load();
    } else {
      setError(data.error ?? "Aktion fehlgeschlagen.");
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title="Seminare" />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <AdminNav active="seminare" />

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={filter === "active" ? "primary" : "secondary"}
            onClick={() => setFilter("active")}
          >
            Aktive Seminare
          </Button>
          <Button
            type="button"
            variant={filter === "archived" ? "primary" : "secondary"}
            onClick={() => setFilter("archived")}
          >
            Inaktive / Archiv
          </Button>
          <Button
            type="button"
            variant={filter === "all" ? "primary" : "secondary"}
            onClick={() => setFilter("all")}
          >
            Alle
          </Button>
        </div>

        <div className="mb-4 flex justify-end">
          <Button onClick={() => setShowForm(true)}>Neues Seminar</Button>
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
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

        {loading ? (
          <p className="text-sm text-slate-600">Lädt Seminare…</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4">Seminar</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Wiederholung / Gültigkeit</th>
                  <th className="p-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-4">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.slug}</p>
                    </td>
                    <td className="p-4">{c.active ? "Aktiv" : "Inaktiv"}</td>
                    <td className="p-4">
                      {c.validityLabel || formatValidityRuleLabel(c)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/dashboard/seminare/${encodeURIComponent(c.id)}/inhalte`}
                          className="text-brand underline"
                        >
                          Inhalte bearbeiten
                        </Link>
                        <Link
                          href={`/dashboard/seminare/${encodeURIComponent(c.id)}`}
                          className="text-brand underline"
                        >
                          Einstellungen
                        </Link>
                        {(c.permissions?.canDeactivate !== false || !c.active) && (
                          <button
                            type="button"
                            className="text-left text-slate-600 underline"
                            onClick={() => void toggleActive(c)}
                          >
                            {c.active ? "Deaktivieren" : "Reaktivieren"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {courses.length === 0 && (
              <p className="p-8 text-center text-slate-500">
                {filter === "archived"
                  ? "Keine inaktiven Seminare."
                  : "Noch keine Seminare angelegt."}
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

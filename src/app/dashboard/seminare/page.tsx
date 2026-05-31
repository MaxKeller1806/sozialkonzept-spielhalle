"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader, Button, Card, Input } from "@/components/ui";

interface CourseMeta {
  id: string;
  title: string;
  slug: string;
  active: boolean;
}

export default function SeminarePage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseMeta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });

  const load = useCallback(() => {
    fetch("/api/admin/courses")
      .then((r) => {
        if (r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.courses) setCourses(d.courses);
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, withTemplate: false }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", slug: "" });
      load();
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title="Seminare / Kurse" />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <AdminNav active="seminare" />
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setShowForm(true)}>Neues Seminar</Button>
        </div>
        {showForm && (
          <Card className="mb-6">
            <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
              <Input label="Titel" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input label="Kurzname" required placeholder="sicherheitskonzept" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit">Anlegen</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Abbrechen</Button>
              </div>
            </form>
          </Card>
        )}
        <Card className="divide-y p-0">
          {courses.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-slate-500">{c.slug}</p>
              </div>
              <Link
                href={`/dashboard/inhalte?courseId=${encodeURIComponent(c.id)}`}
                className="text-brand underline"
              >
                Inhalte bearbeiten
              </Link>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="p-8 text-center text-slate-500">Noch keine Seminare angelegt.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

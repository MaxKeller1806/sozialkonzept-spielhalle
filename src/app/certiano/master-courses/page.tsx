"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, Input } from "@/components/ui";

interface MasterCourse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function MasterCoursesPage() {
  const [courses, setCourses] = useState<MasterCourse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    fetch("/api/superuser/master-courses", { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return;
        }
        if (!r.ok) {
          throw new Error(d.error ?? "Laden fehlgeschlagen.");
        }
        if (!cancelled) setCourses(d.courses ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" ||
            e.message.toLowerCase().includes("aborted"));
        if (isAbort) {
          setError(
            "Zeitüberschreitung beim Laden. Bitte erneut versuchen."
          );
        } else {
          setError(
            e instanceof Error ? e.message : "Laden fehlgeschlagen."
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  function reloadCourses() {
    setLoading(true);
    setError("");
    fetch("/api/superuser/master-courses")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return;
        }
        if (!r.ok) throw new Error(d.error ?? "Laden fehlgeschlagen.");
        setCourses(d.courses ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => setLoading(false));
  }

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
      setCourses(d.courses ?? []);
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
      reloadCourses();
    } else {
      setMessage(d.error ?? "Anlegen fehlgeschlagen.");
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
          {courses.length === 0 && (
            <Button type="button" disabled={importing} onClick={importExisting}>
              {importing ? "Import läuft…" : "Bestehende Kurse als Master übernehmen"}
            </Button>
          )}
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

      {loading ? (
        <p className="text-sm text-slate-600">Lädt Master-Kurse…</p>
      ) : (
        <>
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
                  label="Kurzname (Slug)"
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

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4">Titel</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Erstellt</th>
                  <th className="p-4">Aktualisiert</th>
                  <th className="p-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{c.title}</td>
                    <td className="p-4">{c.status}</td>
                    <td className="p-4">
                      {new Date(c.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="p-4">
                      {new Date(c.updatedAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/certiano/master-courses/${encodeURIComponent(c.id)}`}
                        className="text-brand hover:underline"
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </CertianoShell>
  );
}

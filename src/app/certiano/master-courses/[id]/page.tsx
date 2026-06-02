"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, Input } from "@/components/ui";

interface CourseOverview {
  courseName: string;
  version: string;
  passingScore: number;
  modules: { id: number; title: string; duration: number; lessons: { id: number; title: string }[] }[];
  exam: { id: number; moduleId: number; question: string; type: string }[];
}

export default function MasterCourseEditPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id));
  const [meta, setMeta] = useState({ title: "", status: "draft" });
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [passingScore, setPassingScore] = useState("80");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.meta) {
          setMeta({ title: d.meta.title, status: d.meta.status });
        }
        if (d?.course) {
          setCourse(d.course);
          setPassingScore(String(d.course.passingScore));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: meta.title,
        status: meta.status,
        passingScore: Number(passingScore),
      }),
    });
    if (res.ok) {
      setMessage("Master-Seminar gespeichert.");
      load();
    } else {
      setMessage("Speichern fehlgeschlagen.");
    }
  }

  async function assignAll() {
    const res = await fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assignAll" }),
    });
    const d = await res.json();
    if (res.ok) {
      setMessage(`Allen ${d.assignedCount} Firmen zugewiesen.`);
    } else {
      setMessage(d.error ?? "Zuweisung fehlgeschlagen.");
    }
  }

  async function addModule() {
    const title = window.prompt("Modultitel:");
    if (!title?.trim()) return;
    const res = await fetch(
      `/api/superuser/master-courses/${encodeURIComponent(id)}/modules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), duration: 15 }),
      }
    );
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.module) {
      setMessage("Modul angelegt.");
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              modules: [...prev.modules, d.module].sort((a, b) => a.id - b.id),
            }
          : prev
      );
      load();
    } else {
      setMessage(d.error ?? "Modul konnte nicht angelegt werden.");
    }
  }

  if (loading || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        Lädt…
      </div>
    );
  }

  return (
    <CertianoShell>
      <Link href="/certiano/master-courses" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Zur Seminarverwaltung
      </Link>

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <Card className="mb-6">
        <form onSubmit={saveMeta} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Titel"
            value={meta.title}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
          />
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
              value={meta.status}
              onChange={(e) => setMeta({ ...meta, status: e.target.value })}
            >
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              <option value="disabled">Gesperrt</option>
            </select>
          </label>
          <Input
            label="Bestehensgrenze (%)"
            type="number"
            min={50}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit">Speichern</Button>
            <Button type="button" variant="secondary" onClick={assignAll}>
              Allen Firmen zuweisen
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Module ({course.modules.length})</h2>
          <Button type="button" onClick={addModule}>
            + Modul
          </Button>
        </div>
        <ul className="divide-y divide-slate-100">
          {course.modules.map((m) => (
            <li key={m.id} className="py-3">
              <p className="font-semibold">
                {m.id}. {m.title} · {m.lessons.length} Lektionen
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">
          Prüfungsfragen ({course.exam.length})
        </h2>
        <ul className="divide-y divide-slate-100">
          {course.exam.map((q) => (
            <li key={q.id} className="py-3 text-sm">
              <span className="text-slate-500">#{q.id} Modul {q.moduleId} · </span>
              {q.question}
            </li>
          ))}
        </ul>
      </Card>
    </CertianoShell>
  );
}

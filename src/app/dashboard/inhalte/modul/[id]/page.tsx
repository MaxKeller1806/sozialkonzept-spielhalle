"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader, Button, Card, Input } from "@/components/ui";

interface LessonItem {
  id: number;
  title: string;
}

interface ExamItem {
  id: number;
  question: string;
  type: string;
}

export default function ModulEditPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = String(params.id);
  const isNew = idParam === "neu";

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(5);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/admin/course/modules/${idParam}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setTitle(d.module.title);
        setDuration(d.module.duration);
        setLessons(d.module.lessons ?? []);
        setLoading(false);
      })
      .catch(() => router.push("/dashboard/inhalte"));

    if (!isNew) {
      fetch("/api/admin/course")
        .then((r) => r.json())
        .then((d) => {
          const modId = Number(idParam);
          const qs = (d.course?.exam ?? []).filter(
            (q: ExamItem & { moduleId: number }) => q.moduleId === modId
          );
          setExamQuestions(qs);
        });
    }
  }, [idParam, isNew, router]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const url = isNew
      ? "/api/admin/course/modules"
      : `/api/admin/course/modules/${idParam}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, duration }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setMessage("Modul gespeichert.");
    if (isNew) {
      router.push(`/dashboard/inhalte/modul/${data.module.id}`);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!confirm("Modul und alle Lerninhalte wirklich löschen?")) return;

    const res = await fetch(`/api/admin/course/modules/${idParam}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/dashboard/inhalte");
    else setError("Löschen fehlgeschlagen.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">Lädt…</div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title={isNew ? "Neues Modul" : `Modul ${idParam}`} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <AdminNav active="inhalte" />
        <Link
          href="/dashboard/inhalte"
          className="mb-4 inline-block text-sm font-medium text-brand hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>

        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-bold">Modul-Stammdaten</h2>
          <div className="space-y-4">
            <Input
              label="Modultitel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Dauer (Minuten, gesamt)"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              required
            />
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Speichern…" : "Modul speichern"}
            </Button>
            {!isNew && (
              <Button variant="danger" onClick={remove} className="flex-1">
                Modul löschen
              </Button>
            )}
          </div>
        </Card>

        {!isNew && (
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Lerninhalte</h2>
                <p className="text-sm text-slate-500">
                  Einzelne Abschnitte innerhalb dieses Moduls
                </p>
              </div>
              <Link href={`/dashboard/inhalte/modul/${idParam}/lektion/neu`}>
                <Button>+ Lerninhalt</Button>
              </Link>
            </div>

            {lessons.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Noch keine Lerninhalte. Legen Sie mindestens einen an, damit
                Mitarbeitende das Modul bearbeiten können.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lessons.map((l, i) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <p className="font-medium">
                      {i + 1}. {l.title}
                    </p>
                    <Link
                      href={`/dashboard/inhalte/modul/${idParam}/lektion/${l.id}`}
                    >
                      <Button variant="secondary">Bearbeiten</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {!isNew && (
          <Card className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Prüfungsfragen</h2>
                <p className="text-sm text-slate-500">
                  Fragen zum Abschlusstest für dieses Modul
                </p>
              </div>
              <Link href={`/dashboard/inhalte/frage/neu?module=${idParam}`}>
                <Button>+ Prüfungsfrage</Button>
              </Link>
            </div>
            {examQuestions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Noch keine Prüfungsfragen für dieses Modul.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {examQuestions.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400">{q.type}</p>
                      <p className="font-medium">{q.question}</p>
                    </div>
                    <Link href={`/dashboard/inhalte/frage/${q.id}`}>
                      <Button variant="secondary">Bearbeiten</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

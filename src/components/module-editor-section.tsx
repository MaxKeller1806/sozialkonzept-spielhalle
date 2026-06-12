"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { courseInhalteHubHref } from "@/lib/course-inhalte-url";

interface LessonItem {
  id: number;
  title: string;
}

type Props = {
  courseId: string;
  moduleId: number | "neu";
  canEditContent: boolean;
  questionCount: number;
  onSaved: () => void;
};

export function ModuleEditorSection({
  courseId,
  moduleId,
  canEditContent,
  questionCount,
  onSaved,
}: Props) {
  const router = useRouter();
  const isNew = moduleId === "neu";
  const idParam = isNew ? "neu" : String(moduleId);
  const courseQuery = `?courseId=${encodeURIComponent(courseId)}`;

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(5);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isNew) return;

    setLoading(true);
    fetch(`/api/admin/course/modules/${idParam}${courseQuery}`)
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
      .catch(() => {
        router.replace(courseInhalteHubHref(courseId, { bereich: "module" }));
      });
  }, [idParam, isNew, router, courseQuery, courseId]);

  async function save() {
    if (!canEditContent) return;
    setSaving(true);
    setError("");
    setMessage("");

    const url = isNew
      ? `/api/admin/course/modules${courseQuery}`
      : `/api/admin/course/modules/${idParam}${courseQuery}`;
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
    onSaved();
    if (isNew && data.module?.id) {
      router.replace(
        courseInhalteHubHref(courseId, { bereich: "module", modul: data.module.id })
      );
    }
  }

  async function remove() {
    if (isNew || !canEditContent) return;
    if (!confirm("Modul und alle Lerninhalte wirklich löschen?")) return;

    const res = await fetch(`/api/admin/course/modules/${idParam}${courseQuery}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onSaved();
      router.replace(courseInhalteHubHref(courseId, { bereich: "module" }));
    } else {
      setError("Löschen fehlgeschlagen.");
    }
  }

  if (loading) {
    return <p className="py-4 text-sm text-slate-600">Modul wird geladen…</p>;
  }

  const lessonQuerySuffix = courseId
    ? `?courseId=${encodeURIComponent(courseId)}`
    : "";

  return (
    <div className="mt-4 space-y-6 border-t border-slate-100 pt-4">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Modul-Stammdaten
        </h3>
        <div className="space-y-4">
          <Input
            label="Modultitel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!canEditContent}
          />
          <Input
            label="Dauer (Minuten, gesamt)"
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
            disabled={!canEditContent}
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

        {canEditContent && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Speichern…" : "Modul speichern"}
            </Button>
            {!isNew && (
              <Button variant="danger" onClick={remove} className="flex-1">
                Modul löschen
              </Button>
            )}
          </div>
        )}
      </div>

      {!isNew && (
        <>
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Lerninhalte
                </h3>
                <p className="text-sm text-slate-500">
                  Einzelne Abschnitte innerhalb dieses Moduls
                </p>
              </div>
              {canEditContent && (
                <Link
                  href={`/dashboard/inhalte/modul/${idParam}/lektion/neu${lessonQuerySuffix}`}
                >
                  <Button>+ Lerninhalt</Button>
                </Link>
              )}
            </div>

            {lessons.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Noch keine Lerninhalte. Legen Sie mindestens einen an, damit
                Mitarbeitende das Modul bearbeiten können.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {lessons.map((l, i) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <p className="font-medium">
                      {i + 1}. {l.title}
                    </p>
                    {canEditContent ? (
                      <Link
                        href={`/dashboard/inhalte/modul/${idParam}/lektion/${l.id}${lessonQuerySuffix}`}
                      >
                        <Button variant="secondary">Bearbeiten</Button>
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">Nur Ansicht</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              <strong>{questionCount}</strong> Prüfungsfrage
              {questionCount !== 1 ? "n" : ""} in diesem Modul.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href={courseInhalteHubHref(courseId, {
                  bereich: "fragen",
                  modul: moduleId,
                })}
              >
                <Button variant="secondary">Fragen anzeigen</Button>
              </Link>
              {canEditContent && (
                <Link
                  href={`/dashboard/inhalte/frage/neu?module=${idParam}&courseId=${encodeURIComponent(courseId)}`}
                >
                  <Button>+ Prüfungsfrage</Button>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

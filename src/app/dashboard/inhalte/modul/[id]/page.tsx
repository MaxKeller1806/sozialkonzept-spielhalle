"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";
import {
  buildPoolQuestionNumberMap,
  formatPoolQuestionDisplayNumber,
  getQuestionTypeLabel,
  sortExamQuestionsForDisplay,
} from "@/lib/exam-pool-display";

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
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>}>
      <ModulEditContent />
    </Suspense>
  );
}

function ModulEditContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseQuery = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  const idParam = String(params.id);
  const isNew = idParam === "neu";

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(5);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamItem[]>([]);
  const [poolNumberMap, setPoolNumberMap] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isNew) return;
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
      .catch(() => router.push(`/dashboard/inhalte${courseQuery}`));

    if (!isNew) {
      fetch(`/api/admin/course${courseQuery}`)
        .then((r) => r.json())
        .then((d) => {
          const modId = Number(idParam);
          const allExam = d.course?.exam ?? [];
          setPoolNumberMap(buildPoolQuestionNumberMap(allExam));
          const qs = allExam.filter(
            (q: ExamItem & { moduleId: number }) => q.moduleId === modId
          );
          setExamQuestions(sortExamQuestionsForDisplay(qs));
        });
    }
  }, [idParam, isNew, router, courseQuery]);

  async function save() {
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
    if (isNew) {
      router.push(`/dashboard/inhalte/modul/${data.module.id}${courseQuery}`);
    }
  }

  async function remove() {
    if (isNew) return;
    if (!confirm("Modul und alle Lerninhalte wirklich löschen?")) return;

    const res = await fetch(`/api/admin/course/modules/${idParam}${courseQuery}`, {
      method: "DELETE",
    });
    if (res.ok) router.push(`/dashboard/inhalte${courseQuery}`);
    else setError("Löschen fehlgeschlagen.");
  }

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title={isNew ? "Neues Modul" : `Modul ${idParam}`} />
      <p className="mb-4 text-sm text-slate-600">
        <Link
          href={`/dashboard/inhalte${courseQuery}`}
          className="font-medium text-brand hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>
      </p>

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
              <Link href={`/dashboard/inhalte/modul/${idParam}/lektion/neu${courseQuery}`}>
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
                      href={`/dashboard/inhalte/modul/${idParam}/lektion/${l.id}${courseQuery}`}
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
              <Link href={`/dashboard/inhalte/frage/neu?module=${idParam}${courseId ? `&courseId=${encodeURIComponent(courseId)}` : ""}`}>
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
                      <p className="text-xs text-slate-400">
                        {formatPoolQuestionDisplayNumber(poolNumberMap, q.id)} ·{" "}
                        {getQuestionTypeLabel(q.type)}
                      </p>
                      <p className="font-medium">{q.question}</p>
                    </div>
                    <Link href={`/dashboard/inhalte/frage/${q.id}${courseQuery}`}>
                      <Button variant="secondary">Bearbeiten</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
    </div>
  );
}

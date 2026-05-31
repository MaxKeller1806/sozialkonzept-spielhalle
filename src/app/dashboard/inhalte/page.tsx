"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader, Button, Card } from "@/components/ui";

interface CourseOverview {
  courseName: string;
  version: string;
  totalQuestions: number;
  passingScore: number;
  minCorrectAnswers: number;
  examQuestionsPerTest?: number;
  modules: { id: number; title: string; duration: number; lessons: { id: number; title: string }[] }[];
  exam: { id: number; moduleId: number; question: string; type: string }[];
}

export default function InhaltePage() {
  return (
    <Suspense fallback={<div className="p-8">Lädt…</div>}>
      <InhalteContent />
    </Suspense>
  );
}

function InhalteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseQuery = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [passingScoreInput, setPassingScoreInput] = useState("80");
  const [savingScore, setSavingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/admin/course${courseQuery}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.course) {
          setCourse(d.course);
          setPassingScoreInput(String(d.course.passingScore));
        }
        setLoading(false);
      });
  }, [router, courseQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const examByModule = useMemo(() => {
    if (!course) return [];
    return course.modules.map((mod) => ({
      module: mod,
      questions: course.exam
        .filter((q) => q.moduleId === mod.id)
        .sort((a, b) => a.id - b.id),
    }));
  }, [course]);

  const unassigned = useMemo(() => {
    if (!course) return [];
    const moduleIds = new Set(course.modules.map((m) => m.id));
    return course.exam.filter((q) => !moduleIds.has(q.moduleId));
  }, [course]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function savePassingScore(e: React.FormEvent) {
    e.preventDefault();
    setSavingScore(true);
    setScoreMessage("");

    const res = await fetch(`/api/admin/course${courseQuery}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passingScore: Number(passingScoreInput) }),
    });
    const data = await res.json();
    setSavingScore(false);

    if (!res.ok) {
      setScoreMessage(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setCourse(data.course);
    setPassingScoreInput(String(data.course.passingScore));
    setScoreMessage("Bestehensgrenze gespeichert.");
  }

  const perTest = course?.examQuestionsPerTest ?? course?.totalQuestions ?? 15;
  const minCorrect = Math.ceil(
    (perTest * Number(passingScoreInput || course?.passingScore || 80)) / 100
  );

  if (loading || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center">Lädt…</div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title="Kursinhalte bearbeiten" />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <AdminNav active="inhalte" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {course.courseName} · Version {course.version} · Bestehen ab{" "}
            {course.passingScore} % ({course.totalQuestions} Fragen)
          </p>
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Abmelden
          </button>
        </div>

        <Card className="mb-8">
          <h2 className="text-lg font-bold">Bestehensgrenze Abschlusstest</h2>
          <p className="mt-2 text-sm text-slate-600">
            Legen Sie fest, ab welchem Prozentsatz der Test bestanden gilt. Pro
            Durchlauf werden {perTest} Fragen aus dem Pool gestellt.
          </p>
          <form
            onSubmit={savePassingScore}
            className="mt-4 flex flex-wrap items-end gap-4"
          >
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Mindestquote (%)
              </span>
              <input
                type="number"
                min={50}
                max={100}
                step={1}
                value={passingScoreInput}
                onChange={(e) => setPassingScoreInput(e.target.value)}
                className="mt-1 block w-28 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <p className="text-sm text-slate-600">
              = mindestens <strong>{minCorrect}</strong> von {perTest} Fragen
              richtig
            </p>
            <Button type="submit" disabled={savingScore}>
              {savingScore ? "Speichern…" : "Speichern"}
            </Button>
          </form>
          {scoreMessage && (
            <p
              className={`mt-3 text-sm ${
                scoreMessage.includes("fehl") ? "text-red-600" : "text-green-700"
              }`}
            >
              {scoreMessage}
            </p>
          )}
        </Card>

        <Card className="mb-8 border-brand-light bg-brand-light">
          <h2 className="text-lg font-bold text-brand">
            PDF für Behördennachweis
          </h2>
          <p className="mt-2 text-sm text-brand">
            Lerninhalte und Fragenkatalog inkl. Musterlösungen als PDF
            herunterladen und archivieren.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a href={`/api/admin/export/lerninhalte/pdf${courseQuery}`} className="flex-1">
              <Button className="w-full">Lerninhalte als PDF</Button>
            </a>
            <a href={`/api/admin/export/pruefung/pdf${courseQuery}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                Abschlusstest als PDF
              </Button>
            </a>
          </div>
        </Card>

        <Card className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Lernmodule</h2>
            <Link href="/dashboard/inhalte/modul/neu">
              <Button>+ Modul anlegen</Button>
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {course.modules.map((m) => {
              const qCount = course.exam.filter((q) => q.moduleId === m.id).length;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold">
                      {m.id}. {m.title}
                    </p>
                    <p className="text-sm text-slate-500">
                      ca. {m.duration} Min. · {m.lessons?.length ?? 0} Lerninhalt
                      {(m.lessons?.length ?? 0) !== 1 ? "e" : ""} · {qCount} Prüfungsfrage
                      {qCount !== 1 ? "n" : ""}
                    </p>
                  </div>
                  <Link href={`/dashboard/inhalte/modul/${m.id}`}>
                    <Button variant="secondary">Bearbeiten</Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Abschlusstest – Fragen</h2>
              <p className="text-sm text-slate-500">Nach Modulen gruppiert</p>
            </div>
            <Link href="/dashboard/inhalte/frage/neu">
              <Button>+ Frage anlegen</Button>
            </Link>
          </div>

          <div className="space-y-8">
            {examByModule.map(({ module: mod, questions }) => (
              <section key={mod.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-brand-light pb-2">
                  <h3 className="font-semibold text-brand">
                    Modul {mod.id}: {mod.title}
                  </h3>
                  <Link href={`/dashboard/inhalte/frage/neu?module=${mod.id}`}>
                    <span className="text-sm font-medium text-brand hover:underline">
                      + Frage zu diesem Modul
                    </span>
                  </Link>
                </div>
                {questions.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">
                    Noch keine Fragen für dieses Modul.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {questions.map((q) => (
                      <li
                        key={q.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase text-slate-400">
                            Frage {q.id} · {q.type}
                          </p>
                          <p className="font-medium">{q.question}</p>
                        </div>
                        <Link
                          href={`/dashboard/inhalte/frage/${q.id}`}
                          className="shrink-0"
                        >
                          <Button variant="secondary">Bearbeiten</Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {unassigned.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold text-amber-800">
                  Ohne Modulzuordnung
                </h3>
                <ul className="divide-y divide-slate-100">
                  {unassigned.map((q) => (
                    <li key={q.id} className="py-3">
                      <Link
                        href={`/dashboard/inhalte/frage/${q.id}`}
                        className="text-brand underline"
                      >
                        {q.question}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Änderungen werden in <code className="rounded bg-slate-100 px-1">data/course.json</code>{" "}
          gespeichert und sind sofort in der Schulung aktiv.
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card } from "@/components/ui";
import { isMasterCourseId } from "@/lib/course-editor-id";

interface CourseOverview {
  courseId: string;
  courseName: string;
  version: string;
  totalQuestions: number;
  passingScore: number;
  minCorrectAnswers: number;
  examQuestionsPerTest?: number;
  examPoolSize?: number;
  modules: { id: number; title: string; duration: number; lessons: { id: number; title: string }[] }[];
  exam: {
    id: number;
    moduleId: number;
    question: string;
    type: string;
    sourceType?: string;
    active?: boolean;
    poolQuestionType?: string;
  }[];
}

interface ContentStates {
  modules: Record<string, boolean>;
  lessons: Record<string, boolean>;
  questions: Record<string, boolean>;
}

function DeactivatedBadge() {
  return (
    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      durch Certiano deaktiviert
    </span>
  );
}

export default function InhaltePage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>}>
      <InhalteContent />
    </Suspense>
  );
}

function InhalteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  useEffect(() => {
    if (!courseId) {
      router.replace("/dashboard/seminare");
    }
  }, [courseId, router]);

  if (!courseId) {
    return <p className="px-4 py-8 text-sm text-slate-600">Weiterleitung…</p>;
  }

  return <InhalteEditor courseId={courseId} />;
}

function InhalteEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const isMaster = isMasterCourseId(courseId);
  const courseQuery = `?courseId=${encodeURIComponent(courseId)}`;
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(courseId);
  const [contentStates, setContentStates] = useState<ContentStates | null>(null);
  const [permissions, setPermissions] = useState({
    canEditContent: true,
    canEditTests: true,
    canAddModules: true,
    canEditPassingScore: true,
    readOnly: false,
    fromMaster: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passingScoreInput, setPassingScoreInput] = useState("80");
  const [savingScore, setSavingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/course${courseQuery}`)
      .then((r) => {
        if (r.status === 401) {
          router.push(isMaster ? "/certiano/login" : "/login");
          return null;
        }
        if (r.status === 403) {
          return r.json().then((d) => ({ forbidden: true as const, error: d.error }));
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;

        if ("forbidden" in d && d.forbidden) {
          setError(d.error ?? "Zugriff verweigert.");
          setCourse(null);
          return;
        }

        if (d.error) {
          setError(d.error);
          setCourse(null);
          return;
        }

        const id = d.courseId ?? d.course?.courseId ?? null;

        if (d.course) {
          setCourse(d.course);
          setResolvedCourseId(id);
          setPassingScoreInput(String(d.course.passingScore));
        } else {
          setCourse(null);
          setResolvedCourseId(id);
        }

        if (d.permissions) {
          setPermissions(d.permissions);
        }
        if (d.contentStates) {
          setContentStates(d.contentStates);
        }
      })
      .catch(() => {
        setError("Kurs konnte nicht geladen werden.");
        setCourse(null);
      })
      .finally(() => setLoading(false));
  }, [router, courseQuery, courseId, isMaster]);

  useEffect(() => {
    load();
  }, [load]);

  const poolSize = course?.examPoolSize ?? course?.exam.filter((q) => q.active !== false).length ?? 0;

  const hasContent =
    course &&
    (course.modules.length > 0 || course.exam.length > 0);

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
  const poolSizeDisplay = poolSize;
  const minCorrect = Math.ceil(
    (perTest * Number(passingScoreInput || course?.passingScore || 80)) / 100
  );

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader title="Kursinhalte bearbeiten" />
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-800">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Kursinhalte bearbeiten" />

        <p className="mb-4 text-sm text-slate-600">
          {isMaster ? (
            <Link
              href={`/certiano/master-courses/${encodeURIComponent(courseId)}`}
              className="text-brand underline"
            >
              ← Zurück zum Master-Seminar
            </Link>
          ) : (
            <>
              <Link href="/dashboard/seminare" className="text-brand underline">
                ← Zur Seminarliste
              </Link>
              {" · "}
              <Link
                href={`/dashboard/seminare/${encodeURIComponent(courseId)}`}
                className="text-brand underline"
              >
                Seminar-Einstellungen
              </Link>
            </>
          )}
        </p>

        {permissions.readOnly && !isMaster && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-900">
              Dieser Kurs wird von Certiano bereitgestellt und kann von Ihrer Firma
              nicht bearbeitet werden. Sie können Inhalte einsehen, Mitarbeiter
              zuweisen und PDFs exportieren.
            </p>
          </Card>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-800">
              {course?.courseName ?? "Kurs"}
            </p>
            <p className="text-sm text-slate-600">
              Kurs-ID: <code className="rounded bg-slate-100 px-1">{resolvedCourseId ?? "—"}</code>
              {course && (
                <>
                  {" "}
                  · Version {course.version} · Bestehen ab {course.passingScore} % (
                  {course.totalQuestions} Fragen)
                </>
              )}
            </p>
          </div>
        </div>

        {!hasContent && (
          <Card className="mb-8 border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-700">
              Für diesen Kurs wurden noch keine Inhalte gefunden.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Prüfen Sie unter{" "}
              <Link href="/dashboard/seminare" className="text-brand underline">
                Seminare
              </Link>
              , ob der richtige Kurs ausgewählt ist.
            </p>
          </Card>
        )}

        {course && (
          <>
            <Card className="mb-8">
              <h2 className="text-lg font-bold">Bestehensgrenze Abschlusstest</h2>
              {permissions.fromMaster && !permissions.canEditPassingScore && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Die Bestehensgrenze wird durch Certiano vorgegeben und kann nur mit
                  Freigabe des Superusers geändert werden.
                </p>
              )}
              <p className="mt-2 text-sm text-slate-600">
                Legen Sie fest, ab welchem Prozentsatz der Test bestanden gilt. Pro
                Durchlauf werden {perTest} Fragen zufällig aus dem Fragenpool ({poolSizeDisplay}{" "}
                Fragen) gestellt.
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
                    disabled={!permissions.canEditPassingScore}
                    className="mt-1 block w-28 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  />
                </label>
                <p className="text-sm text-slate-600">
                  = mindestens <strong>{minCorrect}</strong> von {perTest} Fragen
                  richtig
                </p>
                <Button
                  type="submit"
                  disabled={savingScore || !permissions.canEditPassingScore}
                >
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
                {permissions.canAddModules && (
                  <Link href={`/dashboard/inhalte/modul/neu${courseQuery}`}>
                    <Button>+ Modul anlegen</Button>
                  </Link>
                )}
              </div>
              {course.modules.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Für diesen Kurs wurden noch keine Inhalte gefunden.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {course.modules.map((m) => {
                    const qCount = course.exam.filter((q) => q.moduleId === m.id).length;
                    const moduleActive = contentStates?.modules[String(m.id)] !== false;
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="font-semibold">
                            {m.id}. {m.title}
                            {!moduleActive && <DeactivatedBadge />}
                          </p>
                          <p className="text-sm text-slate-500">
                            ca. {m.duration} Min. · {m.lessons?.length ?? 0} Lerninhalt
                            {(m.lessons?.length ?? 0) !== 1 ? "e" : ""} · {qCount} Prüfungsfrage
                            {qCount !== 1 ? "n" : ""}
                          </p>
                        </div>
                        {permissions.canEditContent ? (
                          <Link href={`/dashboard/inhalte/modul/${m.id}${courseQuery}`}>
                            <Button variant="secondary">Bearbeiten</Button>
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">Nur Ansicht</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Fragenpool – Prüfungsfragen</h2>
                  <p className="text-sm text-slate-500">
                    {poolSizeDisplay} Fragen im Pool · {perTest} zufällige Fragen pro Test
                  </p>
                </div>
                {permissions.canEditTests && (
                  <Link href={`/dashboard/inhalte/frage/neu${courseQuery}`}>
                    <Button>+ Frage anlegen</Button>
                  </Link>
                )}
              </div>

              {permissions.fromMaster && (
                <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Master-Fragen (Certiano) sind schreibgeschützt. Sie können eigene
                  betriebliche Fragen ergänzen.
                </p>
              )}

              {course.exam.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Noch keine Fragen im Fragenpool.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {course.exam
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map((q) => {
                      const questionActive =
                        contentStates?.questions[String(q.id)] !== false && q.active !== false;
                      const isMasterQuestion = q.sourceType === "master";
                      const typeLabel = q.poolQuestionType ?? q.type;
                      return (
                        <li
                          key={q.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase text-slate-400">
                              Frage {q.id} · {typeLabel}
                              {isMasterQuestion && (
                                <span className="ml-2 normal-case text-brand">Master</span>
                              )}
                              {q.sourceType === "company" && permissions.fromMaster && (
                                <span className="ml-2 normal-case text-emerald-700">
                                  Betrieblich
                                </span>
                              )}
                              {!questionActive && <DeactivatedBadge />}
                            </p>
                            <p className="font-medium">{q.question}</p>
                          </div>
                          {permissions.canEditTests && !isMasterQuestion ? (
                            <Link
                              href={`/dashboard/inhalte/frage/${q.id}${courseQuery}`}
                              className="shrink-0"
                            >
                              <Button variant="secondary">Bearbeiten</Button>
                            </Link>
                          ) : isMasterQuestion && permissions.canEditTests && isMaster ? (
                            <Link
                              href={`/dashboard/inhalte/frage/${q.id}${courseQuery}`}
                              className="shrink-0"
                            >
                              <Button variant="secondary">Bearbeiten</Button>
                            </Link>
                          ) : isMasterQuestion ? (
                            <span className="text-sm text-slate-400">Nur Ansicht</span>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              )}
            </Card>
          </>
        )}

      <p className="mt-6 text-center text-xs text-slate-500">
        Änderungen werden in der Firmenkurs-Datenbank gespeichert und sind nach dem
        Speichern in der Schulung sichtbar (sofern nicht durch Certiano deaktiviert).
      </p>
    </div>
  );
}

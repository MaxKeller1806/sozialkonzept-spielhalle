"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { CourseBreadcrumb } from "@/components/course-breadcrumb";
import { CourseHubNav } from "@/components/course-hub-tabs";
import { CompanyCourseSettingsPanel } from "@/components/company-course-settings-panel";
import { MasterCourseSettingsPanel } from "@/components/master-course-settings-panel";
import { ModuleEditorSection } from "@/components/module-editor-section";
import { Button, Card } from "@/components/ui";
import { courseHubBreadcrumb } from "@/lib/course-editor-breadcrumbs";
import {
  courseInhalteHubHref,
  parseInhalteBereich,
  type InhalteBereich,
} from "@/lib/course-inhalte-url";
import { isMasterCourseId } from "@/lib/course-editor-id";
import {
  buildPoolQuestionNumberMap,
  formatInternalQuestionIdHint,
  formatPoolQuestionDisplayNumber,
  getQuestionTypeLabel,
  sortExamQuestionsForDisplay,
} from "@/lib/exam-pool-display";

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

interface CourseMetaSummary {
  statusLabel: string;
  validityLabel: string;
  updatedAt: string | null;
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

function formatStatusLabel(status: string): string {
  if (status === "disabled") return "Gesperrt";
  if (status === "published") return "Veröffentlicht";
  if (status === "draft") return "Entwurf";
  if (status === "Archiviert" || status === "Aktiv") return status;
  return status;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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
  const searchParams = useSearchParams();
  const bereich = parseInhalteBereich(searchParams.get("bereich"));
  const expandedModul = searchParams.get("modul");
  const isMaster = isMasterCourseId(courseId);
  const courseQuery = `?courseId=${encodeURIComponent(courseId)}`;

  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [metaSummary, setMetaSummary] = useState<CourseMetaSummary | null>(null);
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

  useEffect(() => {
    if (expandedModul && bereich !== "module" && bereich !== "fragen") {
      router.replace(
        courseInhalteHubHref(courseId, { bereich: "module", modul: expandedModul })
      );
    }
  }, [expandedModul, bereich, courseId, router]);

  const loadMeta = useCallback(async () => {
    try {
      if (isMaster) {
        const res = await fetch(
          `/api/superuser/master-courses/${encodeURIComponent(courseId)}`
        );
        const d = await res.json().catch(() => ({}));
        const meta = d.meta ?? {};
        setMetaSummary({
          statusLabel: String(meta.status ?? "draft"),
          validityLabel: String(meta.validityLabel ?? "—"),
          updatedAt: meta.updatedAt ? String(meta.updatedAt) : null,
        });
      } else {
        const res = await fetch(
          `/api/admin/courses/${encodeURIComponent(courseId)}`
        );
        const d = await res.json().catch(() => ({}));
        const c = d.course ?? {};
        setMetaSummary({
          statusLabel: c.active === false ? "Archiviert" : "Aktiv",
          validityLabel: String(c.validityLabel ?? "—"),
          updatedAt: c.updatedAt ? String(c.updatedAt) : null,
        });
      }
    } catch {
      setMetaSummary(null);
    }
  }, [courseId, isMaster]);

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
  }, [router, courseQuery, isMaster]);

  useEffect(() => {
    load();
    void loadMeta();
  }, [load, loadMeta]);

  const poolSize =
    course?.examPoolSize ?? course?.exam.filter((q) => q.active !== false).length ?? 0;
  const poolNumberMap = course
    ? buildPoolQuestionNumberMap(course.exam)
    : new Map<number, number>();

  const perTest = course?.examQuestionsPerTest ?? course?.totalQuestions ?? 15;
  const minCorrect = course
    ? Math.ceil((perTest * course.passingScore) / 100)
    : 0;

  const filteredExam = useMemo(() => {
    if (!course) return [];
    const sorted = sortExamQuestionsForDisplay(course.exam);
    if (bereich === "fragen" && expandedModul && expandedModul !== "neu") {
      const modId = Number(expandedModul);
      if (Number.isFinite(modId)) {
        return sorted.filter((q) => q.moduleId === modId);
      }
    }
    return sorted;
  }, [course, bereich, expandedModul]);

  const fragenFilterModul =
    bereich === "fragen" && expandedModul && expandedModul !== "neu"
      ? Number(expandedModul)
      : null;

  function toggleModule(moduleId: number) {
    const isExpanded =
      bereich === "module" && expandedModul === String(moduleId);
    router.push(
      isExpanded
        ? courseInhalteHubHref(courseId, { bereich: "module" })
        : courseInhalteHubHref(courseId, { bereich: "module", modul: moduleId })
    );
  }

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

  const courseName = course?.courseName ?? "Seminar";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={courseName} />

      <CourseBreadcrumb items={courseHubBreadcrumb(courseId, courseName, bereich)} />

      {course && (
        <CourseHubNav
          courseId={courseId}
          active={bereich}
          showVorschauLink={!isMaster && bereich === "uebersicht"}
          vorschauHref={
            !isMaster
              ? `/dashboard/seminare/${encodeURIComponent(courseId)}/vorschau`
              : undefined
          }
        />
      )}

      {permissions.readOnly && !isMaster && bereich !== "einstellungen" && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Dieser Kurs wird von Certiano bereitgestellt und kann von Ihrer Firma
            nicht bearbeitet werden. Sie können Inhalte einsehen, Mitarbeiter
            zuweisen und PDFs exportieren.
          </p>
        </Card>
      )}

      {course && bereich === "uebersicht" && (
        <Card className="mb-8">
          <h2 className="text-lg font-bold">Seminarübersicht</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Titel</dt>
              <dd className="mt-1 font-medium text-slate-900">{courseName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
              <dd className="mt-1 text-slate-800">
                {formatStatusLabel(metaSummary?.statusLabel ?? "—")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Version</dt>
              <dd className="mt-1 text-slate-800">{course.version}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Gültigkeit</dt>
              <dd className="mt-1 text-slate-800">{metaSummary?.validityLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">
                Bestehensgrenze
              </dt>
              <dd className="mt-1 text-slate-800">
                {course.passingScore} % (min. {minCorrect} von {perTest} Fragen)
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Kurs-ID</dt>
              <dd className="mt-1">
                <code className="rounded bg-slate-100 px-1 text-sm">
                  {resolvedCourseId ?? "—"}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Module</dt>
              <dd className="mt-1 text-slate-800">{course.modules.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">
                Prüfungsfragen (Pool)
              </dt>
              <dd className="mt-1 text-slate-800">{poolSize}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-slate-500">
                Letzte Änderung
              </dt>
              <dd className="mt-1 text-slate-800">
                {formatDate(metaSummary?.updatedAt ?? null)}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={courseInhalteHubHref(courseId, { bereich: "module" })}>
              <Button variant="secondary">Module verwalten</Button>
            </Link>
            <Link href={courseInhalteHubHref(courseId, { bereich: "fragen" })}>
              <Button variant="secondary">Prüfungsfragen</Button>
            </Link>
            <Link href={courseInhalteHubHref(courseId, { bereich: "export" })}>
              <Button variant="secondary">Export</Button>
            </Link>
            {!isMaster && (
              <Link
                href={`/dashboard/seminare/${encodeURIComponent(courseId)}/vorschau`}
              >
                <Button variant="secondary">Mitarbeiter-Vorschau</Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {course && bereich === "einstellungen" && (
        <>
          {isMaster ? (
            <MasterCourseSettingsPanel
              courseId={courseId}
              moduleCount={course.modules.length}
              examCount={course.exam.length}
              onSaved={() => {
                load();
                void loadMeta();
              }}
            />
          ) : (
            <CompanyCourseSettingsPanel
              courseId={courseId}
              onSaved={() => {
                load();
                void loadMeta();
              }}
            />
          )}
        </>
      )}

      {course && bereich === "export" && (
        <>
          <Card className="mb-8">
            <h2 className="text-lg font-bold">Abschlusstest</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bestehen ab <strong>{course.passingScore} %</strong> = mindestens{" "}
              <strong>{minCorrect}</strong> von {perTest} Fragen richtig. Pro
              Durchlauf werden {perTest} Fragen zufällig aus dem Fragenpool (
              {poolSize} Fragen) gestellt.
            </p>
            {permissions.fromMaster && !permissions.canEditPassingScore && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Die Bestehensgrenze wird durch Certiano vorgegeben.
              </p>
            )}
            <p className="mt-3 text-sm text-slate-600">
              Bestehensgrenze anpassen unter{" "}
              <Link
                href={courseInhalteHubHref(courseId, { bereich: "einstellungen" })}
                className="text-brand underline"
              >
                Einstellungen
              </Link>
              .
            </p>
          </Card>

          <Card className="mb-8 border-brand-light bg-brand-light">
            <h2 className="text-lg font-bold text-brand">PDF für Behördennachweis</h2>
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

          {!isMaster && (
            <Card>
              <h2 className="text-lg font-bold">Firmenweite Nachweise</h2>
              <p className="mt-2 text-sm text-slate-600">
                Zertifikats-PDFs und CSV-Übersicht für Mitarbeiter-Audits.
              </p>
              <Link href="/dashboard/audit-export" className="mt-4 inline-block">
                <Button variant="secondary">Audit-Export öffnen</Button>
              </Link>
            </Card>
          )}
        </>
      )}

      {course && bereich === "module" && (
        <Card className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Lernmodule</h2>
            {permissions.canAddModules && (
              <Link href={courseInhalteHubHref(courseId, { bereich: "module", modul: "neu" })}>
                <Button>+ Modul anlegen</Button>
              </Link>
            )}
          </div>

          {expandedModul === "neu" && permissions.canAddModules && (
            <div className="mb-6 rounded-xl border border-brand/30 bg-brand-light/30 p-4">
              <p className="mb-2 font-semibold text-slate-900">Neues Modul</p>
              <ModuleEditorSection
                courseId={courseId}
                moduleId="neu"
                canEditContent={permissions.canEditContent}
                questionCount={0}
                onSaved={load}
              />
            </div>
          )}

          {course.modules.length === 0 && expandedModul !== "neu" ? (
            <p className="text-sm text-slate-500 italic">
              Noch keine Module angelegt.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {course.modules.map((m) => {
                const qCount = course.exam.filter((q) => q.moduleId === m.id).length;
                const moduleActive = contentStates?.modules[String(m.id)] !== false;
                const isExpanded = expandedModul === String(m.id);
                return (
                  <li key={m.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleModule(m.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-semibold">
                          <span className="mr-1 text-slate-400" aria-hidden="true">
                            {isExpanded ? "▾" : "▸"}
                          </span>
                          {m.id}. {m.title}
                          {!moduleActive && <DeactivatedBadge />}
                        </p>
                        <p className="text-sm text-slate-500">
                          ca. {m.duration} Min. · {m.lessons?.length ?? 0} Lerninhalt
                          {(m.lessons?.length ?? 0) !== 1 ? "e" : ""} · {qCount}{" "}
                          Prüfungsfrage
                          {qCount !== 1 ? "n" : ""}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {qCount > 0 && (
                          <Link
                            href={courseInhalteHubHref(courseId, {
                              bereich: "fragen",
                              modul: m.id,
                            })}
                          >
                            <Button type="button" variant="secondary">
                              Fragen
                            </Button>
                          </Link>
                        )}
                        {permissions.canEditContent && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => toggleModule(m.id)}
                          >
                            {isExpanded ? "Einklappen" : "Bearbeiten"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <ModuleEditorSection
                        courseId={courseId}
                        moduleId={m.id}
                        canEditContent={permissions.canEditContent}
                        questionCount={qCount}
                        onSaved={load}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {course && bereich === "fragen" && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Fragenpool – Prüfungsfragen</h2>
              <p className="text-sm text-slate-500">
                {fragenFilterModul != null
                  ? `${filteredExam.length} Fragen in Modul ${fragenFilterModul} · `
                  : ""}
                {poolSize} Fragen im Pool · {perTest} zufällige Fragen pro Test
              </p>
            </div>
            {permissions.canEditTests && (
              <Link
                href={
                  fragenFilterModul != null
                    ? `/dashboard/inhalte/frage/neu?module=${fragenFilterModul}&courseId=${encodeURIComponent(courseId)}`
                    : `/dashboard/inhalte/frage/neu${courseQuery}`
                }
              >
                <Button>+ Frage anlegen</Button>
              </Link>
            )}
          </div>

          {fragenFilterModul != null && (
            <p className="mb-4 text-sm text-slate-600">
              Gefiltert nach Modul {fragenFilterModul}.{" "}
              <Link
                href={courseInhalteHubHref(courseId, { bereich: "fragen" })}
                className="text-brand underline"
              >
                Filter aufheben
              </Link>
            </p>
          )}

          {permissions.fromMaster && (
            <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Master-Fragen (Certiano) sind schreibgeschützt. Sie können eigene
              betriebliche Fragen ergänzen.
            </p>
          )}

          {filteredExam.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              {fragenFilterModul != null
                ? "Keine Fragen für dieses Modul."
                : "Noch keine Fragen im Fragenpool."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredExam.map((q) => {
                const questionActive =
                  contentStates?.questions[String(q.id)] !== false &&
                  q.active !== false;
                const isMasterQuestion = q.sourceType === "master";
                const typeLabel = getQuestionTypeLabel(q.poolQuestionType ?? q.type);
                const displayNumber = formatPoolQuestionDisplayNumber(poolNumberMap, q.id);
                const internalIdHint = formatInternalQuestionIdHint(q.id, isMaster);
                return (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase text-slate-400">
                        {displayNumber} · Modul {q.moduleId} · {typeLabel}
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
                      {internalIdHint && (
                        <p className="text-xs text-slate-400">{internalIdHint}</p>
                      )}
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
      )}

      <p className="mt-6 text-center text-xs text-slate-500">
        {isMaster
          ? "Änderungen werden im Master-Seminar gespeichert und bei Firmen-Provisionierung übernommen."
          : "Änderungen werden in der Firmenkurs-Datenbank gespeichert und sind nach dem Speichern in der Schulung sichtbar (sofern nicht durch Certiano deaktiviert)."}
      </p>
    </div>
  );
}

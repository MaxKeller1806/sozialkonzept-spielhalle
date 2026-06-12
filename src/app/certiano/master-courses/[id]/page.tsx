"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, Input } from "@/components/ui";
import { ValidityRuleForm, type ValidityRuleFormValue } from "@/components/validity-rule-form";
import type { ValidityType } from "@/lib/course-validity";
import {
  buildPoolQuestionNumberMap,
  formatInternalQuestionIdHint,
  formatPoolQuestionDisplayNumber,
  getQuestionTypeLabel,
  sortExamQuestionsForDisplay,
} from "@/lib/exam-pool-display";

interface CourseOverview {
  courseName: string;
  version: string;
  passingScore: number;
  modules: {
    id: number;
    title: string;
    duration: number;
    lessons: { id: number; title: string }[];
  }[];
  exam: { id: number; moduleId: number; question: string; type: string }[];
}

interface ImportHint {
  masterEmpty: boolean;
  sourceAvailable: boolean;
  sourceTitle: string | null;
  sourceCourseId: string | null;
}

function normalizeCourse(raw: CourseOverview): CourseOverview {
  return {
    ...raw,
    modules: (raw.modules ?? []).map((m) => ({
      ...m,
      lessons: m.lessons ?? [],
    })),
    exam: raw.exam ?? [],
  };
}

function applyMetaToForm(
  meta: Record<string, unknown>,
  setters: {
    setMeta: (v: { title: string; status: string }) => void;
    setSelectedTopicIds: (v: number[]) => void;
    setValidity: (v: ValidityRuleFormValue) => void;
  }
) {
  setters.setMeta({
    title: String(meta.title ?? ""),
    status: String(meta.status ?? "draft"),
  });
  setters.setSelectedTopicIds(
    Array.isArray(meta.topicIds)
      ? meta.topicIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : []
  );
  setters.setValidity({
    validityType: (meta.validityType as ValidityType) ?? "yearly",
    validityIntervalValue: String(meta.validityIntervalValue ?? 12),
    validityIntervalUnit: (meta.validityIntervalUnit as ValidityRuleFormValue["validityIntervalUnit"]) ?? "months",
  });
}

type TopicOption = { id: number; name: string };

let cachedSuperuserTopicOptions: TopicOption[] | null = null;
let superuserTopicOptionsInflight: Promise<TopicOption[]> | null = null;

function loadSuperuserTopicOptions(): Promise<TopicOption[]> {
  if (cachedSuperuserTopicOptions) {
    return Promise.resolve(cachedSuperuserTopicOptions);
  }
  if (!superuserTopicOptionsInflight) {
    superuserTopicOptionsInflight = fetch("/api/superuser/course-topics?filter=active")
      .then((r) => (r.ok ? r.json() : { topics: [] }))
      .then((d) => {
        const topics = (d.topics ?? []).map((t: { id: number; name: string }) => ({
          id: t.id,
          name: t.name,
        }));
        cachedSuperuserTopicOptions = topics;
        return topics;
      })
      .catch(() => [] as TopicOption[])
      .finally(() => {
        superuserTopicOptionsInflight = null;
      });
  }
  return superuserTopicOptionsInflight;
}

/** Inner component – remounted via key={courseId} on every route change. */
function MasterCourseEditContent({ courseId }: { courseId: string }) {
  const [meta, setMeta] = useState({ title: "", status: "draft" });
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [importHint, setImportHint] = useState<ImportHint | null>(null);
  const [passingScore, setPassingScore] = useState("80");
  const [validity, setValidity] = useState<ValidityRuleFormValue>({
    validityType: "yearly",
    validityIntervalValue: "12",
    validityIntervalUnit: "months",
  });
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [topics, setTopics] = useState<{ id: number; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSuperuserTopicOptions().then((loaded) => {
      if (!cancelled) setTopics(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!courseId) {
      setError("Master-Seminar konnte nicht geladen werden.");
      setMetaLoaded(false);
      setCourse(null);
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError("");
    setMessage("");
    setMetaLoaded(false);
    setCourse(null);
    setImportHint(null);

    const url = `/api/superuser/master-courses/${encodeURIComponent(courseId)}`;

    (async () => {
      try {
        const res = await fetch(url);
        if (cancelled) return;

        if (res.status === 403 || res.status === 401) {
          window.location.replace("/certiano/login");
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setMetaLoaded(false);
          setCourse(null);
          setError(
            res.status === 503
              ? "Datenbankverbindung unterbrochen. Bitte Seite neu laden."
              : typeof data.error === "string"
                ? data.error
                : "Master-Seminar konnte nicht geladen werden."
          );
          return;
        }

        if (data?.meta) {
          applyMetaToForm(data.meta, { setMeta, setSelectedTopicIds, setValidity });
          setMetaLoaded(true);
        }

        if (data?.course) {
          const normalized = normalizeCourse(data.course as CourseOverview);
          setCourse(normalized);
          setPassingScore(String(normalized.passingScore ?? 80));
        }

        if (data?.importHint) {
          setImportHint(data.importHint);
        }
      } catch {
        if (!cancelled) {
          setMetaLoaded(false);
          setCourse(null);
          setError("Master-Seminar konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (saving || pageLoading) return;

    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      title: meta.title,
      status: meta.status,
      passingScore: Number(passingScore),
      validityType: validity.validityType,
      validityIntervalValue:
        validity.validityType === "custom"
          ? Number(validity.validityIntervalValue)
          : null,
      validityIntervalUnit:
        validity.validityType === "custom" ? validity.validityIntervalUnit : null,
      topicIds: selectedTopicIds,
    };

    try {
      const res = await fetch(
        `/api/superuser/master-courses/${encodeURIComponent(courseId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const d = await res.json().catch(() => ({}));

      if (res.ok) {
        setMessage("Master-Seminar gespeichert.");
        if (d.meta) {
          applyMetaToForm(d.meta, { setMeta, setSelectedTopicIds, setValidity });
          setMetaLoaded(true);
        }
        if (d.course) {
          const normalized = normalizeCourse(d.course as CourseOverview);
          setCourse(normalized);
          setPassingScore(String(normalized.passingScore ?? 80));
        }
      } else {
        setError(
          res.status === 503
            ? "Datenbankverbindung unterbrochen. Bitte erneut versuchen."
            : typeof d.error === "string"
              ? d.error
              : "Speichern fehlgeschlagen."
        );
      }
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function assignAll() {
    setMessage("");
    setError("");
    const res = await fetch(
      `/api/superuser/master-courses/${encodeURIComponent(courseId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignAll" }),
      }
    );
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage(`Allen ${d.assignedCount} Firmen zugewiesen.`);
    } else {
      setError(typeof d.error === "string" ? d.error : "Zuweisung fehlgeschlagen.");
    }
  }

  async function importFromCompany() {
    setImporting(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(
        `/api/superuser/master-courses/${encodeURIComponent(courseId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "importFromCompanyCourse" }),
        }
      );
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(
          `Inhalte übernommen: ${d.imported?.modules ?? 0} Module, ${d.imported?.lessons ?? 0} Lektionen, ${d.imported?.examQuestions ?? 0} Prüfungsfragen.`
        );
        if (d.course) setCourse(normalizeCourse(d.course as CourseOverview));
        if (d.importHint) setImportHint(d.importHint);
        if (d.meta) {
          applyMetaToForm(d.meta, { setMeta, setSelectedTopicIds, setValidity });
          setMetaLoaded(true);
        }
      } else {
        setError(typeof d.error === "string" ? d.error : "Import fehlgeschlagen.");
      }
    } catch {
      setError("Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  async function addModule() {
    const title = window.prompt("Modultitel:");
    if (!title?.trim()) return;
    const res = await fetch(
      `/api/superuser/master-courses/${encodeURIComponent(courseId)}/modules`,
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
              modules: [
                ...prev.modules,
                { ...d.module, lessons: d.module.lessons ?? [] },
              ].sort((a, b) => a.id - b.id),
            }
          : prev
      );
    } else {
      setError(typeof d.error === "string" ? d.error : "Modul konnte nicht angelegt werden.");
    }
  }

  const modules = course?.modules ?? [];
  const exam = course?.exam ?? [];
  const poolNumberMap = buildPoolQuestionNumberMap(exam);
  const sortedExam = sortExamQuestionsForDisplay(exam);
  const showImportHint =
    importHint?.masterEmpty &&
    importHint.sourceAvailable &&
    modules.length === 0 &&
    exam.length === 0;
  const showContent = metaLoaded || !!course;

  return (
    <>
      <Link
        href="/certiano/master-courses"
        className="mb-4 inline-block text-sm text-brand hover:underline"
      >
        ← Zur Seminarverwaltung
      </Link>

      {pageLoading && (
        <p className="mb-4 text-sm text-slate-600" role="status">
          Lädt…
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      {!pageLoading && !showContent && !error && (
        <Card>
          <p className="text-sm text-slate-600">Master-Seminar nicht gefunden.</p>
        </Card>
      )}

      {!pageLoading && showContent && (
        <>
          {showImportHint && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <p className="mb-3 text-sm text-amber-950">
                Dieser Master-Kurs enthält noch keine Inhalte. Inhalte können aus bestehendem
                Firmenkurs übernommen werden
                {importHint?.sourceTitle ? ` („${importHint.sourceTitle}“)` : ""}.
              </p>
              <Button type="button" onClick={importFromCompany} disabled={importing}>
                {importing ? "Übernehmen…" : "Inhalte aus Firmenkurs übernehmen"}
              </Button>
            </Card>
          )}

          <Card className="mb-6">
            <form onSubmit={saveMeta} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Titel"
                value={meta.title}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                disabled={saving}
              />
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Status</span>
                <select
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  value={meta.status}
                  disabled={saving}
                  onChange={(e) => setMeta({ ...meta, status: e.target.value })}
                >
                  <option value="draft">Entwurf</option>
                  <option value="published">Veröffentlicht</option>
                  <option value="disabled">Gesperrt</option>
                </select>
              </label>
              <fieldset className="block text-sm sm:col-span-2" disabled={saving}>
                <legend className="font-medium text-slate-700">Hauptthemen (optional)</legend>
                <p className="mt-1 mb-2 text-xs text-slate-500">
                  Mehrfachauswahl möglich – wird bei Firmen-Provisionierung übernommen.
                </p>
                {topics.length === 0 ? (
                  <p className="text-sm text-slate-500">Keine Hauptthemen verfügbar.</p>
                ) : (
                  <ul className="space-y-2">
                    {topics.map((t) => (
                      <li key={t.id}>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTopicIds.includes(t.id)}
                            onChange={() =>
                              setSelectedTopicIds((prev) =>
                                prev.includes(t.id)
                                  ? prev.filter((x) => x !== t.id)
                                  : [...prev, t.id]
                              )
                            }
                            className="rounded border-slate-300"
                          />
                          <span>{t.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>
              <Input
                label="Bestehensgrenze (%)"
                type="number"
                min={50}
                max={100}
                value={passingScore}
                disabled={saving}
                onChange={(e) => setPassingScore(e.target.value)}
              />
              <div className="sm:col-span-2">
                <ValidityRuleForm value={validity} onChange={setValidity} disabled={saving} />
              </div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Speichern…" : "Speichern"}
                </Button>
                <Button type="button" variant="secondary" onClick={assignAll} disabled={saving}>
                  Allen Firmen zuweisen
                </Button>
              </div>
            </form>
          </Card>

          <Card className="mb-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Module ({modules.length})</h2>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/inhalte?courseId=${encodeURIComponent(courseId)}`}>
                  <Button type="button">Inhalte bearbeiten</Button>
                </Link>
                <Button type="button" onClick={addModule}>
                  + Modul
                </Button>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Lerninhalte, Verständnisfragen und Prüfungsfragen bearbeiten Sie zentral über
              „Inhalte bearbeiten“.
            </p>
            {modules.length === 0 ? (
              <p className="text-sm text-slate-600">Noch keine Module vorhanden.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {modules.map((m) => (
                  <li key={m.id} className="py-3">
                    <p className="font-semibold">
                      {m.id}. {m.title} · {(m.lessons ?? []).length} Lektionen
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                Prüfungsfragen ({exam.length})
              </h2>
              <Link href={`/dashboard/inhalte?courseId=${encodeURIComponent(courseId)}`}>
                <Button type="button" variant="secondary">
                  Fragenpool bearbeiten
                </Button>
              </Link>
            </div>
            {exam.length === 0 ? (
              <p className="text-sm text-slate-600">Noch keine Prüfungsfragen vorhanden.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sortedExam.map((q) => (
                  <li key={q.id} className="py-3 text-sm">
                    <span className="text-slate-500">
                      {formatPoolQuestionDisplayNumber(poolNumberMap, q.id)} ·{" "}
                      {getQuestionTypeLabel(q.type)}
                      {q.moduleId > 0 ? ` · Modul ${q.moduleId}` : ""}
                      {" · "}
                    </span>
                    {q.question}
                    {formatInternalQuestionIdHint(q.id, true) && (
                      <span className="ml-2 text-xs text-slate-400">
                        {formatInternalQuestionIdHint(q.id, true)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}

export default function MasterCourseEditPage() {
  const params = useParams();
  const courseId = decodeURIComponent(String(params.id ?? ""));

  return (
    <CertianoShell>
      <MasterCourseEditContent key={courseId} courseId={courseId} />
    </CertianoShell>
  );
}

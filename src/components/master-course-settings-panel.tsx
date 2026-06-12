"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { ValidityRuleForm, type ValidityRuleFormValue } from "@/components/validity-rule-form";
import { useCourseDeleteDialog } from "@/hooks/use-course-delete-dialog";
import {
  formatValidityRuleLabel,
  type ValidityType,
} from "@/lib/course-validity";

interface ImportHint {
  masterEmpty: boolean;
  sourceAvailable: boolean;
  sourceTitle: string | null;
  sourceCourseId: string | null;
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
    validityIntervalUnit:
      (meta.validityIntervalUnit as ValidityRuleFormValue["validityIntervalUnit"]) ??
      "months",
  });
}

function formatMasterStatus(status: string): string {
  if (status === "disabled") return "Gesperrt";
  if (status === "published") return "Veröffentlicht";
  if (status === "draft") return "Entwurf";
  return status;
}

type Props = {
  courseId: string;
  moduleCount: number;
  examCount: number;
  onSaved?: () => void;
};

export function MasterCourseSettingsPanel({
  courseId,
  moduleCount,
  examCount,
  onSaved,
}: Props) {
  const router = useRouter();
  const [meta, setMeta] = useState({ title: "", status: "draft" });
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [importHint, setImportHint] = useState<ImportHint | null>(null);
  const [passingScore, setPassingScore] = useState("80");
  const [validity, setValidity] = useState<ValidityRuleFormValue>({
    validityType: "yearly",
    validityIntervalValue: "12",
    validityIntervalUnit: "months",
  });
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [panelLoading, setPanelLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const { openDeleteDialog, deleteDialog } = useCourseDeleteDialog({
    kind: "master",
    getPreviewUrl: (id) =>
      `/api/superuser/master-courses/${encodeURIComponent(id)}/delete-preview`,
    getDeleteUrl: (id) =>
      `/api/superuser/master-courses/${encodeURIComponent(id)}`,
    onArchived: (msg) => {
      setMessage(msg);
      onSaved?.();
    },
    onDeleted: (msg) => {
      setMessage(msg);
      router.push("/certiano/master-courses");
    },
    onError: (msg) => setError(msg),
  });

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
      setPanelLoading(false);
      return;
    }

    setPanelLoading(true);
    setError("");
    setMessage("");
    setMetaLoaded(false);
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
          setError(
            res.status === 503
              ? "Datenbankverbindung unterbrochen. Bitte Seite neu laden."
              : typeof data.error === "string"
                ? data.error
                : "Master-Einstellungen konnten nicht geladen werden."
          );
          return;
        }

        if (data?.meta) {
          applyMetaToForm(data.meta, { setMeta, setSelectedTopicIds, setValidity });
          setMetaLoaded(true);
        }

        if (data?.course) {
          setPassingScore(String(data.course.passingScore ?? 80));
        }

        if (data?.importHint) {
          setImportHint(data.importHint);
        }
      } catch {
        if (!cancelled) {
          setMetaLoaded(false);
          setError("Master-Einstellungen konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setPanelLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    if (saving || panelLoading) return;

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
        setMessage("Master-Einstellungen gespeichert.");
        if (d.meta) {
          applyMetaToForm(d.meta, { setMeta, setSelectedTopicIds, setValidity });
          setMetaLoaded(true);
        }
        if (d.course) {
          setPassingScore(String(d.course.passingScore ?? 80));
        }
        onSaved?.();
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
        if (d.importHint) setImportHint(d.importHint);
        if (d.meta) {
          applyMetaToForm(d.meta, { setMeta, setSelectedTopicIds, setValidity });
          setMetaLoaded(true);
        }
        onSaved?.();
      } else {
        setError(typeof d.error === "string" ? d.error : "Import fehlgeschlagen.");
      }
    } catch {
      setError("Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  }

  const showImportHint =
    importHint?.masterEmpty &&
    importHint.sourceAvailable &&
    moduleCount === 0 &&
    examCount === 0;

  const topicSummary =
    selectedTopicIds.length === 0
      ? "keine Hauptthemen"
      : selectedTopicIds.length === 1
        ? "1 Hauptthema"
        : `${selectedTopicIds.length} Hauptthemen`;

  const summaryLine = metaLoaded
    ? `${meta.title || "Ohne Titel"} · ${formatMasterStatus(meta.status)} · ${topicSummary} · Bestehen ab ${passingScore} % · ${formatValidityRuleLabel({
        validityType: validity.validityType,
        validityIntervalValue:
          validity.validityType === "custom"
            ? Number(validity.validityIntervalValue)
            : null,
        validityIntervalUnit:
          validity.validityType === "custom" ? validity.validityIntervalUnit : null,
      })}`
    : "Lädt…";

  if (panelLoading && !metaLoaded) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-slate-600">Master-Einstellungen werden geladen…</p>
      </Card>
    );
  }

  return (
    <div className="mb-6">
      {showImportHint && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
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

      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-4 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">Master-Einstellungen</p>
              <p className="mt-1 text-sm text-slate-600 group-open:hidden">{summaryLine}</p>
            </div>
            <span
              className="mt-0.5 shrink-0 text-slate-400 transition group-open:rotate-180"
              aria-hidden="true"
            >
              ▼
            </span>
          </div>
        </summary>

        <div className="border-t border-slate-100 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
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
              <Button
                type="button"
                variant="danger"
                disabled={saving || !metaLoaded}
                onClick={() =>
                  openDeleteDialog({
                    id: courseId,
                    title: meta.title || courseId,
                  })
                }
              >
                Master-Seminar löschen…
              </Button>
            </div>
          </form>
        </div>
      </details>
      {deleteDialog}
    </div>
  );
}

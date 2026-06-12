"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ValidityRuleForm, type ValidityRuleFormValue } from "@/components/validity-rule-form";
import {
  formatValidityRuleLabel,
  type ValidityType,
} from "@/lib/course-validity";

interface CourseDetail {
  id: string;
  title: string;
  active: boolean;
  topicIds?: number[];
  passingScore: number;
  validityType: ValidityType;
  validityIntervalValue: number | null;
  validityIntervalUnit: "days" | "months" | "years" | null;
}

type Props = {
  courseId: string;
  onSaved?: () => void;
};

export function CompanyCourseSettingsPanel({ courseId, onSaved }: Props) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [canPermanentDelete, setCanPermanentDelete] = useState(false);
  const [canEditValidity, setCanEditValidity] = useState(true);
  const [canEditPassingScore, setCanEditPassingScore] = useState(true);
  const [fromMaster, setFromMaster] = useState(false);
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
  const [panelLoading, setPanelLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/course-topics?filter=active")
      .then((r) => (r.ok ? r.json() : { topics: [] }))
      .then((d) =>
        setTopics(
          (d.topics ?? []).map((t: { id: number; name: string }) => ({
            id: t.id,
            name: t.name,
          }))
        )
      )
      .catch(() => undefined);
  }, []);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setError("Seminar konnte nicht geladen werden.");
      setPanelLoading(false);
      return;
    }

    setPanelLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}`);
      if (res.status === 403 || res.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.course) {
        setCourse(null);
        setError(
          typeof data.error === "string"
            ? data.error
            : "Seminar konnte nicht geladen werden."
        );
        return;
      }

      const c = data.course as CourseDetail;
      setCourse(c);
      setSelectedTopicIds(Array.isArray(c.topicIds) ? c.topicIds : []);
      setPassingScore(String(c.passingScore));
      setValidity({
        validityType: c.validityType ?? "yearly",
        validityIntervalValue: String(c.validityIntervalValue ?? 12),
        validityIntervalUnit: c.validityIntervalUnit ?? "months",
      });
      setCanPermanentDelete(Boolean(data.canPermanentDelete));
      const perms = data.permissions ?? {};
      setCanEditValidity(perms.canEditValidity !== false);
      setCanEditPassingScore(perms.canEditPassingScore !== false);
      setFromMaster(Boolean(perms.fromMaster));
    } catch {
      setCourse(null);
      setError("Seminar konnte nicht geladen werden.");
    } finally {
      setPanelLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void fetchCourse();
  }, [fetchCourse]);

  function toggleTopic(id: number) {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicIds: selectedTopicIds,
          passingScore: Number(passingScore),
          validityType: validity.validityType,
          validityIntervalValue:
            validity.validityType === "custom"
              ? Number(validity.validityIntervalValue)
              : null,
          validityIntervalUnit:
            validity.validityType === "custom" ? validity.validityIntervalUnit : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage("Seminar-Einstellungen gespeichert.");
        if (data.course) {
          const c = data.course as CourseDetail;
          setCourse(c);
          setSelectedTopicIds(Array.isArray(c.topicIds) ? c.topicIds : []);
        }
        onSaved?.();
      } else {
        setError(
          typeof data.error === "string" ? data.error : "Speichern fehlgeschlagen."
        );
      }
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse() {
    if (
      !window.confirm(
        "Seminar wirklich endgültig löschen? Dies ist nur möglich ohne Nachweisdaten."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = "/dashboard/seminare";
    } else {
      setError(
        typeof data.error === "string" ? data.error : "Löschen fehlgeschlagen."
      );
    }
  }

  const topicSummary =
    selectedTopicIds.length === 0
      ? "keine Hauptthemen"
      : selectedTopicIds.length === 1
        ? "1 Hauptthema"
        : `${selectedTopicIds.length} Hauptthemen`;

  const summaryLine = course
    ? `${course.title} · ${course.active ? "Aktiv" : "Inaktiv"} · ${topicSummary} · Bestehen ab ${passingScore} % · ${formatValidityRuleLabel({
        validityType: validity.validityType,
        validityIntervalValue:
          validity.validityType === "custom"
            ? Number(validity.validityIntervalValue)
            : null,
        validityIntervalUnit:
          validity.validityType === "custom" ? validity.validityIntervalUnit : null,
      })}`
    : "Lädt…";

  if (panelLoading && !course) {
    return (
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
        <p className="text-sm text-slate-600">Seminar-Einstellungen werden geladen…</p>
      </div>
    );
  }

  if (!course && error) {
    return (
      <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (!course) return null;

  return (
    <div className="mb-6">
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
              <p className="font-semibold text-slate-800">Seminar-Einstellungen</p>
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
          {fromMaster && !canEditValidity && !canEditPassingScore && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Diese Einstellungen werden durch Certiano vorgegeben und können nur durch
              den Superuser freigegeben werden.
            </p>
          )}
          {fromMaster && (canEditValidity || canEditPassingScore) && (
            <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
              Änderung durch Superuser für diese Firma freigegeben.
            </p>
          )}

          <form onSubmit={saveSettings} className="space-y-6">
            <fieldset className="block text-sm" disabled={saving}>
              <legend className="font-medium text-slate-700">Hauptthemen</legend>
              <p className="mt-1 mb-2 text-xs text-slate-500">
                Mehrfachauswahl möglich – das Seminar erscheint in jeder passenden Gruppe.
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
                          onChange={() => toggleTopic(t.id)}
                          className="rounded border-slate-300"
                        />
                        <span>{t.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Bestehensgrenze (%)</span>
              {fromMaster && !canEditPassingScore && (
                <p className="mt-1 text-xs text-amber-800">
                  Diese Einstellung wird durch Certiano vorgegeben.
                </p>
              )}
              <input
                type="number"
                min={50}
                max={100}
                value={passingScore}
                disabled={!canEditPassingScore || saving}
                onChange={(e) => setPassingScore(e.target.value)}
                className="mt-1 block w-28 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>

            <div>
              {fromMaster && !canEditValidity && (
                <p className="mb-1 text-xs text-amber-800">
                  Gültigkeitsregel wird durch Certiano vorgegeben.
                </p>
              )}
              <ValidityRuleForm
                value={validity}
                onChange={setValidity}
                disabled={!canEditValidity || saving}
              />
            </div>

            <Button
              type="submit"
              disabled={saving || (!canEditValidity && !canEditPassingScore)}
            >
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </form>

          {canPermanentDelete && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="mb-2 font-bold text-red-800">Endgültig löschen</h3>
              <p className="mb-4 text-sm text-slate-600">
                Nur möglich, wenn keine Zertifikate oder Prüfungen vorhanden sind.
              </p>
              <Button type="button" variant="danger" onClick={() => void deleteCourse()}>
                Seminar endgültig löschen
              </Button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

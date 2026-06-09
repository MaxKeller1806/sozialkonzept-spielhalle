"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ValidityRuleForm, type ValidityRuleFormValue } from "@/components/validity-rule-form";
import { Button, Card } from "@/components/ui";
import { formatValidityRuleLabel } from "@/lib/course-validity";
import type { ValidityType } from "@/lib/course-validity";

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  active: boolean;
  topicIds?: number[];
  passingScore: number;
  validityType: ValidityType;
  validityIntervalValue: number | null;
  validityIntervalUnit: "days" | "months" | "years" | null;
}

type LoadState = "loading" | "ready";

export default function SeminarDetailPage() {
  const params = useParams();
  const courseId = decodeURIComponent(String(params.courseId ?? ""));
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
  const [topicMessage, setTopicMessage] = useState("");
  const [error, setError] = useState("");
  const [topicError, setTopicError] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [savingTopics, setSavingTopics] = useState(false);

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
      setLoadState("ready");
      return;
    }

    setLoadState("loading");
    setError("");

    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}`);
      if (res.status === 403 || res.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Seminar konnte nicht geladen werden."
        );
        setCourse(null);
        return;
      }

      if (data?.course) {
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
      } else {
        setCourse(null);
        setError(
          typeof data.error === "string"
            ? data.error
            : "Seminar konnte nicht geladen werden."
        );
      }
    } catch {
      setCourse(null);
      setError("Seminar konnte nicht geladen werden.");
    } finally {
      setLoadState("ready");
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

  async function saveTopics(e: React.FormEvent) {
    e.preventDefault();
    setSavingTopics(true);
    setTopicMessage("");
    setTopicError("");
    try {
      const res = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: selectedTopicIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTopicMessage("Hauptthemen gespeichert.");
        if (Array.isArray(data.course?.topicIds)) {
          setSelectedTopicIds(data.course.topicIds);
        }
      } else {
        setTopicError(
          typeof data.error === "string" ? data.error : "Speichern fehlgeschlagen."
        );
      }
    } catch {
      setTopicError("Speichern fehlgeschlagen.");
    } finally {
      setSavingTopics(false);
    }
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
        setMessage("Einstellungen gespeichert.");
        await fetchCourse();
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

  const loading = loadState === "loading";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={course?.title ?? "Seminar"} />

      <p className="mb-4 text-sm text-slate-600">
        <Link href="/dashboard/seminare" className="text-brand underline">
          ← Zur Seminarliste
        </Link>
        {" · "}
        <Link
          href={`/dashboard/seminare/${encodeURIComponent(courseId)}/inhalte`}
          className="text-brand underline"
        >
          Inhalte bearbeiten
        </Link>
      </p>

      {loading ? (
        <p className="text-sm text-slate-600">Lädt…</p>
      ) : !course ? (
        <Card>
          <p className="text-sm text-red-700">{error || "Seminar nicht gefunden."}</p>
        </Card>
      ) : (
        <>
          {message && (
            <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
              {message}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}

          <Card className="mb-6">
            <h2 className="mb-2 text-lg font-bold">{course.title}</h2>
            <p className="text-sm text-slate-600">
              Status: {course.active ? "Aktiv" : "Inaktiv"} · Aktuelle Regel:{" "}
              {formatValidityRuleLabel(course)}
            </p>
          </Card>

          <Card className="mb-6">
            <h3 className="mb-4 text-lg font-bold">Hauptthemen</h3>
            <p className="mb-4 text-sm text-slate-600">
              Ein Seminar kann mehreren Hauptthemen zugeordnet werden und erscheint dann in
              jeder passenden Gruppe.
            </p>
            {topicMessage && (
              <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
                {topicMessage}
              </p>
            )}
            {topicError && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {topicError}
              </p>
            )}
            <form onSubmit={saveTopics} className="space-y-4">
              {topics.length === 0 ? (
                <p className="text-sm text-slate-500">Keine Hauptthemen verfügbar.</p>
              ) : (
                <ul className="space-y-2">
                  {topics.map((t) => (
                    <li key={t.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTopicIds.includes(t.id)}
                          onChange={() => toggleTopic(t.id)}
                          disabled={savingTopics}
                          className="rounded border-slate-300"
                        />
                        <span>{t.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <Button type="submit" disabled={savingTopics}>
                {savingTopics ? "Speichern…" : "Hauptthemen speichern"}
              </Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-bold">Seminar-Einstellungen</h3>
            {fromMaster && !canEditValidity && !canEditPassingScore && (
              <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Diese Einstellung wird durch Certiano vorgegeben und kann nur durch
                den Superuser freigegeben werden.
              </p>
            )}
            {fromMaster && (canEditValidity || canEditPassingScore) && (
              <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
                Änderung durch Superuser für diese Firma freigegeben.
              </p>
            )}
            <form onSubmit={saveSettings} className="space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Bestehensgrenze (%)
                </span>
                {fromMaster && !canEditPassingScore && (
                  <p className="mt-1 text-xs text-amber-800">
                    Diese Einstellung wird durch Certiano vorgegeben und kann nur
                    durch den Superuser freigegeben werden.
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
                    Diese Einstellung wird durch Certiano vorgegeben und kann nur
                    durch den Superuser freigegeben werden.
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
                disabled={
                  saving || (!canEditValidity && !canEditPassingScore)
                }
              >
                {saving ? "Speichern…" : "Einstellungen speichern"}
              </Button>
            </form>
          </Card>

          {canPermanentDelete && (
            <Card className="mt-6 border-red-200">
              <h3 className="mb-2 font-bold text-red-800">Endgültig löschen</h3>
              <p className="mb-4 text-sm text-slate-600">
                Nur möglich, wenn keine Zertifikate oder Prüfungen vorhanden sind.
              </p>
              <Button type="button" variant="danger" onClick={() => void deleteCourse()}>
                Seminar endgültig löschen
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

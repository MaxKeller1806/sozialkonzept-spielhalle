"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, Input } from "@/components/ui";
import { ValidityRuleForm, type ValidityRuleFormValue } from "@/components/validity-rule-form";
import type { ValidityType } from "@/lib/course-validity";

interface CourseOverview {
  courseName: string;
  version: string;
  passingScore: number;
  modules: { id: number; title: string; duration: number; lessons: { id: number; title: string }[] }[];
  exam: { id: number; moduleId: number; question: string; type: string }[];
}

interface ImportHint {
  masterEmpty: boolean;
  sourceAvailable: boolean;
  sourceTitle: string | null;
  sourceCourseId: string | null;
}

export default function MasterCourseEditPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id));
  const [meta, setMeta] = useState({ title: "", status: "draft" });
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [importHint, setImportHint] = useState<ImportHint | null>(null);
  const [passingScore, setPassingScore] = useState("80");
  const [validity, setValidity] = useState<ValidityRuleFormValue>({
    validityType: "yearly",
    validityIntervalValue: "12",
    validityIntervalUnit: "months",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return null;
        }
        return r.json().then((d) => ({ ok: r.ok, d }));
      })
      .then((result) => {
        if (!result) return;
        if (!result.ok) {
          setError(result.d?.error ?? "Master-Seminar konnte nicht geladen werden.");
          return;
        }
        const d = result.d;
        if (d?.meta) {
          setMeta({ title: d.meta.title, status: d.meta.status });
          setValidity({
            validityType: d.meta.validityType as ValidityType,
            validityIntervalValue: String(d.meta.validityIntervalValue ?? 12),
            validityIntervalUnit: d.meta.validityIntervalUnit ?? "months",
          });
        }
        if (d?.course) {
          setCourse(d.course);
          setPassingScore(String(d.course.passingScore));
        }
        if (d?.importHint) {
          setImportHint(d.importHint);
        }
      })
      .catch(() => setError("Master-Seminar konnte nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage("Master-Seminar gespeichert.");
      load();
    } else {
      setError(d.error ?? "Speichern fehlgeschlagen.");
    }
  }

  async function assignAll() {
    setMessage("");
    setError("");
    const res = await fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assignAll" }),
    });
    const d = await res.json();
    if (res.ok) {
      setMessage(`Allen ${d.assignedCount} Firmen zugewiesen.`);
    } else {
      setError(d.error ?? "Zuweisung fehlgeschlagen.");
    }
  }

  async function importFromCompany() {
    setImporting(true);
    setMessage("");
    setError("");
    const res = await fetch(`/api/superuser/master-courses/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "importFromCompanyCourse" }),
    });
    const d = await res.json().catch(() => ({}));
    setImporting(false);
    if (res.ok) {
      setMessage(
        `Inhalte übernommen: ${d.imported?.modules ?? 0} Module, ${d.imported?.lessons ?? 0} Lektionen, ${d.imported?.examQuestions ?? 0} Prüfungsfragen.`
      );
      if (d.course) setCourse(d.course);
      if (d.importHint) setImportHint(d.importHint);
      load();
    } else {
      setError(d.error ?? "Import fehlgeschlagen.");
    }
  }

  async function addModule() {
    const title = window.prompt("Modultitel:");
    if (!title?.trim()) return;
    const res = await fetch(
      `/api/superuser/master-courses/${encodeURIComponent(id)}/modules`,
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
              modules: [...prev.modules, d.module].sort((a, b) => a.id - b.id),
            }
          : prev
      );
      load();
    } else {
      setError(d.error ?? "Modul konnte nicht angelegt werden.");
    }
  }

  const modules = course?.modules ?? [];
  const exam = course?.exam ?? [];
  const showImportHint =
    importHint?.masterEmpty &&
    importHint.sourceAvailable &&
    modules.length === 0 &&
    exam.length === 0;

  return (
    <CertianoShell>
      <Link href="/certiano/master-courses" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Zur Seminarverwaltung
      </Link>

      {loading && (
        <p className="mb-4 text-sm text-slate-600">Lädt…</p>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      {!loading && !course && !error && (
        <Card>
          <p className="text-sm text-slate-600">Master-Seminar nicht gefunden.</p>
        </Card>
      )}

      {course && (
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
              />
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Status</span>
                <select
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={meta.status}
                  onChange={(e) => setMeta({ ...meta, status: e.target.value })}
                >
                  <option value="draft">Entwurf</option>
                  <option value="published">Veröffentlicht</option>
                  <option value="disabled">Gesperrt</option>
                </select>
              </label>
              <Input
                label="Bestehensgrenze (%)"
                type="number"
                min={50}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
              <div className="sm:col-span-2">
                <ValidityRuleForm value={validity} onChange={setValidity} />
              </div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit">Speichern</Button>
                <Button type="button" variant="secondary" onClick={assignAll}>
                  Allen Firmen zuweisen
                </Button>
              </div>
            </form>
          </Card>

          <Card className="mb-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Module ({modules.length})</h2>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/inhalte?courseId=${encodeURIComponent(id)}`}>
                  <Button type="button" variant="secondary">
                    Inhalte bearbeiten
                  </Button>
                </Link>
                <Button type="button" onClick={addModule}>
                  + Modul
                </Button>
              </div>
            </div>
            {modules.length === 0 ? (
              <p className="text-sm text-slate-600">Noch keine Module vorhanden.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {modules.map((m) => (
                  <li key={m.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">
                        {m.id}. {m.title} · {m.lessons.length} Lektionen
                      </p>
                      <Link
                        href={`/dashboard/inhalte/modul/${m.id}?courseId=${encodeURIComponent(id)}`}
                      >
                        <Button type="button" variant="secondary">
                          Bearbeiten
                        </Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold">
              Prüfungsfragen ({exam.length})
            </h2>
            {exam.length === 0 ? (
              <p className="text-sm text-slate-600">Noch keine Prüfungsfragen vorhanden.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {exam.map((q) => (
                  <li key={q.id} className="py-3 text-sm">
                    <span className="text-slate-500">#{q.id} Modul {q.moduleId} · </span>
                    {q.question}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </CertianoShell>
  );
}

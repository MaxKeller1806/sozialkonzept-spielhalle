"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  passingScore: number;
  validityType: ValidityType;
  validityIntervalValue: number | null;
  validityIntervalUnit: "days" | "months" | "years" | null;
}

export default function SeminarDetailPage() {
  const params = useParams();
  const courseId = decodeURIComponent(String(params.courseId));
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [canPermanentDelete, setCanPermanentDelete] = useState(false);
  const [settingsReadOnly, setSettingsReadOnly] = useState(false);
  const [passingScore, setPassingScore] = useState("80");
  const [validity, setValidity] = useState<ValidityRuleFormValue>({
    validityType: "yearly",
    validityIntervalValue: "12",
    validityIntervalUnit: "months",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/courses/${encodeURIComponent(courseId)}`)
      .then((r) => {
        if (r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.course) {
          const c = d.course as CourseDetail;
          setCourse(c);
          setPassingScore(String(c.passingScore));
          setValidity({
            validityType: c.validityType,
            validityIntervalValue: String(c.validityIntervalValue ?? 12),
            validityIntervalUnit: c.validityIntervalUnit ?? "months",
          });
          setCanPermanentDelete(Boolean(d.canPermanentDelete));
          setSettingsReadOnly(Boolean(d.permissions?.readOnly));
        } else if (d?.error) {
          setError(d.error);
        }
      })
      .finally(() => setLoading(false));
  }, [courseId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
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
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMessage("Einstellungen gespeichert.");
      load();
    } else {
      setError(data.error ?? "Speichern fehlgeschlagen.");
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
    const data = await res.json();
    if (res.ok) {
      router.push("/dashboard/seminare");
    } else {
      setError(data.error ?? "Löschen fehlgeschlagen.");
    }
  }

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

            <Card>
              <h3 className="mb-4 text-lg font-bold">Seminar-Einstellungen</h3>
              {settingsReadOnly && (
                <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
                  Dieses Seminar wird von Certiano bereitgestellt. Gültigkeit und
                  Bestehensgrenze können nicht geändert werden.
                </p>
              )}
              <form onSubmit={saveSettings} className="space-y-6">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Bestehensgrenze (%)
                  </span>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={passingScore}
                    disabled={settingsReadOnly || saving}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="mt-1 block w-28 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  />
                </label>
                <ValidityRuleForm
                  value={validity}
                  onChange={setValidity}
                  disabled={settingsReadOnly || saving}
                />
                <Button type="submit" disabled={saving || settingsReadOnly}>
                  {saving ? "Speichern…" : "Speichern"}
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

"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card } from "@/components/ui";

interface UserRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  canHardDelete: boolean;
}

interface CourseDetail {
  courseId: string;
  courseTitle: string;
  status: string;
  source?: "native" | "master";
  masterCourseId?: string | null;
  canEditContent: boolean;
  canEditTests: boolean;
  canAddModules: boolean;
  course?: {
    modules: {
      id: number;
      title: string;
      lessons: { id: number; title: string }[];
    }[];
    exam: { id: number; question: string; moduleId: number }[];
  };
  contentStates?: {
    modules: Record<string, boolean>;
    lessons: Record<string, boolean>;
    questions: Record<string, boolean>;
  };
}

interface MasterCourse {
  id: string;
  title: string;
  status: string;
}

export default function CompanyCoursesPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [provisions, setProvisions] = useState<CourseDetail[]>([]);
  const [masters, setMasters] = useState<MasterCourse[]>([]);
  const [selectedMaster, setSelectedMaster] = useState("");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mastersWarning, setMastersWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!Number.isFinite(companyId) || companyId <= 0) {
      setError("Ungültige Firmen-ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMastersWarning("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    (async () => {
      try {
        const coursesRes = await fetch(
          `/api/superuser/companies/${companyId}/courses`,
          { signal: controller.signal }
        );
        const coursesData = await coursesRes.json().catch(() => ({}));

        if (coursesRes.status === 401 || coursesRes.status === 403) {
          window.location.replace("/certiano/login");
          return;
        }
        if (!coursesRes.ok) {
          throw new Error(coursesData.error ?? "Kurse konnten nicht geladen werden.");
        }

        setProvisions(
          (coursesData.provisions ?? []).map((p: CourseDetail) => ({
            courseId: p.courseId,
            courseTitle: p.courseTitle,
            status: p.status === "locked" ? "disabled" : p.status,
            source: p.source,
            masterCourseId: p.masterCourseId,
            canEditContent: p.canEditContent,
            canEditTests: p.canEditTests,
            canAddModules: p.canAddModules,
          }))
        );
        setMasters(coursesData.masters ?? []);

        if (coursesData.migrationHint) {
          setMastersWarning(String(coursesData.migrationHint));
        }
      } catch (e) {
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" ||
            e.message.toLowerCase().includes("aborted"));
        if (isAbort) {
          setError(
            "Die Kursfreigaben konnten nicht geladen werden. Bitte erneut versuchen."
          );
        } else {
          console.error("[courses page] load:", e);
          setError(
            e instanceof Error ? e.message : "Laden fehlgeschlagen."
          );
        }
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    })();
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadCourseDetail(courseId: string) {
    setBusyKey(`load-${courseId}`);
    setError("");
    const res = await fetch(
      `/api/superuser/companies/${companyId}/courses?courseId=${encodeURIComponent(courseId)}&detail=1`
    );
    const d = await res.json().catch(() => ({}));
    setBusyKey(null);
    if (!res.ok) {
      setError(d.error ?? "Kursdetails konnten nicht geladen werden.");
      return;
    }
    setProvisions((prev) =>
      prev.map((p) =>
        p.courseId === courseId
          ? {
              ...p,
              course: d.course,
              contentStates: d.contentStates,
              status: d.provision?.status ?? p.status,
            }
          : p
      )
    );
    setExpandedCourse(courseId);
  }

  async function patchCourse(courseId: string, patch: Record<string, unknown>) {
    setMessage("");
    setError("");
    setBusyKey(courseId);
    const res = await fetch(`/api/superuser/companies/${companyId}/courses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, ...patch }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyKey(null);
    if (res.ok) {
      setMessage("Kursfreigabe aktualisiert.");
      if (d.provision) {
        setProvisions((prev) =>
          prev.map((p) =>
            p.courseId === courseId
              ? {
                  ...p,
                  status: d.provision.status,
                  canEditContent: d.provision.canEditContent,
                  canEditTests: d.provision.canEditTests,
                  canAddModules: d.provision.canAddModules,
                }
              : p
          )
        );
      }
    } else {
      setError(d.error ?? "Aktualisierung fehlgeschlagen.");
    }
  }

  async function patchContent(
    courseId: string,
    content: {
      contentType: "module" | "lesson" | "question";
      contentId: number;
      parentModuleId?: number;
      isActive: boolean;
    }
  ) {
    const key = `${courseId}-${content.contentType}-${content.contentId}`;
    setBusyKey(key);
    setError("");
    const res = await fetch(`/api/superuser/companies/${companyId}/courses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, content }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyKey(null);
    if (res.ok && d.contentStates) {
      setProvisions((prev) =>
        prev.map((p) =>
          p.courseId === courseId ? { ...p, contentStates: d.contentStates } : p
        )
      );
      setMessage("Inhalt aktualisiert.");
    } else {
      setError(d.error ?? "Inhalt konnte nicht aktualisiert werden.");
    }
  }

  async function assignMaster(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaster) return;
    setBusyKey("assign");
    const res = await fetch(`/api/superuser/companies/${companyId}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterCourseId: selectedMaster }),
    });
    const d = await res.json().catch(() => ({}));
    setBusyKey(null);
    if (res.ok) {
      setMessage(`Kurs „${d.provision?.courseTitle ?? ""}" zugewiesen.`);
      load();
    } else {
      setError(d.error ?? "Zuweisung fehlgeschlagen.");
    }
  }

  return (
    <CertianoShell companyId={companyId}>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">{message}</p>
      )}

      {mastersWarning && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {mastersWarning}
        </p>
      )}

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">Master-Seminar zuweisen</h2>
        {masters.length === 0 && !loading ? (
          <p className="text-sm text-slate-600">Noch keine Masterkurse vorhanden.</p>
        ) : (
        <form onSubmit={assignMaster} className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Master-Kurs</span>
            <select
              className="mt-1 block min-w-[240px] rounded-xl border border-slate-300 px-3 py-2"
              value={selectedMaster}
              onChange={(e) => setSelectedMaster(e.target.value)}
            >
              <option value="">Bitte wählen…</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.status})
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={!selectedMaster || busyKey === "assign"}>
            Zuweisen
          </Button>
        </form>
        )}
      </Card>

      {loading ? (
        <p className="text-sm text-slate-600">Lädt Kursfreigaben…</p>
      ) : provisions.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">Keine Kurse zugewiesen.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {provisions.map((p) => (
            <Card key={p.courseId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{p.courseTitle}</h3>
                  <p className="text-xs text-slate-500">{p.courseId}</p>
                  <p className="mt-1 text-sm">
                    Status:{" "}
                    <strong>{p.status === "active" ? "Aktiv" : "Deaktiviert"}</strong>
                    {(p.source === "master" || p.masterCourseId) && (
                      <span className="ml-2 text-xs text-slate-500">
                        (Certiano-Master)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status !== "active" ? (
                    <Button
                      type="button"
                      disabled={busyKey === p.courseId}
                      onClick={() => patchCourse(p.courseId, { status: "active" })}
                    >
                      Aktivieren
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyKey === p.courseId}
                      onClick={() => patchCourse(p.courseId, { status: "disabled" })}
                    >
                      Deaktivieren
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyKey === `load-${p.courseId}`}
                    onClick={() =>
                      expandedCourse === p.courseId
                        ? setExpandedCourse(null)
                        : loadCourseDetail(p.courseId)
                    }
                  >
                    {expandedCourse === p.courseId ? "Inhalte schließen" : "Inhalte verwalten"}
                  </Button>
                </div>
              </div>

              {expandedCourse === p.courseId && p.course && p.contentStates && (
                <div className="mt-4 border-t pt-4 text-sm">
                  <p className="mb-3 text-xs text-slate-500">
                    Bearbeitung: Inhalte {p.canEditContent ? "ja" : "nein"} · Tests{" "}
                    {p.canEditTests ? "ja" : "nein"} · Module {p.canAddModules ? "ja" : "nein"}
                  </p>
                  {p.course.modules.map((mod) => {
                    const modActive = p.contentStates!.modules[String(mod.id)] !== false;
                    return (
                      <div key={mod.id} className="mb-4 rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">
                            Modul {mod.id}: {mod.title}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busyKey?.startsWith(p.courseId) ?? false}
                            onClick={() =>
                              patchContent(p.courseId, {
                                contentType: "module",
                                contentId: mod.id,
                                isActive: !modActive,
                              })
                            }
                          >
                            {modActive ? "Deaktivieren" : "Aktivieren"}
                          </Button>
                        </div>
                        <ul className="mt-2 space-y-1 pl-4">
                          {mod.lessons.map((lesson) => {
                            const lessonActive =
                              p.contentStates!.lessons[`${mod.id}:${lesson.id}`] !== false;
                            return (
                              <li
                                key={lesson.id}
                                className="flex flex-wrap items-center justify-between gap-2"
                              >
                                <span>
                                  Lektion {lesson.id}: {lesson.title}
                                </span>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    patchContent(p.courseId, {
                                      contentType: "lesson",
                                      contentId: lesson.id,
                                      parentModuleId: mod.id,
                                      isActive: !lessonActive,
                                    })
                                  }
                                >
                                  {lessonActive ? "Aus" : "An"}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                  <h4 className="mb-2 mt-4 font-semibold">Testfragen</h4>
                  <ul className="space-y-1">
                    {p.course.exam.map((q) => {
                      const qActive = p.contentStates!.questions[String(q.id)] !== false;
                      return (
                        <li
                          key={q.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            #{q.id} (Modul {q.moduleId}): {q.question}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              patchContent(p.courseId, {
                                contentType: "question",
                                contentId: q.id,
                                isActive: !qActive,
                              })
                            }
                          >
                            {qActive ? "Aus" : "An"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </CertianoShell>
  );
}

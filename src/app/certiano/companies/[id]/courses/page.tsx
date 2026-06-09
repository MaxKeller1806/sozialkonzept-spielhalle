"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CourseAssignmentOptions } from "@/lib/course-assignment-options";
import { CertianoShell } from "@/components/certiano-shell";
import { CourseProvisionTopicPicker } from "@/components/course-provision-topic-picker";
import { Button, Card } from "@/components/ui";

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

function provisionsSnapshotKey(rows: CourseDetail[]): string {
  return rows
    .map(
      (p) =>
        `${p.courseId}:${p.status}:${p.canEditContent}:${p.canEditTests}:${p.canAddModules}`
    )
    .join("|");
}

export default function CompanyCoursesPage() {
  const params = useParams();
  const companyId = useMemo(() => {
    const raw = params.id;
    const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    return Number(id);
  }, [params.id]);

  const [provisions, setProvisions] = useState<CourseDetail[]>([]);
  const [assignmentData, setAssignmentData] = useState<CourseAssignmentOptions | null>(
    null
  );
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mastersWarning, setMastersWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const reloadNonceRef = useRef(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(companyId) || companyId <= 0) {
      setError("Ungültige Firmen-ID.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError("");

      try {
        const coursesRes = await fetch(
          `/api/superuser/companies/${companyId}/courses`,
          { signal: controller.signal }
        );
        const coursesData = await coursesRes.json().catch(() => ({}));
        if (cancelled) return;

        if (coursesRes.status === 401 || coursesRes.status === 403) {
          window.location.replace("/certiano/login");
          return;
        }
        if (!coursesRes.ok) {
          throw new Error(coursesData.error ?? "Kurse konnten nicht geladen werden.");
        }

        const nextProvisions = (coursesData.provisions ?? []).map((p: CourseDetail) => ({
          courseId: p.courseId,
          courseTitle: p.courseTitle,
          status: p.status === "locked" ? "disabled" : p.status,
          source: p.source,
          masterCourseId: p.masterCourseId,
          canEditContent: p.canEditContent,
          canEditTests: p.canEditTests,
          canAddModules: p.canAddModules,
        }));

        setProvisions((prev) =>
          provisionsSnapshotKey(prev) === provisionsSnapshotKey(nextProvisions)
            ? prev
            : nextProvisions
        );

        setAssignmentData({
          topics: coursesData.topics ?? [],
          ungroupedCourses: coursesData.ungroupedCourses ?? [],
          selectedMasterCourseIds: coursesData.selectedMasterCourseIds ?? [],
        });

        setMastersWarning(
          coursesData.migrationHint ? String(coursesData.migrationHint) : ""
        );
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("[courses page] load:", e);
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [companyId, reloadNonce]);

  const reloadProvisions = useCallback(() => {
    reloadNonceRef.current += 1;
    setReloadNonce(reloadNonceRef.current);
  }, []);

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
        <h2 className="mb-4 text-lg font-bold">Seminare / Kursfreigaben zuweisen</h2>
        <p className="mb-4 text-sm text-slate-600">
          Wählen Sie Hauptthemen oder einzelne Seminare aus. Die Auswahl wird erst
          beim Speichern übernommen.
        </p>
        <CourseProvisionTopicPicker
          companyId={companyId}
          assignmentData={assignmentData}
          assignmentLoading={loading}
          onSaved={reloadProvisions}
        />
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

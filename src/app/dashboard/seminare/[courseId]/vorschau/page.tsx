"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { AdminPreviewBanner } from "@/components/admin-preview-banner";
import { CourseBreadcrumb } from "@/components/course-breadcrumb";
import { CourseHubNav } from "@/components/course-hub-tabs";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";
import { courseHubBreadcrumb } from "@/lib/course-editor-breadcrumbs";
import { courseInhalteHubHref } from "@/lib/course-inhalte-url";
import {
  adminPreviewExamPath,
  adminPreviewLessonPath,
} from "@/lib/admin-course-preview";
import { flattenLessons } from "@/lib/course-nav";
import { useAdminCoursePreview } from "@/hooks/use-admin-course-preview";

function VorschauContent() {
  const params = useParams();
  const courseId = decodeURIComponent(String(params.courseId ?? ""));
  const { previewCourse, permissions, loading, error } =
    useAdminCoursePreview(courseId);

  const firstLesson = useMemo(() => {
    if (!previewCourse) return null;
    return flattenLessons(previewCourse)[0] ?? null;
  }, [previewCourse]);

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Vorschau wird geladen…</p>;
  }

  if (error || !previewCourse) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader title="Seminar-Vorschau" />
        <p className="text-red-600" role="alert">
          {error ?? "Seminar konnte nicht geladen werden."}
        </p>
        <ButtonLink href="/dashboard/seminare" variant="secondary" className="mt-4">
          Zur Seminarverwaltung
        </ButtonLink>
      </div>
    );
  }

  const perTest = previewCourse.examQuestionsPerTest ?? 15;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title={previewCourse.courseName}
        actions={
          <ButtonLink href="/dashboard/seminare" variant="secondary">
            Zur Seminarverwaltung
          </ButtonLink>
        }
      />

      <CourseBreadcrumb
        items={[
          ...courseHubBreadcrumb(courseId, previewCourse.courseName, "uebersicht").slice(
            0,
            -1
          ),
          { label: "Mitarbeiter-Vorschau" },
        ]}
      />

      <CourseHubNav
        courseId={courseId}
        active="uebersicht"
        showVorschauLink={false}
      />

      <AdminPreviewBanner fromMaster={permissions.fromMaster} />

      <Card className="mb-6">
        <p className="readable-text text-base text-slate-600">
          Version {previewCourse.version} · max. {previewCourse.maxDurationMinutes}{" "}
          Min. inkl. Test · Bestehen ab {previewCourse.passingScore} % (
          {previewCourse.minCorrectAnswers} von {perTest} Fragen)
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={courseInhalteHubHref(courseId, { bereich: "module" })}
            className="text-brand underline"
          >
            Module bearbeiten
          </Link>
          <Link
            href={courseInhalteHubHref(courseId, { bereich: "einstellungen" })}
            className="text-brand underline"
          >
            Einstellungen
          </Link>
        </div>
      </Card>

      <nav className="mb-8 space-y-3" aria-label="Vorschau-Aktionen">
        {firstLesson ? (
          <ButtonLink
            href={adminPreviewLessonPath(
              courseId,
              firstLesson.moduleId,
              firstLesson.lessonId
            )}
            className="w-full py-4 text-lg"
          >
            Ersten Lernschritt ansehen
          </ButtonLink>
        ) : (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Dieser Kurs enthält noch keine sichtbaren Lerninhalte.
          </p>
        )}
        {previewCourse.exam.length > 0 && (
          <ButtonLink
            href={adminPreviewExamPath(courseId)}
            variant="secondary"
            className="w-full"
          >
            Abschlusstest-Fragen (mit Lösungen)
          </ButtonLink>
        )}
      </nav>

      <details className="rounded-2xl border border-slate-200 bg-white p-4" open>
        <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-slate-800">
          Modulübersicht ({previewCourse.modules.length} Module)
        </summary>
        <ul className="mt-4 space-y-4" role="list">
          {previewCourse.modules.map((mod) => (
            <li key={mod.id}>
              <p className="font-medium text-slate-900">
                {mod.id}. {mod.title}
                <span className="font-normal text-slate-500">
                  {" "}
                  · ca. {mod.duration} Min. · {mod.lessons.length} Schritte
                </span>
              </p>
              {mod.lessons.length > 0 && (
                <ul className="mt-2 space-y-1 pl-4" role="list">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={adminPreviewLessonPath(courseId, mod.id, lesson.id)}
                        className="text-sm text-brand hover:underline"
                      >
                        {lesson.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </details>

      <p className="mt-6 text-center text-xs text-slate-500">
        Nur Lesezugriff · Keine Speicherung von Fortschritt oder Prüfungsversuchen
      </p>
    </div>
  );
}

export default function AdminSeminarVorschauPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>}>
      <VorschauContent />
    </Suspense>
  );
}

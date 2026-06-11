"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { AdminPreviewBanner } from "@/components/admin-preview-banner";
import { LessonSpeechRegister } from "@/components/lesson-speech-register";
import { LessonContent } from "@/components/lesson-content";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";
import {
  adminPreviewBasePath,
  adminPreviewLessonPath,
} from "@/lib/admin-course-preview";
import { flattenLessons } from "@/lib/course-nav";
import { useAdminCoursePreview } from "@/hooks/use-admin-course-preview";
import type { Lesson } from "@/lib/types";

function LektionVorschauContent() {
  const params = useParams();
  const courseId = decodeURIComponent(String(params.courseId ?? ""));
  const moduleId = Number(params.id);
  const lessonId = Number(params.lessonId);

  const { previewCourse, permissions, loading, error } =
    useAdminCoursePreview(courseId);

  const lessonContext = useMemo(() => {
    if (!previewCourse) return null;

    const mod = previewCourse.modules.find((m) => m.id === moduleId);
    if (!mod) return null;

    const lesson = mod.lessons.find((l) => l.id === lessonId) as Lesson | undefined;
    if (!lesson) return null;

    const all = flattenLessons(previewCourse);
    const idx = all.findIndex(
      (l) => l.moduleId === moduleId && l.lessonId === lessonId
    );

    const prev =
      idx > 0
        ? adminPreviewLessonPath(
            courseId,
            all[idx - 1].moduleId,
            all[idx - 1].lessonId
          )
        : null;
    const next =
      idx >= 0 && idx < all.length - 1
        ? adminPreviewLessonPath(
            courseId,
            all[idx + 1].moduleId,
            all[idx + 1].lessonId
          )
        : null;

    return {
      moduleTitle: mod.title,
      lesson,
      globalIndex: idx >= 0 ? idx : 0,
      totalLessons: all.length,
      prevUrl: prev,
      nextUrl: next,
    };
  }, [previewCourse, moduleId, lessonId, courseId]);

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lektion wird geladen…</p>;
  }

  if (error || !lessonContext) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600" role="alert">
          {error ?? "Lernschritt konnte nicht geladen werden."}
        </p>
        <ButtonLink
          href={adminPreviewBasePath(courseId)}
          variant="secondary"
          className="mt-4"
        >
          Zur Vorschau-Übersicht
        </ButtonLink>
      </div>
    );
  }

  const { moduleTitle, lesson, globalIndex, totalLessons, prevUrl, nextUrl } =
    lessonContext;
  const lessonKey = `${moduleId}:${lessonId}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title={moduleTitle}
        actions={
          <ButtonLink href={adminPreviewBasePath(courseId)} variant="secondary">
            Zur Vorschau-Übersicht
          </ButtonLink>
        }
      />

      <p className="mb-4 text-sm text-slate-600">
        <Link href={adminPreviewBasePath(courseId)} className="text-brand underline">
          ← {previewCourse?.courseName ?? "Vorschau"}
        </Link>
      </p>

      <AdminPreviewBanner fromMaster={permissions.fromMaster} />

      <p className="mb-4 text-sm text-slate-600">
        Schritt {globalIndex + 1} von {totalLessons}
      </p>

      <Card>
        <h2 className="text-2xl font-bold">{lesson.title}</h2>

        <LessonSpeechRegister lesson={lesson} lessonKey={lessonKey} />
        <LessonContent lesson={lesson} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {prevUrl && (
            <ButtonLink href={prevUrl} variant="secondary" className="flex-1">
              Zurück
            </ButtonLink>
          )}
          {nextUrl ? (
            <ButtonLink href={nextUrl} className="flex-1">
              Weiter
            </ButtonLink>
          ) : (
            <ButtonLink
              href={adminPreviewBasePath(courseId)}
              className="flex-1"
            >
              Zur Übersicht
            </ButtonLink>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function AdminLektionVorschauPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>}>
      <LektionVorschauContent />
    </Suspense>
  );
}

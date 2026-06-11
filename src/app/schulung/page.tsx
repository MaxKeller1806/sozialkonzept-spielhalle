"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { CourseTitleDisplay } from "@/components/course-title-display";
import { ButtonLink, Card, ProgressBar, StatusDot } from "@/components/ui";
import {
  groupCoursesByTopic,
  UNCategorized_TOPIC_LABEL,
  type CourseHierarchyItem,
} from "@/lib/course-hierarchy";
import { formatEstimatedDuration } from "@/lib/course-duration";

interface CourseListItem extends CourseHierarchyItem {
  inProgress?: boolean;
  seminarStatus?: string;
  seminarStatusLabel?: string;
}

function TopicGroupSection({
  title,
  courses,
  defaultOpen = true,
}: {
  title: string;
  courses: CourseListItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (courses.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-lg font-semibold text-slate-900">
          {open ? "▾" : "▸"} {title}
        </span>
        <span className="text-sm text-slate-500">
          {courses.length} Schulung{courses.length === 1 ? "" : "en"}
        </span>
      </button>
      {open && (
        <ul className="space-y-3 border-t border-slate-100 px-4 py-4">
          {courses.map((c) => (
            <li key={c.id}>
              <CourseCard course={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CourseCard({ course }: { course: CourseListItem }) {
  const inProgress = course.inProgress ?? false;
  const durationLabel = formatEstimatedDuration(course.estimatedDurationMinutes);
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold">
          <CourseTitleDisplay code={course.code} title={course.title} />
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
          {course.certificate && <StatusDot status={course.certificate.status} />}
          {course.seminarStatusLabel ??
            (course.certificate?.validUntil
              ? `Zertifikat gültig bis ${new Date(course.certificate.validUntil).toLocaleDateString("de-DE")}`
              : "Offen")}
          {durationLabel && (
            <span className="text-slate-500">· {durationLabel}</span>
          )}
        </p>
      </div>
      <ButtonLink href={`/schulung?courseId=${encodeURIComponent(course.id)}`}>
        {inProgress ? "Fortsetzen" : "Starten"}
      </ButtonLink>
    </Card>
  );
}

interface TrainingData {
  course: {
    id: string;
    name: string;
    version: string;
    passingScore: number;
    minCorrectAnswers: number;
    examQuestionsPerTest?: number;
    modules: { id: number; title: string; duration: number; lessons: unknown[] }[];
    maxDurationMinutes: number;
  };
  attempt: {
    completedLessons: number;
    totalLessons: number;
    lessonsComplete: boolean;
    examAvailable: boolean;
    nextLessonUrl: string | null;
    hasStarted: boolean;
  };
  certificate: {
    id: number;
    certificateNumber: string;
    validUntil: string | null;
    score: number;
    status: "green" | "yellow" | "red";
  } | null;
}

function SchulungContent() {
  const params = useSearchParams();
  const courseId = params.get("courseId");
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const trainingUrl = courseId
      ? `/api/training?courseId=${encodeURIComponent(courseId)}`
      : "/api/training";

    fetch(trainingUrl)
      .then(async (r) => {
        if (cancelled) return null;
        if (r.status === 401) {
          window.location.replace("/login");
          return null;
        }
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error ?? "Laden fehlgeschlagen.");
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d) return;
        if (d.courses) {
          setCourses(d.courses);
          setData(null);
        } else {
          setData(d);
          setCourses(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) return <p className="text-sm text-slate-600">Schulungen werden geladen…</p>;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-red-600" role="alert">{error}</p>
      </div>
    );
  }

  if (courses && !courseId) {
    const { uncategorized, groups } = groupCoursesByTopic(courses);

    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Meine Schulungen" />
        <div className="space-y-4">
          {groups.map((group) => (
            <TopicGroupSection
              key={group.topicId ?? group.name}
              title={group.name}
              courses={group.courses as CourseListItem[]}
            />
          ))}
          {uncategorized.length > 0 && (
            <TopicGroupSection
              title={UNCategorized_TOPIC_LABEL}
              courses={uncategorized as CourseListItem[]}
              defaultOpen={groups.length === 0}
            />
          )}
        </div>

        {courses.length === 0 && (
          <p className="text-center text-slate-500">Keine Schulungen zugewiesen.</p>
        )}
      </div>
    );
  }

  if (!data && !courses) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-slate-600" role="status">
          Weiterleitung…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-red-600" role="alert">
          Schulung konnte nicht geladen werden.
        </p>
        <ButtonLink href="/schulung" variant="secondary" className="mt-4">
          Zur Übersicht
        </ButtonLink>
      </div>
    );
  }

  const { course, attempt, certificate } = data;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={course.name}
        actions={
          <ButtonLink href="/schulung" variant="secondary">
            Alle Schulungen
          </ButtonLink>
        }
      />

      <Card className="mb-6">
        <p className="readable-text text-base text-slate-600">
          Version {course.version} · max. {course.maxDurationMinutes} Min. inkl.
          Test · Bestehen ab {course.passingScore} % (
          {course.minCorrectAnswers} von {course.examQuestionsPerTest ?? 15} Fragen)
        </p>
        <div className="mt-4">
          <ProgressBar value={attempt.completedLessons} max={attempt.totalLessons} />
        </div>
        <p className="mt-2 text-base text-slate-600">
          {attempt.completedLessons} von {attempt.totalLessons} Lernschritten abgeschlossen
        </p>
      </Card>

      {certificate && (
        <Card className="mb-6 border-brand-light bg-brand-light">
          <div className="flex items-start gap-3">
            <StatusDot status={certificate.status} />
            <div className="flex-1">
              <h2 className="font-semibold text-brand">Zertifikat vorhanden</h2>
              <p className="text-base text-brand">
                {certificate.certificateNumber}
                {certificate.validUntil ? (
                  <>
                    {" · gültig bis "}
                    <time dateTime={certificate.validUntil}>
                      {new Date(certificate.validUntil).toLocaleDateString("de-DE")}
                    </time>
                  </>
                ) : (
                  " · unbegrenzt gültig"
                )}
              </p>
              <a href={`/api/certificates/${certificate.id}/pdf`} className="link-brand mt-3 text-base">
                Zertifikat als PDF herunterladen
              </a>
            </div>
          </div>
        </Card>
      )}

      <nav className="mb-8 space-y-3" aria-label="Schulungsaktionen">
        {!attempt.lessonsComplete && attempt.nextLessonUrl && (
          <ButtonLink href={attempt.nextLessonUrl} className="w-full text-lg py-4">
            {attempt.hasStarted ? "Schulung fortsetzen" : "Schulung starten"}
          </ButtonLink>
        )}
        {!attempt.lessonsComplete && !attempt.nextLessonUrl && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {attempt.totalLessons === 0
              ? "Dieser Kurs enthält noch keine Lerninhalte."
              : "Kein nächster Lernschritt verfügbar."}
          </p>
        )}
        {attempt.examAvailable && courseId && (
          <ButtonLink
            href={`/schulung/pruefung?courseId=${encodeURIComponent(courseId)}`}
            className="w-full"
          >
            Zum Abschlusstest
          </ButtonLink>
        )}
      </nav>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-800 min-h-[44px] flex items-center">
          Modulübersicht ({course.modules.length} Module)
        </summary>
        <ul className="mt-4 space-y-2" role="list">
          {course.modules.map((mod) => (
            <li key={mod.id} className="rounded-xl border border-slate-100 px-3 py-2 text-base">
              <span className="font-medium">
                {mod.id}. {mod.title}
              </span>
              <span className="text-slate-500">
                {" "}
                · ca. {mod.duration} Min. · {mod.lessons?.length ?? 0} Schritte
              </span>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-6">
        <ButtonLink href="/schulung/feedback" variant="secondary" className="w-full">
          Fragen oder Anregungen
        </ButtonLink>
      </div>
    </div>
  );
}

export default function SchulungPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Schulungen werden geladen…</p>}>
      <SchulungContent />
    </Suspense>
  );
}

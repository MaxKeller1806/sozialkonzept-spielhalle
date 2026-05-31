"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ButtonLink,
  Card,
  EmployeeHeader,
  LoadingStatus,
  PageMain,
  ProgressBar,
  StatusDot,
} from "@/components/ui";

interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  inProgress: boolean;
  certificate: {
    id: number;
    validUntil: string;
    status: "green" | "yellow" | "red";
  } | null;
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
    validUntil: string;
    score: number;
    status: "green" | "yellow" | "red";
  } | null;
}

function SchulungContent() {
  const router = useRouter();
  const params = useSearchParams();
  const courseId = params.get("courseId");
  const [courses, setCourses] = useState<CourseListItem[] | null>(null);
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = courseId
      ? `/api/training?courseId=${encodeURIComponent(courseId)}`
      : "/api/training";
    fetch(url)
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.courses) {
          setCourses(d.courses);
          setData(null);
        } else {
          setData(d);
          setCourses(null);
        }
        setLoading(false);
      });
  }, [router, courseId]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) return <LoadingStatus />;

  if (courses && !courseId) {
    return (
      <div className="min-h-screen pb-12">
        <EmployeeHeader pageTitle="Meine Schulungen" />
        <PageMain className="mx-auto max-w-2xl px-4 py-8">
          <div className="mb-6 flex justify-end">
            <button type="button" onClick={logout} className="link-brand text-sm">
              Abmelden
            </button>
          </div>
          <ul className="space-y-4">
            {courses.map((c) => (
              <li key={c.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    {c.certificate && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <StatusDot status={c.certificate.status} />
                        Zertifikat gültig bis{" "}
                        {new Date(c.certificate.validUntil).toLocaleDateString("de-DE")}
                      </p>
                    )}
                  </div>
                  <ButtonLink href={`/schulung?courseId=${encodeURIComponent(c.id)}`}>
                    {c.inProgress ? "Fortsetzen" : "Starten"}
                  </ButtonLink>
                </Card>
              </li>
            ))}
          </ul>
          {courses.length === 0 && (
            <p className="text-center text-slate-500">Keine Schulungen zugewiesen.</p>
          )}
        </PageMain>
      </div>
    );
  }

  if (!data) return <LoadingStatus />;

  const { course, attempt, certificate } = data;

  return (
    <div className="min-h-screen pb-12">
      <EmployeeHeader pageTitle={course.name} />
      <PageMain className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex justify-between">
          <ButtonLink href="/schulung" variant="secondary">
            Alle Schulungen
          </ButtonLink>
          <button type="button" onClick={logout} className="link-brand text-sm">
            Abmelden
          </button>
        </div>

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
                  {certificate.certificateNumber} · gültig bis{" "}
                  <time dateTime={certificate.validUntil}>
                    {new Date(certificate.validUntil).toLocaleDateString("de-DE")}
                  </time>
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
      </PageMain>
    </div>
  );
}

export default function SchulungPage() {
  return (
    <Suspense fallback={<LoadingStatus />}>
      <SchulungContent />
    </Suspense>
  );
}

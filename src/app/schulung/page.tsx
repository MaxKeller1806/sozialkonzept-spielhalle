"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ButtonLink,
  Card,
  EmployeeHeader,
  LoadingStatus,
  PageMain,
  ProgressBar,
  StatusDot,
} from "@/components/ui";

interface TrainingData {
  course: {
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

export default function SchulungPage() {
  const router = useRouter();
  const [data, setData] = useState<TrainingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/training")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      });
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading || !data) {
    return <LoadingStatus />;
  }

  const { course, attempt, certificate } = data;
  const { completedLessons, totalLessons } = attempt;

  return (
    <div className="min-h-screen pb-12">
      <EmployeeHeader pageTitle="Ihre Schulung" />
      <PageMain className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex justify-end">
          <button type="button" onClick={logout} className="link-brand text-sm">
            Abmelden
          </button>
        </div>

        <Card className="mb-6">
          <p className="readable-text text-base text-slate-600">
            Version {course.version} · max. {course.maxDurationMinutes} Min. inkl.
            Test · Bestehen ab {course.passingScore} % (
            {course.minCorrectAnswers} von{" "}
            {course.examQuestionsPerTest ?? 15} Fragen)
          </p>
          <div className="mt-4">
            <ProgressBar value={completedLessons} max={totalLessons} />
          </div>
          <p className="mt-2 text-base text-slate-600">
            {completedLessons} von {totalLessons} Lernschritten abgeschlossen
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
                <a
                  href={`/api/certificates/${certificate.id}/pdf`}
                  className="link-brand mt-3 text-base"
                >
                  Zertifikat als PDF herunterladen
                </a>
              </div>
            </div>
          </Card>
        )}

        <nav className="mb-8 space-y-3" aria-label="Schulungsaktionen">
          {!attempt.lessonsComplete && attempt.nextLessonUrl && (
            <ButtonLink
              href={attempt.nextLessonUrl}
              className="w-full text-lg py-4"
            >
              {attempt.hasStarted ? "Schulung fortsetzen" : "Schulung starten"}
            </ButtonLink>
          )}
          {attempt.examAvailable && (
            <ButtonLink href="/schulung/pruefung" className="w-full">
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
              <li
                key={mod.id}
                className="rounded-xl border border-slate-100 px-3 py-2 text-base"
              >
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

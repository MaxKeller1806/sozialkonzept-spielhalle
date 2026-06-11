"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { AdminExamQuestionPreview } from "@/components/admin-exam-question-preview";
import { AdminPreviewBanner } from "@/components/admin-preview-banner";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";
import { adminPreviewBasePath } from "@/lib/admin-course-preview";
import { useAdminCoursePreview } from "@/hooks/use-admin-course-preview";

function PruefungVorschauContent() {
  const params = useParams();
  const courseId = decodeURIComponent(String(params.courseId ?? ""));
  const { previewCourse, permissions, loading, error } =
    useAdminCoursePreview(courseId);

  const sections = useMemo(() => {
    if (!previewCourse) return [];
    return previewCourse.modules.map((mod) => ({
      moduleId: mod.id,
      moduleTitle: `${mod.id}. ${mod.title}`,
      questions: previewCourse.exam
        .filter((q) => q.moduleId === mod.id)
        .sort((a, b) => a.id - b.id),
    }));
  }, [previewCourse]);

  const unassigned = useMemo(() => {
    if (!previewCourse) return [];
    const moduleIds = new Set(previewCourse.modules.map((m) => m.id));
    return previewCourse.exam.filter((q) => !moduleIds.has(q.moduleId));
  }, [previewCourse]);

  const totalQuestions = previewCourse?.exam.length ?? 0;
  const perTest = previewCourse?.examQuestionsPerTest ?? 15;

  if (loading) {
    return (
      <p className="px-4 py-8 text-sm text-slate-600">
        Prüfungsfragen werden geladen…
      </p>
    );
  }

  if (error || !previewCourse) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600" role="alert">
          {error ?? "Prüfungsfragen konnten nicht geladen werden."}
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

  let questionNum = 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Abschlusstest – Vorschau"
        actions={
          <ButtonLink href={adminPreviewBasePath(courseId)} variant="secondary">
            Zur Vorschau-Übersicht
          </ButtonLink>
        }
      />

      <p className="mb-4 text-sm text-slate-600">
        <Link href={adminPreviewBasePath(courseId)} className="text-brand underline">
          ← {previewCourse.courseName}
        </Link>
      </p>

      <AdminPreviewBanner fromMaster={permissions.fromMaster} />

      <Card className="mb-6">
        <p className="readable-text text-base text-slate-600">
          {totalQuestions} Fragen im Pool · Mitarbeiter erhalten {perTest} zufällige
          Fragen pro Test · Bestehen ab {previewCourse.passingScore} % (
          {previewCourse.minCorrectAnswers} richtig)
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Richtige Antworten sind für Administratoren sichtbar markiert.
        </p>
      </Card>

      {totalQuestions === 0 ? (
        <p className="text-sm text-slate-500">Keine Prüfungsfragen vorhanden.</p>
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.moduleId}>
              <h2 className="text-brand mb-4 rounded-xl bg-brand-light px-4 py-3 text-lg font-bold">
                {section.moduleTitle}
              </h2>
              {section.questions.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Keine Fragen für dieses Modul.
                </p>
              ) : (
                <div className="space-y-6">
                  {section.questions.map((q) => {
                    questionNum += 1;
                    return (
                      <AdminExamQuestionPreview
                        key={q.id}
                        question={q}
                        number={questionNum}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          {unassigned.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-bold text-amber-800">
                Ohne Modulzuordnung
              </h2>
              <div className="space-y-6">
                {unassigned.map((q) => {
                  questionNum += 1;
                  return (
                    <AdminExamQuestionPreview
                      key={q.id}
                      question={q}
                      number={questionNum}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        Nur Lesezugriff · Keine Prüfungsversuche oder Zertifikate
      </p>
    </div>
  );
}

export default function AdminPruefungVorschauPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>}>
      <PruefungVorschauContent />
    </Suspense>
  );
}

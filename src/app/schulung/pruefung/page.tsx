"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  ButtonLink,
  Card,
  ErrorMessage,
} from "@/components/ui";
import type { AnswerValue } from "@/lib/exam";

interface Question {
  id: number;
  question: string;
  type: "single" | "multiple" | "boolean";
  answers?: string[];
}

interface ExamSection {
  moduleId: number;
  moduleTitle: string;
  questions: Question[];
}

export default function PruefungPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Abschlusstest wird geladen…</p>}>
      <PruefungContent />
    </Suspense>
  );
}

function PruefungContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";
  const formId = useId();
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [poolSize, setPoolSize] = useState(32);
  const [minCorrect, setMinCorrect] = useState(12);
  const [passingScore, setPassingScore] = useState(80);

  useEffect(() => {
    fetch(`/api/training/exam/questions?courseId=${encodeURIComponent(courseId)}`)
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) {
          setError(data.error);
        } else {
          setQuestions(data.questions);
          if (data.poolSize) setPoolSize(data.poolSize);
          if (data.minCorrect) setMinCorrect(data.minCorrect);
          if (data.passingScore) setPassingScore(data.passingScore);
          setSections(
            data.sections ?? [
              {
                moduleId: 0,
                moduleTitle: "Abschlusstest",
                questions: data.questions,
              },
            ]
          );
        }
        setLoading(false);
      });
  }, [router, courseId]);

  function setSingle(id: number, index: number) {
    setAnswers((a) => ({ ...a, [id]: index }));
  }

  function toggleMultiple(id: number, index: number) {
    setAnswers((a) => {
      const current = Array.isArray(a[id]) ? (a[id] as number[]) : [];
      const next = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      return { ...a, [id]: next };
    });
  }

  function setBoolean(id: number, value: boolean) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/training/exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, courseId }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Absenden.");
      return;
    }

    sessionStorage.setItem("examResult", JSON.stringify(data));
    router.push("/schulung/ergebnis");
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Abschlusstest wird geladen…</p>;
  }

  if (error && questions.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <ErrorMessage message={error} />
        <ButtonLink href="/schulung" variant="secondary" className="mt-4">
          Zurück
        </ButtonLink>
      </div>
    );
  }

  let questionNum = 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Abschlusstest" />
      <p className="readable-text mb-6 text-base text-slate-600">
        {questions.length} zufällig ausgewählte Fragen (Pool: {poolSize}) · Mindestens{" "}
        {minCorrect} von {questions.length} richtig ({passingScore} %) zum Bestehen
      </p>

      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-10"
      >
        {sections.map((section) => (
          <section key={section.moduleId} aria-labelledby={`section-${section.moduleId}`}>
            <h2
              id={`section-${section.moduleId}`}
              className="text-brand mb-4 rounded-xl bg-brand-light px-4 py-3 text-lg font-bold"
            >
              {section.moduleTitle}
            </h2>
            <div className="space-y-6">
              {section.questions.map((q) => {
                questionNum += 1;
                const num = questionNum;
                const fieldId = `question-${q.id}`;

                return (
                  <Card key={q.id}>
                    <fieldset className="border-0 p-0">
                      <legend
                        id={fieldId}
                        className="mb-4 block w-full text-base font-semibold"
                      >
                        Frage {num}: {q.question}
                      </legend>

                      {q.type === "boolean" && (
                        <div
                          className="flex flex-col gap-2 sm:flex-row"
                          role="radiogroup"
                          aria-labelledby={fieldId}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-light min-h-[44px]">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={answers[q.id] === true}
                              onChange={() => setBoolean(q.id, true)}
                            />
                            Richtig
                          </label>
                          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-light min-h-[44px]">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={answers[q.id] === false}
                              onChange={() => setBoolean(q.id, false)}
                            />
                            Falsch
                          </label>
                        </div>
                      )}

                      {q.type === "single" && (
                        <div role="radiogroup" aria-labelledby={fieldId}>
                          {q.answers?.map((ans, i) => (
                            <label
                              key={i}
                              className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-light min-h-[44px]"
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={answers[q.id] === i}
                                onChange={() => setSingle(q.id, i)}
                              />
                              <span>{ans}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "multiple" && (
                        <div role="group" aria-labelledby={fieldId}>
                          {q.answers?.map((ans, i) => (
                            <label
                              key={i}
                              className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-light min-h-[44px]"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  Array.isArray(answers[q.id]) &&
                                  (answers[q.id] as number[]).includes(i)
                                }
                                onChange={() => toggleMultiple(q.id, i)}
                              />
                              <span>{ans}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </fieldset>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </form>

      <ErrorMessage message={error} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/schulung" variant="secondary" className="flex-1">
          Abbrechen
        </ButtonLink>
        <Button
          type="submit"
          form={formId}
          disabled={submitting}
          className="flex-1 w-full"
          aria-busy={submitting}
        >
          {submitting ? "Wird ausgewertet…" : "Test absenden"}
        </Button>
      </div>
    </div>
  );
}

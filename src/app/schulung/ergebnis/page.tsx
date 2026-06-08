"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";

interface ExamQuestionReview {
  questionId: number;
  question: string;
  isCorrect: boolean;
  userAnswerLabel: string;
  correctAnswerLabel: string;
}

interface ExamResult {
  correct: number;
  total: number;
  scorePercent: number;
  passed: boolean;
  passingScore: number;
  minRequired: number;
  incorrectReview?: ExamQuestionReview[];
  certificate: {
    id: number;
    certificateNumber: string;
    validUntil: string;
  } | null;
}

export default function ErgebnisPage() {
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("examResult");
    if (raw) setResult(JSON.parse(raw));
  }, []);

  if (!result) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <p role="status">Kein Ergebnis vorhanden.</p>
        <ButtonLink href="/schulung" variant="secondary" className="mt-4">
          Zur Schulung
        </ButtonLink>
      </div>
    );
  }

  const incorrect = result.incorrectReview ?? [];
  const resultSummary = result.passed
    ? `Bestanden. ${result.correct} von ${result.total} Fragen richtig, ${result.scorePercent} Prozent.`
    : `Nicht bestanden. ${result.correct} von ${result.total} Fragen richtig, ${result.scorePercent} Prozent. Erforderlich waren mindestens ${result.minRequired} richtige Antworten bei ${result.passingScore} Prozent.`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Prüfungsergebnis" />
      <div role="status" aria-live="polite" aria-atomic="true" className="live-region">
        {resultSummary}
      </div>

      <Card
        className={
          result.passed
            ? "border-emerald-200 bg-emerald-50 text-center"
            : "border-amber-200 bg-amber-50 text-center"
        }
        aria-labelledby="result-heading"
      >
        <p className="text-5xl font-bold" aria-hidden="true">
          {result.passed ? "✓" : "✗"}
        </p>
        <h2 id="result-heading" className="mt-4 text-2xl font-bold">
          {result.passed ? "Bestanden!" : "Nicht bestanden"}
        </h2>
        <p className="mt-2 text-lg">
          {result.correct} von {result.total} richtig ({result.scorePercent} %)
        </p>
        <p className="mt-1 text-base text-slate-600">
          Erforderlich: mindestens {result.minRequired} richtig ({result.passingScore} %)
        </p>
      </Card>

      {incorrect.length > 0 && (
        <section className="mt-8" aria-labelledby="review-heading">
          <h2 id="review-heading" className="mb-4 text-lg font-bold">
            Falsch beantwortete Fragen ({incorrect.length})
          </h2>
          <ul className="space-y-4">
            {incorrect.map((item, index) => (
              <li key={item.questionId}>
                <Card className="border-amber-200 bg-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Frage {index + 1}
                  </p>
                  <p className="mt-2 font-medium">{item.question}</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="font-semibold text-red-700">Ihre Antwort</dt>
                      <dd>{item.userAnswerLabel}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-emerald-700">Richtige Antwort</dt>
                      <dd>{item.correctAnswerLabel}</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="mt-8 space-y-3" aria-label="Nächste Schritte">
        {result.passed && result.certificate && (
          <a
            href={`/api/certificates/${result.certificate.id}/pdf`}
            className={`inline-flex w-full items-center justify-center rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white min-h-[44px] hover:opacity-90`}
          >
            Zertifikat als PDF herunterladen
          </a>
        )}
        {!result.passed && (
          <ButtonLink href="/schulung" className="w-full">
            Schulung wiederholen
          </ButtonLink>
        )}
        <ButtonLink href="/schulung/feedback" variant="secondary" className="w-full">
          Fragen oder Anregungen senden
        </ButtonLink>
        <ButtonLink href="/schulung" variant="secondary" className="w-full">
          Zur Übersicht
        </ButtonLink>
      </nav>
    </div>
  );
}

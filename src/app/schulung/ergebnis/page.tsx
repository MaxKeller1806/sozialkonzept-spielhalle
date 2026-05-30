"use client";

import { useEffect, useState } from "react";
import {
  Button,
  ButtonLink,
  Card,
  EmployeeHeader,
  PageMain,
} from "@/components/ui";

interface ExamResult {
  correct: number;
  total: number;
  scorePercent: number;
  passed: boolean;
  passingScore: number;
  minRequired: number;
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
      <PageMain className="mx-auto max-w-lg px-4 py-16 text-center">
        <p role="status">Kein Ergebnis vorhanden.</p>
        <ButtonLink href="/schulung" variant="secondary" className="mt-4">
          Zur Schulung
        </ButtonLink>
      </PageMain>
    );
  }

  const resultSummary = result.passed
    ? `Bestanden. ${result.correct} von ${result.total} Fragen richtig, ${result.scorePercent} Prozent.`
    : `Nicht bestanden. ${result.correct} von ${result.total} Fragen richtig, ${result.scorePercent} Prozent. Erforderlich waren mindestens ${result.minRequired} richtige Antworten bei ${result.passingScore} Prozent.`;

  return (
    <div className="min-h-screen pb-12">
      <EmployeeHeader pageTitle="Prüfungsergebnis" />
      <PageMain className="mx-auto max-w-lg px-4 py-8">
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
      </PageMain>
    </div>
  );
}

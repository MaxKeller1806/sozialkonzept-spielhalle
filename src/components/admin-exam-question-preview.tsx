"use client";

import { Card } from "@/components/ui";
import { getQuestionTypeLabel } from "@/lib/exam-pool-display";
import { formatExamCorrectAnswerLabel } from "@/lib/exam";
import type { ExamQuestion } from "@/lib/types";

function isCorrectOption(question: ExamQuestion, index: number): boolean {
  if (question.type === "single") {
    return question.correct === index;
  }
  if (question.type === "multiple") {
    return Array.isArray(question.correct) && question.correct.includes(index);
  }
  return false;
}

function isCorrectBoolean(question: ExamQuestion, value: boolean): boolean {
  return question.type === "boolean" && question.correct === value;
}

export function AdminExamQuestionPreview({
  question,
  number,
}: {
  question: ExamQuestion;
  number: number;
}) {
  const correctLabel = formatExamCorrectAnswerLabel(question);

  return (
    <Card>
      <p className="text-xs font-medium uppercase text-slate-400">
        Frage {number} · {getQuestionTypeLabel(question.poolQuestionType ?? question.type)}
      </p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">
        {question.question}
      </h3>

      {question.type === "boolean" && (
        <ul className="mt-4 space-y-2" role="list">
          {[
            { value: true, label: "Richtig" },
            { value: false, label: "Falsch" },
          ].map((opt) => (
            <li
              key={String(opt.value)}
              className={`rounded-xl border px-4 py-3 text-base ${
                isCorrectBoolean(question, opt.value)
                  ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {opt.label}
              {isCorrectBoolean(question, opt.value) && (
                <span className="ml-2 text-sm font-normal text-emerald-700">
                  (richtige Antwort)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {(question.type === "single" || question.type === "multiple") && (
        <ul className="mt-4 space-y-2" role="list">
          {question.answers?.map((ans, i) => (
            <li
              key={i}
              className={`rounded-xl border px-4 py-3 text-base ${
                isCorrectOption(question, i)
                  ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {ans}
              {isCorrectOption(question, i) && (
                <span className="ml-2 text-sm font-normal text-emerald-700">
                  (richtige Antwort)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Lösung:</span> {correctLabel}
      </p>
    </Card>
  );
}

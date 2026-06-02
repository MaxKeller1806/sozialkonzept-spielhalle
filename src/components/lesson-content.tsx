"use client";

import { useState } from "react";
import type { ContentBlock, Lesson } from "@/lib/types";

function BlockBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`my-4 rounded-xl border px-4 py-3 text-base leading-relaxed ${className}`}
    >
      {children}
    </div>
  );
}

function InlineQuiz({ block }: { block: ContentBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const correct = block.correct ?? 0;
  const answered = selected !== null;
  const isCorrect = selected === correct;

  return (
    <BlockBox className="border-brand-light bg-brand-light/40">
      <h3 className="text-brand mb-2 font-bold">Wissensfrage</h3>
      <p className="mb-3 font-medium text-slate-800">{block.question}</p>
      <ul className="space-y-2" role="list">
        {block.answers?.map((ans, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={answered}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              className={`w-full rounded-lg border px-3 py-3 text-left transition min-h-[44px] ${
                !answered
                  ? "hover:border-brand hover:bg-white"
                  : i === correct
                    ? "border-emerald-500 bg-emerald-50"
                    : i === selected
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-white"
              }`}
            >
              <span className="sr-only">Antwort {i + 1}: </span>
              {ans}
              {answered && i === correct && (
                <span className="sr-only"> (Richtige Antwort)</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {answered && (
        <p
          className={`mt-3 text-base font-medium ${isCorrect ? "text-emerald-700" : "text-red-700"}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">{isCorrect ? "✓ " : "✗ "}</span>
          {isCorrect ? "Richtig!" : "Leider falsch."}{" "}
          {block.explanation && (
            <span className="font-normal text-slate-700">{block.explanation}</span>
          )}
        </p>
      )}
    </BlockBox>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h3 className="text-brand my-4 text-xl font-bold leading-snug">
          {block.title || block.body}
        </h3>
      );
    case "text":
      return (
        <p className="my-3 leading-relaxed text-slate-700 whitespace-pre-wrap">
          {block.body}
        </p>
      );
    case "info":
      return (
        <BlockBox className="border-slate-200 bg-slate-50">
          {block.title && (
            <h3 className="text-brand mb-1 font-bold">{block.title}</h3>
          )}
          <p className="text-slate-700 whitespace-pre-wrap">{block.body}</p>
        </BlockBox>
      );
    case "merksatz":
      return (
        <BlockBox className="border-brand bg-brand-light">
          <p className="text-brand mb-1 text-xs font-bold uppercase tracking-wide">
            Merksatz
          </p>
          <p className="text-brand text-base font-semibold">{block.body}</p>
        </BlockBox>
      );
    case "hinweis":
      return (
        <BlockBox className="border-amber-300 bg-amber-50">
          <h3 className="mb-1 font-bold text-amber-900">
            {block.title ?? "Hinweis"}
          </h3>
          <p className="text-amber-950 whitespace-pre-wrap">{block.body}</p>
        </BlockBox>
      );
    case "fehler":
      return (
        <BlockBox className="border-red-200 bg-red-50">
          <h3 className="mb-1 font-bold text-red-800">
            {block.title ?? "Typischer Fehler"}
          </h3>
          <p className="text-red-900 whitespace-pre-wrap">{block.body}</p>
        </BlockBox>
      );
    case "praxis":
      return (
        <BlockBox className="border-brand-light bg-white">
          <h3 className="text-brand mb-1 font-bold">
            {block.title ?? "Praxisfall"}
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap">{block.body}</p>
          {block.solution && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-slate-800">
              <span className="font-semibold">Empfohlene Reaktion: </span>
              {block.solution}
            </p>
          )}
        </BlockBox>
      );
    case "dialog":
      return (
        <BlockBox className="border-slate-200 bg-slate-50">
          {block.title && (
            <h3 className="text-brand mb-2 font-bold">{block.title}</h3>
          )}
          <ul className="space-y-2" role="list">
            {block.lines?.map((line, i) => (
              <li key={i}>
                <span className="font-semibold text-slate-900">{line.speaker}: </span>
                <span className="text-slate-700">„{line.text}"</span>
              </li>
            ))}
          </ul>
        </BlockBox>
      );
    case "summary":
      return (
        <BlockBox className="border-emerald-200 bg-emerald-50">
          <h3 className="mb-2 font-bold text-emerald-900">
            {block.title ?? "Zusammenfassung"}
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-emerald-950">
            {block.items?.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </BlockBox>
      );
    case "quiz":
      return <InlineQuiz block={block} />;
    default:
      return null;
  }
}

export function LessonContent({ lesson }: { lesson: Lesson }) {
  if (lesson.blocks?.length) {
    return (
      <div className="readable-text mt-4">
        {lesson.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    );
  }

  return (
    <p className="readable-text mt-6 leading-relaxed text-slate-700 whitespace-pre-wrap">
      {lesson.content}
    </p>
  );
}

import type { ExamQuestion, PoolQuestionType } from "./types";

export function parseExamQuestionBody(body: Record<string, unknown>): ExamQuestion & {
  poolQuestionType: PoolQuestionType;
  explanation?: string;
  difficulty?: string;
  active?: boolean;
} {
  const rawType = String(body.type ?? "single");
  const poolQuestionType: PoolQuestionType =
    rawType === "situation"
      ? "situation"
      : rawType === "multiple"
        ? "multiple"
        : rawType === "boolean"
          ? "boolean"
          : "single";

  const examType =
    poolQuestionType === "situation"
      ? "single"
      : poolQuestionType === "boolean"
        ? "boolean"
        : poolQuestionType;

  return {
    id: body.id != null ? Number(body.id) : 0,
    moduleId: Number(body.moduleId ?? 0),
    question: String(body.question ?? "").trim(),
    type: examType,
    answers: examType === "boolean" ? undefined : (body.answers as string[] | undefined),
    correct: body.correct as ExamQuestion["correct"],
    explanation: body.explanation != null ? String(body.explanation) : undefined,
    difficulty: body.difficulty != null ? String(body.difficulty) : undefined,
    active: body.active !== undefined ? Boolean(body.active) : true,
    poolQuestionType,
  };
}

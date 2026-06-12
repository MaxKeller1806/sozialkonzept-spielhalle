import type { ExamQuestion, QuestionPoolItem, QuestionSourceType, PoolQuestionType } from "./types";

export function answersFromPoolItem(item: QuestionPoolItem): string[] {
  return [item.answerA, item.answerB, item.answerC, item.answerD].filter(
    (a): a is string => !!a?.trim()
  );
}

export function parseCorrectAnswer(
  raw: string,
  type: PoolQuestionType,
  answerCount: number
): number | number[] | boolean {
  if (type === "boolean") {
    return raw === "true" || raw === "1";
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (type === "multiple" && Array.isArray(parsed)) {
      return parsed.map(Number);
    }
    if (typeof parsed === "number") return parsed;
    if (typeof parsed === "string" && /^\d+$/.test(parsed)) return Number(parsed);
  } catch {
    // fall through
  }
  const num = Number(raw);
  if (!Number.isNaN(num) && num >= 0 && num < answerCount) return num;
  return 0;
}

export function serializeCorrectAnswer(
  type: PoolQuestionType,
  correct: number | number[] | boolean
): string {
  if (type === "boolean") return String(correct);
  return JSON.stringify(correct);
}

export function poolItemToExamQuestion(item: QuestionPoolItem): ExamQuestion {
  const answers = answersFromPoolItem(item);
  const examType =
    item.questionType === "situation"
      ? "single"
      : item.questionType === "boolean"
        ? "boolean"
        : item.questionType;

  return {
    id: item.id,
    moduleId: item.moduleId ?? 0,
    question: item.question,
    type: examType,
    answers: examType === "boolean" ? undefined : answers,
    correct: parseCorrectAnswer(item.correctAnswer, item.questionType, answers.length),
    explanation: item.explanation ?? undefined,
    sourceType: item.sourceType,
    poolQuestionType: item.questionType,
    difficulty: item.difficulty ?? undefined,
    active: item.active,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
  };
}

export function examQuestionToPoolInput(
  question: ExamQuestion & {
    explanation?: string | null;
    difficulty?: string | null;
    sourceType: QuestionSourceType;
    active?: boolean;
    poolQuestionType?: PoolQuestionType;
  },
  courseId: string,
  companyId: number | null
): Omit<QuestionPoolItem, "id" | "createdAt" | "updatedAt"> {
  const poolType: PoolQuestionType =
    question.poolQuestionType ??
    (question.type === "boolean"
      ? "boolean"
      : question.type === "multiple"
        ? "multiple"
        : "single");

  const answers = question.answers ?? [];
  return {
    courseId,
    companyId: question.sourceType === "master" ? null : companyId,
    sourceType: question.sourceType,
    question: question.question,
    questionType: poolType,
    answerA: answers[0] ?? (question.type === "boolean" ? "Richtig" : null),
    answerB: answers[1] ?? (question.type === "boolean" ? "Falsch" : null),
    answerC: answers[2] ?? null,
    answerD: answers[3] ?? null,
    correctAnswer: serializeCorrectAnswer(poolType, question.correct),
    explanation: question.explanation ?? null,
    difficulty: (question.difficulty as QuestionPoolItem["difficulty"]) ?? null,
    moduleId: question.moduleId > 0 ? question.moduleId : null,
    active: question.active ?? true,
    sortOrder: question.sortOrder ?? 0,
  };
}

export function mapPoolRow(row: Record<string, unknown>): QuestionPoolItem {
  return {
    id: Number(row.id),
    courseId: String(row.course_id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    sourceType: String(row.source_type) as QuestionSourceType,
    question: String(row.question),
    questionType: String(row.question_type) as PoolQuestionType,
    answerA: row.answer_a != null ? String(row.answer_a) : null,
    answerB: row.answer_b != null ? String(row.answer_b) : null,
    answerC: row.answer_c != null ? String(row.answer_c) : null,
    answerD: row.answer_d != null ? String(row.answer_d) : null,
    correctAnswer: String(row.correct_answer),
    explanation: row.explanation != null ? String(row.explanation) : null,
    difficulty:
      row.difficulty != null
        ? (String(row.difficulty) as QuestionPoolItem["difficulty"])
        : null,
    moduleId: row.module_id != null ? Number(row.module_id) : null,
    active: Boolean(row.active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: new Date(String(row.created_at ?? Date.now())).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? Date.now())).toISOString(),
  };
}

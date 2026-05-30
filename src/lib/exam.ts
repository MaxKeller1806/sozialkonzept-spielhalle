import type { ExamQuestion } from "./types";

export type AnswerValue = number | number[] | boolean | null;

export interface ExamQuestionReview {
  questionId: number;
  question: string;
  isCorrect: boolean;
  userAnswerLabel: string;
  correctAnswerLabel: string;
}

export function scoreExam(
  questions: ExamQuestion[],
  answers: Record<number, AnswerValue>,
  passingScore = 80
): { correct: number; total: number; scorePercent: number; passed: boolean; passingScore: number } {
  let correct = 0;
  const total = questions.length;

  for (const q of questions) {
    const userAnswer = answers[q.id];
    if (isAnswerCorrect(q, userAnswer)) {
      correct += 1;
    }
  }

  const scorePercent = Math.round((correct / total) * 100);
  const passed = scorePercent >= passingScore;

  return { correct, total, scorePercent, passed, passingScore };
}

export function buildExamReview(
  questions: ExamQuestion[],
  answers: Record<number, AnswerValue>
): ExamQuestionReview[] {
  return questions.map((q) => ({
    questionId: q.id,
    question: q.question,
    isCorrect: isAnswerCorrect(q, answers[q.id]),
    userAnswerLabel: formatUserAnswer(q, answers[q.id]),
    correctAnswerLabel: formatCorrectAnswer(q),
  }));
}

export function getIncorrectReview(review: ExamQuestionReview[]): ExamQuestionReview[] {
  return review.filter((r) => !r.isCorrect);
}

function formatUserAnswer(question: ExamQuestion, userAnswer: AnswerValue): string {
  if (userAnswer === null || userAnswer === undefined) {
    return "Keine Antwort";
  }
  if (question.type === "boolean") {
    return userAnswer === true ? "Richtig" : "Falsch";
  }
  if (question.type === "single") {
    const idx = userAnswer as number;
    return question.answers?.[idx] ?? "—";
  }
  if (question.type === "multiple") {
    const indices = Array.isArray(userAnswer) ? userAnswer : [];
    if (indices.length === 0) return "Keine Antwort";
    return indices
      .map((i) => question.answers?.[i])
      .filter(Boolean)
      .join(", ");
  }
  return "—";
}

function formatCorrectAnswer(question: ExamQuestion): string {
  if (question.type === "boolean") {
    return question.correct === true ? "Richtig" : "Falsch";
  }
  if (question.type === "single") {
    const idx = question.correct as number;
    return question.answers?.[idx] ?? "—";
  }
  if (question.type === "multiple") {
    const indices = question.correct as number[];
    return indices
      .map((i) => question.answers?.[i])
      .filter(Boolean)
      .join(", ");
  }
  return "—";
}

export function isAnswerCorrect(question: ExamQuestion, userAnswer: AnswerValue): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;

  if (question.type === "boolean") {
    return userAnswer === question.correct;
  }

  if (question.type === "single") {
    return userAnswer === question.correct;
  }

  if (question.type === "multiple") {
    const expected = [...(question.correct as number[])].sort((a, b) => a - b);
    const given = Array.isArray(userAnswer)
      ? [...userAnswer].sort((a, b) => a - b)
      : [];
    if (expected.length !== given.length) return false;
    return expected.every((v, i) => v === given[i]);
  }

  return false;
}

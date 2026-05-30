import type { ExamQuestion } from "./types";

export type AnswerValue = number | number[] | boolean | null;

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

function isAnswerCorrect(question: ExamQuestion, userAnswer: AnswerValue): boolean {
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

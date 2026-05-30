import type { ExamQuestion } from "./types";

export function shuffleQuestions<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectExamQuestions(
  pool: ExamQuestion[],
  count: number
): ExamQuestion[] {
  if (pool.length <= count) return [...pool].sort((a, b) => a.id - b.id);
  return shuffleQuestions(pool).slice(0, count).sort((a, b) => a.id - b.id);
}

export function questionsByIds(
  pool: ExamQuestion[],
  ids: number[]
): ExamQuestion[] {
  const map = new Map(pool.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter(Boolean) as ExamQuestion[];
}

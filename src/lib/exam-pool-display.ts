export { getQuestionTypeLabel } from "./question-type-labels";

/** Felder für Pool-Sortierung: sort_order → created_at → id */
export type PoolQuestionSortFields = {
  id: number;
  sortOrder?: number | null;
  createdAt?: string | null;
};

export function compareExamQuestionsForDisplay(
  a: PoolQuestionSortFields,
  b: PoolQuestionSortFields
): number {
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;
  if (orderA !== orderB) return orderA - orderB;
  if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }
  return a.id - b.id;
}

export function sortExamQuestionsForDisplay<T extends PoolQuestionSortFields>(
  questions: T[]
): T[] {
  return [...questions].sort(compareExamQuestionsForDisplay);
}

/** Fortlaufende Nummern 1…n im gesamten Pool (key = Datenbank-ID). */
export function buildPoolQuestionNumberMap<T extends PoolQuestionSortFields & { id: number }>(
  questions: T[]
): Map<number, number> {
  const map = new Map<number, number>();
  sortExamQuestionsForDisplay(questions).forEach((q, index) => {
    map.set(q.id, index + 1);
  });
  return map;
}

export function getPoolQuestionNumber(
  map: Map<number, number>,
  questionId: number
): number | undefined {
  return map.get(questionId);
}

export function formatPoolQuestionLabel(index: number): string {
  return `Frage ${index + 1}`;
}

export function formatPoolQuestionDisplayNumber(
  map: Map<number, number>,
  questionId: number,
  fallback = "—"
): string {
  const n = map.get(questionId);
  return n != null ? formatPoolQuestionLabel(n - 1) : fallback;
}

/** Nur für Superuser – kleine Debug-Zeile unter der Fragennummer. */
export function formatInternalQuestionIdHint(
  questionId: number,
  visible: boolean
): string | null {
  if (!visible) return null;
  return `Interne ID: ${questionId}`;
}

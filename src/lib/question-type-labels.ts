/** Deutsche UI-Labels für Fragetypen (DB-Werte bleiben unverändert). */
const QUESTION_TYPE_LABELS: Record<string, string> = {
  single: "Einfachauswahl",
  multiple: "Mehrfachauswahl",
  boolean: "Richtig/Falsch",
  situation: "Situationsfrage",
};

export function getQuestionTypeLabel(type: string | undefined | null): string {
  if (!type) return "—";
  return QUESTION_TYPE_LABELS[type.toLowerCase()] ?? type;
}

/** Reihenfolge für die Anzeige im Fragenpool (kein sort_order – id als stabile Sortierung). */
export function sortExamQuestionsForDisplay<
  T extends { id: number; active?: boolean }
>(questions: T[]): T[] {
  return [...questions].sort((a, b) => a.id - b.id);
}

export function formatPoolQuestionLabel(index: number): string {
  return `Frage ${index + 1}`;
}

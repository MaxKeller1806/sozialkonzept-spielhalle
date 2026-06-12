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

/** @deprecated Import from ./exam-pool-display */
export {
  formatPoolQuestionLabel,
  sortExamQuestionsForDisplay,
  buildPoolQuestionNumberMap,
  formatPoolQuestionDisplayNumber,
} from "./exam-pool-display";

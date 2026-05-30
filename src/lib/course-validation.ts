import type { CourseModule, ExamQuestion, Lesson } from "./types";

export function validateModule(
  module: Partial<CourseModule>
): string | null {
  if (!module.title?.trim()) return "Titel ist erforderlich.";
  if (!module.duration || module.duration < 1) {
    return "Dauer muss mindestens 1 Minute sein.";
  }
  return null;
}

export function validateLesson(lesson: Partial<Lesson>): string | null {
  if (!lesson.title?.trim()) return "Titel des Lerninhalts ist erforderlich.";
  if (!lesson.content?.trim()) return "Text des Lerninhalts ist erforderlich.";
  return null;
}

export function validateExamQuestion(
  question: Partial<ExamQuestion>,
  moduleIds?: number[]
): string | null {
  if (!question.moduleId || question.moduleId < 1) {
    return "Bitte ein Modul zuordnen.";
  }
  if (moduleIds && !moduleIds.includes(question.moduleId)) {
    return "Ungültiges Modul.";
  }
  if (!question.question?.trim()) return "Fragentext ist erforderlich.";
  if (!question.type) return "Fragetyp ist erforderlich.";

  if (question.type === "boolean") {
    if (typeof question.correct !== "boolean") {
      return "Bitte Richtig oder Falsch als korrekte Antwort wählen.";
    }
    return null;
  }

  const answers = question.answers ?? [];
  if (answers.length < 2) return "Mindestens zwei Antwortmöglichkeiten erforderlich.";

  if (question.type === "single") {
    const correct = question.correct as number;
    if (typeof correct !== "number" || correct < 0 || correct >= answers.length) {
      return "Bitte eine gültige richtige Antwort auswählen.";
    }
  }

  if (question.type === "multiple") {
    const correct = question.correct as number[];
    if (!Array.isArray(correct) || correct.length === 0) {
      return "Mindestens eine richtige Antwort markieren.";
    }
    if (correct.some((i) => i < 0 || i >= answers.length)) {
      return "Ungültige Auswahl bei richtigen Antworten.";
    }
  }

  return null;
}

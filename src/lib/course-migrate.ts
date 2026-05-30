import type { CourseData, CourseModule, ExamQuestion, Lesson } from "./types";

/** Fallback-Zuordnung für bestehende Fragen ohne moduleId */
const LEGACY_QUESTION_MODULE: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 3,
  6: 4,
  7: 4,
  8: 5,
  9: 5,
  10: 6,
  11: 7,
  12: 3,
  13: 1,
  14: 4,
  15: 2,
};

function migrateExamQuestion(q: ExamQuestion & { moduleId?: number }): ExamQuestion {
  const moduleId =
    q.moduleId ??
    LEGACY_QUESTION_MODULE[q.id] ??
    1;
  return { ...q, moduleId };
}

type LegacyModule = CourseModule & { content?: string };

export function migrateModule(raw: LegacyModule): CourseModule {
  if (raw.lessons?.length) {
    return {
      id: raw.id,
      title: raw.title,
      duration: raw.duration,
      lessons: raw.lessons,
    };
  }

  if (raw.content?.trim()) {
    return {
      id: raw.id,
      title: raw.title,
      duration: raw.duration,
      lessons: [{ id: 1, title: "Lerninhalt", content: raw.content.trim() }],
    };
  }

  return {
    id: raw.id,
    title: raw.title,
    duration: raw.duration,
    lessons: [],
  };
}

export function migrateCourse(
  course: CourseData & {
    modules: LegacyModule[];
    exam?: (ExamQuestion & { moduleId?: number })[];
  }
): CourseData {
  return {
    ...course,
    modules: course.modules.map(migrateModule),
    exam: (course.exam ?? []).map(migrateExamQuestion),
  };
}

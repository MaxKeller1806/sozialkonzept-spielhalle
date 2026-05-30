import type { CourseData } from "./types";

export interface LessonRef {
  moduleId: number;
  lessonId: number;
  moduleTitle: string;
  lessonTitle: string;
}

export function lessonKey(moduleId: number, lessonId: number): string {
  return `${moduleId}:${lessonId}`;
}

export function flattenLessons(course: CourseData): LessonRef[] {
  return course.modules.flatMap((mod) =>
    mod.lessons.map((lesson) => ({
      moduleId: mod.id,
      lessonId: lesson.id,
      moduleTitle: mod.title,
      lessonTitle: lesson.title,
    }))
  );
}

export function totalLessonCount(course: CourseData): number {
  return flattenLessons(course).length;
}

export function getNextLesson(
  course: CourseData,
  completedKeys: string[]
): LessonRef | null {
  const completed = new Set(completedKeys);
  return (
    flattenLessons(course).find(
      (l) => !completed.has(lessonKey(l.moduleId, l.lessonId))
    ) ?? null
  );
}

export function getPreviousLesson(
  course: CourseData,
  moduleId: number,
  lessonId: number
): LessonRef | null {
  const all = flattenLessons(course);
  const idx = all.findIndex(
    (l) => l.moduleId === moduleId && l.lessonId === lessonId
  );
  return idx > 0 ? all[idx - 1] : null;
}

export function lessonPath(moduleId: number, lessonId: number): string {
  return `/schulung/modul/${moduleId}/lektion/${lessonId}`;
}

export function lessonIndex(
  course: CourseData,
  moduleId: number,
  lessonId: number
): number {
  const all = flattenLessons(course);
  return all.findIndex(
    (l) => l.moduleId === moduleId && l.lessonId === lessonId
  );
}

export function inferLessonProgressFromModules(
  course: CourseData,
  moduleIds: number[]
): string[] {
  const keys: string[] = [];
  for (const modId of moduleIds) {
    const mod = course.modules.find((m) => m.id === modId);
    for (const lesson of mod?.lessons ?? []) {
      keys.push(lessonKey(modId, lesson.id));
    }
  }
  return keys;
}

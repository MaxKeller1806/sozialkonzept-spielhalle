import type { CourseData } from "./types";

export interface AdminPreviewContentStates {
  modules: Record<string, boolean>;
  lessons: Record<string, boolean>;
  questions: Record<string, boolean>;
}

/** Filtert Kursinhalte wie in der Mitarbeiter-Schulung (ohne Certiano-deaktivierte Teile). */
export function filterCourseForEmployeePreview(
  course: CourseData,
  contentStates: AdminPreviewContentStates | null
): CourseData {
  if (!contentStates) return course;

  const modules = course.modules
    .filter((m) => contentStates.modules[String(m.id)] !== false)
    .map((m) => ({
      ...m,
      lessons: m.lessons.filter(
        (l) => contentStates.lessons[`${m.id}:${l.id}`] !== false
      ),
    }));

  const exam = course.exam.filter(
    (q) => contentStates.questions[String(q.id)] !== false
  );

  return { ...course, modules, exam };
}

export function adminPreviewBasePath(courseId: string): string {
  return `/dashboard/seminare/${encodeURIComponent(courseId)}/vorschau`;
}

export function adminPreviewLessonPath(
  courseId: string,
  moduleId: number,
  lessonId: number
): string {
  return `${adminPreviewBasePath(courseId)}/modul/${moduleId}/lektion/${lessonId}`;
}

export function adminPreviewExamPath(courseId: string): string {
  return `${adminPreviewBasePath(courseId)}/pruefung`;
}

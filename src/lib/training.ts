import { ensureSeeded, getSql } from "./db";
import { mapTrainingAttempt } from "./db/row-mappers";
import { getCourseForContext } from "./course";
import {
  flattenLessons,
  inferLessonProgressFromModules,
  lessonKey,
  totalLessonCount,
} from "./course-nav";
import type { CourseData, TrainingAttempt } from "./types";

export type { TrainingAttempt };

export async function getActiveAttempt(
  userId: number,
  courseId: string
): Promise<TrainingAttempt | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM training_attempts
    WHERE user_id = ${userId} AND course_id = ${courseId} AND completed_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `;
  return rows[0]
    ? mapTrainingAttempt(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function startAttempt(
  userId: number,
  companyId: number,
  courseId: string
): Promise<TrainingAttempt> {
  const existing = await getActiveAttempt(userId, courseId);
  if (existing) return existing;

  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO training_attempts (
      user_id, company_id, course_id, module_progress_json, lesson_progress_json
    )
    VALUES (${userId}, ${companyId}, ${courseId}, '[]'::jsonb, '[]'::jsonb)
    RETURNING *
  `;
  return mapTrainingAttempt(rows[0] as Record<string, unknown>);
}

export function getModuleProgress(attempt: TrainingAttempt): number[] {
  try {
    return JSON.parse(attempt.moduleProgressJson || "[]") as number[];
  } catch {
    return [];
  }
}

export function getLessonProgressRaw(attempt: TrainingAttempt): string[] {
  if (!attempt.lessonProgressJson) return [];
  try {
    return JSON.parse(attempt.lessonProgressJson) as string[];
  } catch {
    return [];
  }
}

export function getEffectiveLessonProgress(
  course: CourseData,
  attempt: TrainingAttempt
): string[] {
  const lessonProgress = getLessonProgressRaw(attempt);
  if (lessonProgress.length > 0) return lessonProgress;

  const moduleProgress = getModuleProgress(attempt);
  if (moduleProgress.length > 0) {
    return inferLessonProgressFromModules(course, moduleProgress);
  }
  return [];
}

export async function completeLesson(
  course: CourseData,
  attemptId: number,
  moduleId: number,
  lessonId: number
): Promise<{ lessonProgress: string[]; moduleProgress: number[] }> {
  await ensureSeeded();
  const sql = getSql();

  const rows = await sql`
    SELECT * FROM training_attempts WHERE id = ${attemptId} LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error("Attempt not found");
  }

  const attempt = mapTrainingAttempt(rows[0] as Record<string, unknown>);
  const progress = getEffectiveLessonProgress(course, attempt);
  const key = lessonKey(moduleId, lessonId);
  if (!progress.includes(key)) {
    progress.push(key);
  }

  const moduleProgress = getModuleProgress(attempt);
  const mod = course.modules.find((m) => m.id === moduleId);
  if (mod) {
    const modKeys = mod.lessons.map((l) => lessonKey(moduleId, l.id));
    if (
      modKeys.every((k) => progress.includes(k)) &&
      !moduleProgress.includes(moduleId)
    ) {
      moduleProgress.push(moduleId);
      moduleProgress.sort((a, b) => a - b);
    }
  }

  await sql`
    UPDATE training_attempts
    SET
      lesson_progress_json = ${JSON.stringify(progress)}::jsonb,
      module_progress_json = ${JSON.stringify(moduleProgress)}::jsonb
    WHERE id = ${attemptId}
  `;

  return { lessonProgress: progress, moduleProgress };
}

export async function completeModule(
  course: CourseData,
  attemptId: number,
  moduleId: number
): Promise<number[]> {
  const mod = course.modules.find((m) => m.id === moduleId);
  if (mod) {
    for (const lesson of mod.lessons) {
      await completeLesson(course, attemptId, moduleId, lesson.id);
    }
  }
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM training_attempts WHERE id = ${attemptId} LIMIT 1
  `;
  if (!rows[0]) return [];
  return getModuleProgress(
    mapTrainingAttempt(rows[0] as Record<string, unknown>)
  );
}

export function allModulesComplete(course: CourseData, progress: number[]): boolean {
  return course.modules.every((m) => progress.includes(m.id));
}

export function allLessonsComplete(
  course: CourseData,
  lessonProgress: string[]
): boolean {
  const total = totalLessonCount(course);
  if (total === 0) return false;
  const unique = new Set(lessonProgress);
  return flattenLessons(course).every((l) =>
    unique.has(lessonKey(l.moduleId, l.lessonId))
  );
}

export function getExamQuestionIds(attempt: TrainingAttempt): number[] {
  if (!attempt.examQuestionIdsJson) return [];
  try {
    return JSON.parse(attempt.examQuestionIdsJson) as number[];
  } catch {
    return [];
  }
}

export async function setExamQuestionIds(
  attemptId: number,
  ids: number[]
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();
  await sql`
    UPDATE training_attempts
    SET exam_question_ids_json = ${JSON.stringify(ids)}::jsonb
    WHERE id = ${attemptId}
  `;
}

export async function assertUserCourseAccess(
  userId: number,
  companyId: number,
  courseId: string
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT 1 FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    LEFT JOIN company_course_provisions p ON p.course_id = c.id AND p.company_id = c.company_id
    WHERE uca.user_id = ${userId}
      AND uca.course_id = ${courseId}
      AND c.company_id = ${companyId}
      AND c.active = TRUE
      AND (p.status IS NULL OR p.status = 'active')
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw new Error("FORBIDDEN");
  }
}

export async function loadCourseForUser(
  companyId: number,
  courseId: string
): Promise<CourseData> {
  return getCourseForContext(companyId, courseId);
}

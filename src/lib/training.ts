import { ensureSeeded, getSql } from "./db";
import { mapTrainingAttempt } from "./db/row-mappers";
import { getCourse } from "./course";
import {
  flattenLessons,
  inferLessonProgressFromModules,
  lessonKey,
  totalLessonCount,
} from "./course-nav";
import type { TrainingAttempt } from "./types";

export type { TrainingAttempt };

export async function getActiveAttempt(
  userId: number
): Promise<TrainingAttempt | undefined> {
  const course = getCourse();
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM training_attempts
    WHERE user_id = ${userId} AND course_id = ${course.courseId} AND completed_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `;
  return rows[0]
    ? mapTrainingAttempt(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function startAttempt(userId: number): Promise<TrainingAttempt> {
  const existing = await getActiveAttempt(userId);
  if (existing) return existing;

  const course = getCourse();
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO training_attempts (user_id, course_id, module_progress_json, lesson_progress_json)
    VALUES (${userId}, ${course.courseId}, '[]'::jsonb, '[]'::jsonb)
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

export function getEffectiveLessonProgress(attempt: TrainingAttempt): string[] {
  const course = getCourse();
  const lessonProgress = getLessonProgressRaw(attempt);
  if (lessonProgress.length > 0) return lessonProgress;

  const moduleProgress = getModuleProgress(attempt);
  if (moduleProgress.length > 0) {
    return inferLessonProgressFromModules(course, moduleProgress);
  }
  return [];
}

export async function completeLesson(
  attemptId: number,
  moduleId: number,
  lessonId: number
): Promise<{ lessonProgress: string[]; moduleProgress: number[] }> {
  const course = getCourse();
  await ensureSeeded();
  const sql = getSql();

  const rows = await sql`
    SELECT * FROM training_attempts WHERE id = ${attemptId} LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error("Attempt not found");
  }

  const attempt = mapTrainingAttempt(rows[0] as Record<string, unknown>);
  const progress = getEffectiveLessonProgress(attempt);
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
  attemptId: number,
  moduleId: number
): Promise<number[]> {
  const course = getCourse();
  const mod = course.modules.find((m) => m.id === moduleId);
  if (mod) {
    for (const lesson of mod.lessons) {
      await completeLesson(attemptId, moduleId, lesson.id);
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

export function allModulesComplete(progress: number[]): boolean {
  const course = getCourse();
  return course.modules.every((m) => progress.includes(m.id));
}

export function allLessonsComplete(lessonProgress: string[]): boolean {
  const course = getCourse();
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

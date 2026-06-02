import { getSql } from "./db";
import type { CourseData } from "./types";

export type ContentType = "module" | "lesson" | "question";

export interface ContentOverride {
  contentType: ContentType;
  contentId: number;
  parentModuleId: number | null;
  isActive: boolean;
  controlledBy: string;
}

function lessonKey(moduleId: number, lessonId: number): string {
  return `l:${moduleId}:${lessonId}`;
}

function moduleKey(moduleId: number): string {
  return `m:${moduleId}`;
}

function questionKey(questionId: number): string {
  return `q:${questionId}`;
}

export async function listContentOverrides(
  companyId: number,
  courseId: string
): Promise<ContentOverride[]> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT content_type, content_id, parent_module_id, is_active, controlled_by
      FROM company_content_provisions
      WHERE company_id = ${companyId} AND course_id = ${courseId}
    `;
    return rows.map((r) => ({
      contentType: r.content_type as ContentType,
      contentId: Number(r.content_id),
      parentModuleId:
        Number(r.parent_module_id) >= 0 ? Number(r.parent_module_id) : null,
      isActive: Boolean(r.is_active),
      controlledBy: String(r.controlled_by),
    }));
  } catch {
    return [];
  }
}

/** Default aktiv; nur gespeicherte Superuser-Deaktivierungen schalten aus. */
export async function getInactiveContentKeys(
  companyId: number,
  courseId: string
): Promise<Set<string>> {
  const overrides = await listContentOverrides(companyId, courseId);
  const inactive = new Set<string>();
  for (const o of overrides) {
    if (o.controlledBy === "superuser" && !o.isActive) {
      if (o.contentType === "module") inactive.add(moduleKey(o.contentId));
      else if (o.contentType === "lesson" && o.parentModuleId != null) {
        inactive.add(lessonKey(o.parentModuleId, o.contentId));
      } else if (o.contentType === "question") inactive.add(questionKey(o.contentId));
    }
  }
  return inactive;
}

export function filterCourseByInactiveKeys(
  course: CourseData,
  inactive: Set<string>
): CourseData {
  if (inactive.size === 0) return course;

  const modules = course.modules
    .filter((m) => !inactive.has(moduleKey(m.id)))
    .map((m) => ({
      ...m,
      lessons: m.lessons.filter((l) => !inactive.has(lessonKey(m.id, l.id))),
    }));

  const exam = course.exam.filter((q) => !inactive.has(questionKey(q.id)));

  return { ...course, modules, exam };
}

export async function filterCourseForCompany(
  companyId: number,
  course: CourseData
): Promise<CourseData> {
  const inactive = await getInactiveContentKeys(companyId, course.courseId);
  return filterCourseByInactiveKeys(course, inactive);
}

export async function setContentActive(
  companyId: number,
  courseId: string,
  input: {
    contentType: ContentType;
    contentId: number;
    parentModuleId?: number | null;
    isActive: boolean;
  }
): Promise<void> {
  const sql = getSql();
  const parentModuleId = input.parentModuleId ?? -1;

  if (input.isActive) {
    await sql`
      DELETE FROM company_content_provisions
      WHERE company_id = ${companyId}
        AND course_id = ${courseId}
        AND content_type = ${input.contentType}
        AND content_id = ${input.contentId}
        AND parent_module_id = ${parentModuleId}
    `;
    return;
  }

  await sql`
    INSERT INTO company_content_provisions (
      company_id, course_id, content_type, content_id, parent_module_id,
      is_active, controlled_by, updated_at
    )
    VALUES (
      ${companyId}, ${courseId}, ${input.contentType}, ${input.contentId},
      ${parentModuleId}, FALSE, 'superuser', NOW()
    )
    ON CONFLICT (company_id, course_id, content_type, content_id, parent_module_id)
    DO UPDATE SET
      is_active = FALSE,
      controlled_by = 'superuser',
      updated_at = NOW()
  `;
}

/** Karte aller Inhalte mit effektivem Aktiv-Status für Superuser-UI */
export async function buildContentStateMap(
  companyId: number,
  courseId: string,
  course: CourseData
): Promise<{
  modules: Record<string, boolean>;
  lessons: Record<string, boolean>;
  questions: Record<string, boolean>;
}> {
  const inactive = await getInactiveContentKeys(companyId, courseId);
  const modules: Record<string, boolean> = {};
  const lessons: Record<string, boolean> = {};
  const questions: Record<string, boolean> = {};

  for (const m of course.modules) {
    modules[String(m.id)] = !inactive.has(moduleKey(m.id));
    for (const l of m.lessons) {
      lessons[`${m.id}:${l.id}`] = !inactive.has(lessonKey(m.id, l.id));
    }
  }
  for (const q of course.exam) {
    questions[String(q.id)] = !inactive.has(questionKey(q.id));
  }

  return { modules, lessons, questions };
}

export function isModuleActiveForCompany(
  inactive: Set<string>,
  moduleId: number
): boolean {
  return !inactive.has(moduleKey(moduleId));
}

export function isLessonActiveForCompany(
  inactive: Set<string>,
  moduleId: number,
  lessonId: number
): boolean {
  if (inactive.has(moduleKey(moduleId))) return false;
  return !inactive.has(lessonKey(moduleId, lessonId));
}

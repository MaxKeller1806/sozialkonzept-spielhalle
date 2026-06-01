import { migrateCourse } from "./course-migrate";
import { ensureSeeded, getSql } from "./db";
import type { CourseData, CourseMeta, CourseModule, ExamQuestion, Lesson } from "./types";

function normalize(course: CourseData): CourseData {
  const migrated = migrateCourse(
    course as CourseData & { modules: (CourseModule & { content?: string })[] }
  );
  const durationMinutes = migrated.modules.reduce((s, m) => s + (m.duration || 0), 0);
  const examPerTest = migrated.examQuestionsPerTest ?? 15;
  const poolSize = migrated.exam.length;
  const minCorrectAnswers = Math.ceil(
    (examPerTest * (migrated.passingScore ?? 80)) / 100
  );

  return {
    ...migrated,
    durationMinutes,
    totalQuestions: examPerTest,
    examQuestionsPerTest: examPerTest,
    minCorrectAnswers,
    examPoolSize: poolSize,
  } as CourseData & { examPoolSize?: number };
}

function emptyCourseTemplate(
  courseId: string,
  title: string,
  slug: string
): CourseData {
  return normalize({
    courseId,
    courseName: title,
    version: "1.0",
    durationMinutes: 0,
    maxDurationMinutes: 60,
    recommendedMinutes: "—",
    passingScore: 80,
    minCorrectAnswers: 12,
    totalQuestions: 15,
    certificateValidityMonths: 24,
    certificateTitle: `Zertifikat ${title}`,
    examQuestionsPerTest: 15,
    modules: [],
    exam: [],
  });
}

function mapCourseMeta(row: Record<string, unknown>): CourseMeta {
  return {
    id: String(row.id),
    companyId: Number(row.company_id),
    slug: String(row.slug ?? ""),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    version: String(row.version),
    passingScore: Number(row.passing_score),
    validityMonths: Number(row.validity_months),
    active: Boolean(row.active),
    createdAt: new Date(String(row.created_at ?? row.id)).toISOString(),
  };
}

function rowToCourseData(row: Record<string, unknown>): CourseData {
  const meta = mapCourseMeta(row);
  const content = row.content_json as CourseData | null;
  if (content?.modules) {
    return normalize({
      ...content,
      courseId: meta.id,
      courseName: meta.title,
      version: meta.version,
      passingScore: meta.passingScore,
      certificateValidityMonths: meta.validityMonths,
    });
  }
  return emptyCourseTemplate(meta.id, meta.title, meta.slug);
}

export async function listCompanyCourses(companyId: number): Promise<CourseMeta[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM courses
    WHERE company_id = ${companyId}
    ORDER BY created_at ASC, title ASC
  `;
  return rows.map((r) => mapCourseMeta(r as Record<string, unknown>));
}

export async function getCourseMeta(
  companyId: number,
  courseId: string
): Promise<CourseMeta | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM courses
    WHERE id = ${courseId} AND company_id = ${companyId}
    LIMIT 1
  `;
  return rows[0] ? mapCourseMeta(rows[0] as Record<string, unknown>) : undefined;
}

export async function getCourseData(
  companyId: number,
  courseId: string
): Promise<CourseData | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM courses
    WHERE id = ${courseId} AND company_id = ${companyId}
    LIMIT 1
  `;
  return rows[0] ? rowToCourseData(rows[0] as Record<string, unknown>) : undefined;
}

export async function saveCourseData(
  companyId: number,
  course: CourseData
): Promise<CourseData> {
  const normalized = normalize(course);
  await ensureSeeded();
  const sql = getSql();
  await sql`
    UPDATE courses SET
      title = ${normalized.courseName},
      version = ${normalized.version},
      passing_score = ${normalized.passingScore},
      validity_months = ${normalized.certificateValidityMonths},
      content_json = ${JSON.stringify(normalized)}::jsonb
    WHERE id = ${normalized.courseId} AND company_id = ${companyId}
  `;
  return normalized;
}

export async function createCompanyCourse(
  companyId: number,
  input: { title: string; slug: string; description?: string; withTemplate?: boolean }
): Promise<CourseMeta> {
  await ensureSeeded();
  const sql = getSql();
  const courseId = `${companyId}-${input.slug}`;
  const template = emptyCourseTemplate(courseId, input.title, input.slug);

  const rows = await sql`
    INSERT INTO courses (
      id, company_id, slug, title, description, version,
      passing_score, validity_months, content_json, active
    )
    VALUES (
      ${courseId}, ${companyId}, ${input.slug}, ${input.title},
      ${input.description ?? null}, ${template.version},
      ${template.passingScore}, ${template.certificateValidityMonths},
      ${JSON.stringify(input.withTemplate !== false ? template : { ...template, modules: [], exam: [] })}::jsonb,
      TRUE
    )
    RETURNING *
  `;
  return mapCourseMeta(rows[0] as Record<string, unknown>);
}

export async function updateCourseSettings(
  companyId: number,
  courseId: string,
  settings: { passingScore?: number }
): Promise<CourseData> {
  const course = await getCourseData(companyId, courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  if (settings.passingScore !== undefined) {
    course.passingScore = Math.min(100, Math.max(50, Math.round(settings.passingScore)));
  }
  return saveCourseData(companyId, course);
}

export async function getModule(
  companyId: number,
  courseId: string,
  id: number
): Promise<CourseModule | undefined> {
  const course = await getCourseData(companyId, courseId);
  return course?.modules.find((m) => m.id === id);
}

export async function saveModule(
  companyId: number,
  courseId: string,
  module: CourseModule
): Promise<CourseModule> {
  const course = await getCourseData(companyId, courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  const idx = course.modules.findIndex((m) => m.id === module.id);
  if (idx >= 0) course.modules[idx] = module;
  else {
    course.modules.push(module);
    course.modules.sort((a, b) => a.id - b.id);
  }
  await saveCourseData(companyId, course);
  return module;
}

export async function deleteModule(
  companyId: number,
  courseId: string,
  id: number
): Promise<boolean> {
  const course = await getCourseData(companyId, courseId);
  if (!course) return false;
  const before = course.modules.length;
  course.modules = course.modules.filter((m) => m.id !== id);
  if (course.modules.length === before) return false;
  await saveCourseData(companyId, course);
  return true;
}

export async function nextModuleId(
  companyId: number,
  courseId: string
): Promise<number> {
  const course = await getCourseData(companyId, courseId);
  const ids = course?.modules.map((m) => m.id) ?? [];
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export async function getLesson(
  companyId: number,
  courseId: string,
  moduleId: number,
  lessonId: number
): Promise<Lesson | undefined> {
  const mod = await getModule(companyId, courseId, moduleId);
  return mod?.lessons.find((l) => l.id === lessonId);
}

export async function nextLessonId(
  companyId: number,
  courseId: string,
  moduleId: number
): Promise<number> {
  const mod = await getModule(companyId, courseId, moduleId);
  if (!mod?.lessons.length) return 1;
  return Math.max(...mod.lessons.map((l) => l.id)) + 1;
}

export async function saveLesson(
  companyId: number,
  courseId: string,
  moduleId: number,
  lesson: Lesson
): Promise<Lesson> {
  const course = await getCourseData(companyId, courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  const modIdx = course.modules.findIndex((m) => m.id === moduleId);
  if (modIdx < 0) throw new Error("MODULE_NOT_FOUND");
  const mod = course.modules[modIdx];
  const lessonIdx = mod.lessons.findIndex((l) => l.id === lesson.id);
  if (lessonIdx >= 0) mod.lessons[lessonIdx] = lesson;
  else {
    mod.lessons.push(lesson);
    mod.lessons.sort((a, b) => a.id - b.id);
  }
  await saveCourseData(companyId, course);
  return lesson;
}

export async function deleteLesson(
  companyId: number,
  courseId: string,
  moduleId: number,
  lessonId: number
): Promise<boolean> {
  const course = await getCourseData(companyId, courseId);
  if (!course) return false;
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) return false;
  const before = mod.lessons.length;
  mod.lessons = mod.lessons.filter((l) => l.id !== lessonId);
  if (mod.lessons.length === before) return false;
  await saveCourseData(companyId, course);
  return true;
}

export async function getExamQuestion(
  companyId: number,
  courseId: string,
  id: number
): Promise<ExamQuestion | undefined> {
  const course = await getCourseData(companyId, courseId);
  return course?.exam.find((q) => q.id === id);
}

export async function saveExamQuestion(
  companyId: number,
  courseId: string,
  question: ExamQuestion
): Promise<ExamQuestion> {
  const course = await getCourseData(companyId, courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  const idx = course.exam.findIndex((q) => q.id === question.id);
  if (idx >= 0) course.exam[idx] = question;
  else {
    course.exam.push(question);
    course.exam.sort((a, b) => a.id - b.id);
  }
  await saveCourseData(companyId, course);
  return question;
}

export async function deleteExamQuestion(
  companyId: number,
  courseId: string,
  id: number
): Promise<boolean> {
  const course = await getCourseData(companyId, courseId);
  if (!course) return false;
  const before = course.exam.length;
  course.exam = course.exam.filter((q) => q.id !== id);
  if (course.exam.length === before) return false;
  await saveCourseData(companyId, course);
  return true;
}

export async function nextExamId(
  companyId: number,
  courseId: string
): Promise<number> {
  const course = await getCourseData(companyId, courseId);
  const ids = course?.exam.map((q) => q.id) ?? [];
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export async function getUserAssignedCourses(
  userId: number,
  companyId: number
): Promise<CourseMeta[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT c.*
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    WHERE uca.user_id = ${userId}
      AND c.company_id = ${companyId}
      AND c.active = TRUE
    ORDER BY c.title ASC
  `;
  return rows.map((r) => mapCourseMeta(r as Record<string, unknown>));
}

export async function assignUserToCourse(
  userId: number,
  courseId: string
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();
  await sql`
    INSERT INTO user_course_assignments (user_id, course_id)
    VALUES (${userId}, ${courseId})
    ON CONFLICT DO NOTHING
  `;
}

export async function setUserCourseAssignments(
  userId: number,
  companyId: number,
  courseIds: string[]
): Promise<void> {
  if (courseIds.length > 0) {
    const sql = getSql();
    const rows = await sql`
      SELECT id FROM courses
      WHERE company_id = ${companyId} AND id = ANY(${courseIds})
    `;
    if (rows.length !== courseIds.length) {
      throw new Error("FORBIDDEN");
    }
  }
  const sql = getSql();
  await sql`DELETE FROM user_course_assignments WHERE user_id = ${userId}`;
  for (const courseId of courseIds) {
    await sql`
      INSERT INTO user_course_assignments (user_id, course_id)
      VALUES (${userId}, ${courseId})
      ON CONFLICT DO NOTHING
    `;
  }
}

export async function importCourseFromJson(
  companyId: number,
  course: CourseData,
  slug: string
): Promise<void> {
  const courseId = course.courseId.includes(String(companyId))
    ? course.courseId
    : `${companyId}-${slug}`;
  const normalized = normalize({ ...course, courseId });

  await ensureSeeded();
  const sql = getSql();
  await sql`
    INSERT INTO courses (
      id, company_id, slug, title, description, version,
      passing_score, validity_months, content_json, active
    )
    VALUES (
      ${courseId}, ${companyId}, ${slug}, ${normalized.courseName}, NULL,
      ${normalized.version}, ${normalized.passingScore},
      ${normalized.certificateValidityMonths},
      ${JSON.stringify(normalized)}::jsonb, TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      version = EXCLUDED.version,
      passing_score = EXCLUDED.passing_score,
      validity_months = EXCLUDED.validity_months,
      content_json = EXCLUDED.content_json,
      company_id = EXCLUDED.company_id,
      slug = EXCLUDED.slug
  `;
}

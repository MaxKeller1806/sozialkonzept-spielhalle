import { parseContentJson } from "./content-json";
import { migrateCourse } from "./course-migrate";
import {
  normalizeValidityType,
  normalizeIntervalUnit,
  parseValidityRuleFromRow,
  type ValidityIntervalUnit,
  type ValidityType,
} from "./course-validity";
import { parseInstructionMetaFromRow } from "./course-instruction-meta";
import type { CourseListFilters } from "./course-hierarchy";
import { ensureSeeded, getSql, isMissingDbObject } from "./db";
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
  const rule = parseValidityRuleFromRow(row);
  return {
    id: String(row.id),
    companyId: Number(row.company_id),
    slug: String(row.slug ?? ""),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    version: String(row.version),
    passingScore: Number(row.passing_score),
    validityMonths: Number(row.validity_months),
    validityType: rule.validityType,
    validityIntervalValue: rule.validityIntervalValue ?? null,
    validityIntervalUnit: rule.validityIntervalUnit ?? null,
    active: Boolean(row.active),
    masterCourseId: row.master_course_id != null ? String(row.master_course_id) : null,
    createdAt: new Date(String(row.created_at ?? row.id)).toISOString(),
    updatedAt: new Date(
      String(row.updated_at ?? row.created_at ?? row.id)
    ).toISOString(),
    estimatedDurationMinutes:
      row.estimated_duration_minutes != null
        ? Number(row.estimated_duration_minutes)
        : null,
    topicId: row.topic_id != null ? Number(row.topic_id) : null,
    topicName: row.topic_name != null ? String(row.topic_name) : null,
    topicSortOrder:
      row.topic_sort_order != null ? Number(row.topic_sort_order) : undefined,
    topicIds: [],
    topics: [],
    ...parseInstructionMetaFromRow(row),
  };
}

function sortCourseRowsByHierarchy(rows: Record<string, unknown>[]) {
  return [...rows].sort((a, b) => {
    const mainA = String(a.main_category ?? a.category ?? "");
    const mainB = String(b.main_category ?? b.category ?? "");
    if (!mainA && mainB) return -1;
    if (mainA && !mainB) return 1;
    if (mainA !== mainB) return mainA.localeCompare(mainB, "de");
    const semA = String(a.seminar ?? "");
    const semB = String(b.seminar ?? "");
    if (semA !== semB) return semA.localeCompare(semB, "de");
    const orderA = Number(a.sort_order ?? 0);
    const orderB = Number(b.sort_order ?? 0);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.title).localeCompare(String(b.title), "de");
  });
}

function sortCourseRows(rows: Record<string, unknown>[], filters: CourseListFilters) {
  const dir = filters.sortDir === "desc" ? -1 : 1;
  const sort = filters.sort ?? "name";
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "code":
        cmp = String(a.instruction_code ?? "").localeCompare(
          String(b.instruction_code ?? ""),
          "de"
        );
        break;
      case "createdAt":
        cmp =
          new Date(String(a.created_at)).getTime() -
          new Date(String(b.created_at)).getTime();
        break;
      case "updatedAt":
        cmp =
          new Date(String(a.updated_at ?? a.created_at)).getTime() -
          new Date(String(b.updated_at ?? b.created_at)).getTime();
        break;
      case "validity": {
        const ruleA = parseValidityRuleFromRow(a);
        const ruleB = parseValidityRuleFromRow(b);
        cmp = ruleA.validityType.localeCompare(ruleB.validityType, "de");
        if (cmp === 0) {
          cmp =
            (ruleA.validityMonths ?? 0) - (ruleB.validityMonths ?? 0);
        }
        break;
      }
      case "name":
      default:
        cmp = String(a.title).localeCompare(String(b.title), "de");
    }
    return cmp * dir;
  });
}

function applyCourseFilters(
  rows: Record<string, unknown>[],
  filters?: CourseListFilters
): Record<string, unknown>[] {
  if (!filters) return rows;
  return rows.filter((row) => {
    const meta = parseInstructionMetaFromRow(row);
    const rule = parseValidityRuleFromRow(row);
    if (
      filters.mainCategory &&
      meta.mainCategory !== filters.mainCategory
    ) {
      return false;
    }
    if (filters.seminar && meta.seminar !== filters.seminar) return false;
    if (
      filters.topicId != null &&
      (row.topic_id == null || Number(row.topic_id) !== filters.topicId)
    ) {
      // Legacy-Fallback – genauer Filter nach enrichCoursesWithTopics
      return false;
    }
    if (filters.validityType && rule.validityType !== filters.validityType) {
      return false;
    }
    if (filters.active !== undefined && Boolean(row.active) !== filters.active) {
      return false;
    }
    if (
      filters.requiresCertificate !== undefined &&
      meta.requiresCertificate !== filters.requiresCertificate
    ) {
      return false;
    }
    if (
      filters.requiresProof !== undefined &&
      meta.requiresProof !== filters.requiresProof
    ) {
      return false;
    }
    return true;
  });
}

function rowToCourseData(row: Record<string, unknown>): CourseData {
  const meta = mapCourseMeta(row);
  const content = parseContentJson(row.content_json);
  if (content && Array.isArray(content.modules)) {
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

async function loadCompanyCourseRows(
  companyId: number,
  filter: "active" | "archived" | "all"
): Promise<Record<string, unknown>[]> {
  const sql = getSql();
  const activeFilter =
    filter === "active"
      ? sql`AND c.active = TRUE`
      : filter === "archived"
        ? sql`AND c.active = FALSE`
        : sql``;
  try {
    const rows = await sql`
      SELECT
        c.*,
        ct.name AS topic_name,
        ct.sort_order AS topic_sort_order
      FROM courses c
      LEFT JOIN course_topics ct ON ct.id = c.topic_id
      WHERE c.company_id = ${companyId}
      ${activeFilter}
    `;
    return rows as Record<string, unknown>[];
  } catch (err) {
    if (
      isMissingDbObject(err, "topic_id") ||
      isMissingDbObject(err, "course_topics")
    ) {
      const rows = await sql`
        SELECT c.*
        FROM courses c
        WHERE c.company_id = ${companyId}
        ${activeFilter}
      `;
      return rows as Record<string, unknown>[];
    }
    throw err;
  }
}

export async function listCompanyCourses(
  companyId: number,
  filter: "active" | "archived" | "all" = "all",
  hierarchyFilters?: CourseListFilters
): Promise<CourseMeta[]> {
  await ensureSeeded();
  const rows = await loadCompanyCourseRows(companyId, filter);
  let filtered = applyCourseFilters(
    rows as Record<string, unknown>[],
    hierarchyFilters
  );
  filtered = hierarchyFilters?.sort
    ? sortCourseRows(filtered, hierarchyFilters)
    : sortCourseRowsByHierarchy(filtered);
  let mapped = filtered.map((r) => mapCourseMeta(r));
  const { enrichCoursesWithTopics } = await import("./course-topics");
  mapped = await enrichCoursesWithTopics(mapped);
  if (hierarchyFilters?.topicId != null) {
    mapped = mapped.filter((c) => c.topicIds.includes(hierarchyFilters.topicId!));
  }
  return mapped;
}

/** Kurs mit den meisten Lerninhalten (gleiche Quelle wie Mitarbeiter-Schulung). */
export async function resolveDefaultCompanyCourseId(
  companyId: number
): Promise<string | null> {
  const courses = await listCompanyCourses(companyId);
  if (courses.length === 0) return null;
  if (courses.length === 1) return courses[0].id;

  const sql = getSql();
  let bestId = courses[0].id;
  let bestScore = -1;

  for (const meta of courses) {
    const data = await getCourseData(companyId, meta.id);
    const moduleCount = data?.modules?.length ?? 0;
    const lessonCount =
      data?.modules?.reduce((s, m) => s + (m.lessons?.length ?? 0), 0) ?? 0;
    const assignRows = await sql`
      SELECT COUNT(*)::int AS n
      FROM user_course_assignments
      WHERE course_id = ${meta.id}
    `;
    const assignCount = Number(assignRows[0]?.n ?? 0);
    const score = moduleCount * 10000 + lessonCount * 100 + assignCount;
    if (score > bestScore) {
      bestScore = score;
      bestId = meta.id;
    }
  }

  return bestId;
}

export async function getCourseMeta(
  companyId: number,
  courseId: string
): Promise<CourseMeta | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT
      c.*,
      ct.name AS topic_name,
      ct.sort_order AS topic_sort_order
    FROM courses c
    LEFT JOIN course_topics ct ON ct.id = c.topic_id
    WHERE c.id = ${courseId} AND c.company_id = ${companyId}
    LIMIT 1
  `;
  return rows[0] ? mapCourseMeta(rows[0] as Record<string, unknown>) : undefined;
}

export async function getCourseMetaWithTopics(
  companyId: number,
  courseId: string
): Promise<CourseMeta | undefined> {
  const meta = await getCourseMeta(companyId, courseId);
  if (!meta) return undefined;
  const { enrichCoursesWithTopics } = await import("./course-topics");
  const [enriched] = await enrichCoursesWithTopics([meta]);
  return enriched;
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
  const rows = await sql`
    UPDATE courses SET
      title = ${normalized.courseName},
      version = ${normalized.version},
      passing_score = ${normalized.passingScore},
      validity_months = ${normalized.certificateValidityMonths},
      content_json = ${JSON.stringify(normalized)}::jsonb,
      updated_at = NOW()
    WHERE id = ${normalized.courseId} AND company_id = ${companyId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error("NOT_FOUND");
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
  const { ensureProvisionForCourse } = await import("./course-provisions");
  await ensureProvisionForCourse(companyId, courseId);
  return mapCourseMeta(rows[0] as Record<string, unknown>);
}

export async function updateCourseSettings(
  companyId: number,
  courseId: string,
  settings: {
    passingScore?: number;
    validityType?: ValidityType;
    validityIntervalValue?: number | null;
    validityIntervalUnit?: ValidityIntervalUnit | null;
  }
): Promise<CourseData> {
  const course = await getCourseData(companyId, courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  if (settings.passingScore !== undefined) {
    course.passingScore = Math.min(100, Math.max(50, Math.round(settings.passingScore)));
  }
  const meta = await getCourseMeta(companyId, courseId);
  if (!meta) throw new Error("COURSE_NOT_FOUND");

  const validityType = settings.validityType ?? meta.validityType;
  let intervalValue = settings.validityIntervalValue ?? meta.validityIntervalValue;
  let intervalUnit = settings.validityIntervalUnit ?? meta.validityIntervalUnit;

  if (validityType === "custom") {
    if (!intervalValue || intervalValue <= 0) intervalValue = meta.validityMonths || 12;
    if (!intervalUnit) intervalUnit = "months";
  } else {
    intervalValue = null;
    intervalUnit = null;
  }

  await ensureSeeded();
  const sql = getSql();
  const validityMonths =
    validityType === "half_yearly"
      ? 6
      : validityType === "yearly"
        ? 12
        : validityType === "custom"
          ? intervalUnit === "years"
            ? (intervalValue ?? 12) * 12
            : intervalUnit === "days"
              ? Math.max(1, Math.ceil((intervalValue ?? 365) / 30))
              : (intervalValue ?? meta.validityMonths)
          : meta.validityMonths;

  try {
    await sql`
      UPDATE courses SET
        passing_score = ${course.passingScore},
        validity_type = ${validityType},
        validity_interval_value = ${intervalValue},
        validity_interval_unit = ${intervalUnit},
        validity_months = ${validityMonths}
      WHERE id = ${courseId} AND company_id = ${companyId}
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("validity_type") || msg.includes("validity_interval")) {
      await sql`
        UPDATE courses SET passing_score = ${course.passingScore}, validity_months = ${validityMonths}
        WHERE id = ${courseId} AND company_id = ${companyId}
      `;
    } else {
      throw e;
    }
  }

  course.certificateValidityMonths = validityMonths;
  return saveCourseData(companyId, course);
}

export async function setCompanyCourseActive(
  companyId: number,
  courseId: string,
  active: boolean
): Promise<boolean> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    UPDATE courses SET active = ${active}
    WHERE id = ${courseId} AND company_id = ${companyId}
    RETURNING id
  `;
  if (rows.length === 0) return false;

  const { updateProvision } = await import("./course-provisions");
  const provision = await updateProvision(companyId, courseId, {
    status: active ? "active" : "disabled",
  });
  return provision != null;
}

/** Löscht Firmenkurs transaktional inkl. abhängiger Nachweisdaten. */
export async function permanentlyDeleteCompanyCourse(
  companyId: number,
  courseId: string
): Promise<void> {
  await ensureSeeded();
  const sql = getSql();
  await sql.begin(async (tx) => {
    const owned = await tx`
      SELECT id FROM courses WHERE id = ${courseId} AND company_id = ${companyId}
    `;
    if (owned.length === 0) throw new Error("NOT_FOUND");

    await tx`DELETE FROM certificates WHERE course_id = ${courseId}`;
    await tx`DELETE FROM training_attempts WHERE course_id = ${courseId}`;
    await tx`DELETE FROM user_course_assignments WHERE course_id = ${courseId}`;
    await tx`DELETE FROM employee_category_course_assignments WHERE course_id = ${courseId}`;
    await tx`DELETE FROM company_content_provisions WHERE course_id = ${courseId}`;
    await tx`DELETE FROM company_course_provisions WHERE course_id = ${courseId} AND company_id = ${companyId}`;
    const rows = await tx`
      DELETE FROM courses WHERE id = ${courseId} AND company_id = ${companyId}
      RETURNING id
    `;
    if (rows.length === 0) throw new Error("NOT_FOUND");
  });
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
    SELECT
      c.*,
      ct.name AS topic_name,
      ct.sort_order AS topic_sort_order
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    LEFT JOIN course_topics ct ON ct.id = c.topic_id
    LEFT JOIN company_course_provisions p ON p.course_id = c.id AND p.company_id = c.company_id
    WHERE uca.user_id = ${userId}
      AND c.company_id = ${companyId}
      AND c.active = TRUE
      AND (p.status IS NULL OR p.status = 'active')
  `;
  const sorted = sortCourseRowsByHierarchy(rows as Record<string, unknown>[]);
  let mapped = sorted.map((r) => mapCourseMeta(r));
  const { enrichCoursesWithTopics } = await import("./course-topics");
  return enrichCoursesWithTopics(mapped);
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

/** Prüft, ob Kurse der Firma zugeordnet, aktiv und freigegeben sind. */
export async function validateAssignableCourseIds(
  companyId: number,
  courseIds: string[]
): Promise<void> {
  if (courseIds.length === 0) return;
  await ensureSeeded();
  const sql = getSql();
  const uniqueIds = [...new Set(courseIds)];
  const rows = await sql`
    SELECT c.id FROM courses c
    LEFT JOIN company_course_provisions p
      ON p.course_id = c.id AND p.company_id = c.company_id
    WHERE c.company_id = ${companyId}
      AND c.id IN ${sql(uniqueIds)}
      AND c.active = TRUE
      AND (p.status IS NULL OR p.status = 'active')
  `;
  if (rows.length !== uniqueIds.length) {
    throw new Error("FORBIDDEN");
  }
}

export async function getUserAssignedCourseIds(
  userId: number,
  companyId: number
): Promise<string[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT uca.course_id
    FROM user_course_assignments uca
    JOIN courses c ON c.id = uca.course_id
    WHERE uca.user_id = ${userId} AND c.company_id = ${companyId}
    ORDER BY uca.course_id
  `;
  return rows.map((r) => String(r.course_id));
}

export async function setUserCourseAssignments(
  userId: number,
  companyId: number,
  courseIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(courseIds.map(String))];
  await validateAssignableCourseIds(companyId, uniqueIds);
  const sql = getSql();
  await sql`DELETE FROM user_course_assignments WHERE user_id = ${userId}`;
  for (const courseId of uniqueIds) {
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

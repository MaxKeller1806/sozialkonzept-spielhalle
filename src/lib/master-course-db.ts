import { migrateCourse } from "./course-migrate";
import { getSql } from "./db";
import type {
  CourseData,
  CourseModule,
  ExamQuestion,
  Lesson,
  MasterCourseMeta,
  MasterCourseStatus,
} from "./types";

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

function emptyTemplate(id: string, title: string): CourseData {
  return normalize({
    courseId: id,
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

function mapListItem(row: Record<string, unknown>): MasterCourseListItem {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    status: row.status as MasterCourseStatus,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

function mapMeta(row: Record<string, unknown>): MasterCourseMeta {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    version: String(row.version),
    passingScore: Number(row.passing_score),
    validityMonths: Number(row.validity_months),
    status: row.status as MasterCourseStatus,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

function parseContentJson(raw: unknown): CourseData | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as CourseData;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as CourseData;
  return null;
}

function rowToData(row: Record<string, unknown>): CourseData {
  const meta = mapMeta(row);
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
  return emptyTemplate(meta.id, meta.title);
}

export type MasterCourseListItem = {
  id: string;
  title: string;
  description: string | null;
  status: MasterCourseStatus;
  createdAt: string;
  updatedAt: string;
};

/** Übersichtsliste – ohne content_json, Module oder Prüfungsfragen. */
export async function listMasterCoursesMetadata(): Promise<MasterCourseListItem[]> {
  const sql = getSql();
  try {
    const countRows = await sql`
      SELECT COUNT(*)::int AS n FROM master_courses
    `;
    if (Number(countRows[0]?.n ?? 0) === 0) {
      return [];
    }

    const rows = await sql`
      SELECT id, title, description, status, created_at, updated_at
      FROM master_courses
      ORDER BY created_at DESC, title ASC
    `;
    return rows.map((r) => mapListItem(r as Record<string, unknown>));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") && msg.includes("master_courses")) {
      return [];
    }
    throw e;
  }
}

export async function listMasterCourses(): Promise<MasterCourseListItem[]> {
  return listMasterCoursesMetadata();
}

export type MasterCourseOverview = {
  id: string;
  title: string;
  status: string;
};

/** Nur Felder für Dropdowns – minimaler Payload. */
export async function listMasterCoursesOverview(): Promise<MasterCourseOverview[]> {
  const sql = getSql();
  try {
    const countRows = await sql`
      SELECT COUNT(*)::int AS n FROM master_courses
    `;
    if (Number(countRows[0]?.n ?? 0) === 0) {
      return [];
    }

    const rows = await sql`
      SELECT id, title, status
      FROM master_courses
      ORDER BY title ASC
    `;
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      status: String(r.status),
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") && msg.includes("master_courses")) {
      return [];
    }
    throw e;
  }
}

export async function getMasterCourseMeta(
  id: string
): Promise<MasterCourseMeta | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      id, slug, title, description, version,
      passing_score, validity_months, status, created_at, updated_at
    FROM master_courses
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapMeta(rows[0] as Record<string, unknown>) : undefined;
}

export async function getMasterCourseData(
  id: string
): Promise<CourseData | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      id, slug, title, description, version,
      passing_score, validity_months, status, created_at, updated_at,
      content_json
    FROM master_courses
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? rowToData(rows[0] as Record<string, unknown>) : undefined;
}

export async function getMasterCourseDetail(
  id: string
): Promise<{ meta: MasterCourseMeta; course: CourseData } | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      id, slug, title, description, version,
      passing_score, validity_months, status, created_at, updated_at,
      content_json
    FROM master_courses
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return undefined;
  const row = rows[0] as Record<string, unknown>;
  return { meta: mapMeta(row), course: rowToData(row) };
}

export async function createMasterCourse(input: {
  title: string;
  slug: string;
  description?: string;
}): Promise<MasterCourseMeta> {
  const sql = getSql();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const id = `master-${slug}`;
  const template = emptyTemplate(id, input.title.trim());

  const rows = await sql`
    INSERT INTO master_courses (
      id, slug, title, description, version,
      passing_score, validity_months, content_json, status
    )
    VALUES (
      ${id}, ${slug}, ${input.title.trim()}, ${input.description ?? null},
      ${template.version}, ${template.passingScore},
      ${template.certificateValidityMonths},
      ${JSON.stringify(template)}::jsonb, 'draft'
    )
    RETURNING *
  `;
  return mapMeta(rows[0] as Record<string, unknown>);
}

export async function saveMasterCourseData(course: CourseData): Promise<CourseData> {
  const normalized = normalize(course);
  const sql = getSql();
  const rows = await sql`
    UPDATE master_courses SET
      title = ${normalized.courseName},
      version = ${normalized.version},
      passing_score = ${normalized.passingScore},
      validity_months = ${normalized.certificateValidityMonths},
      content_json = ${JSON.stringify(normalized)}::jsonb,
      updated_at = NOW()
    WHERE id = ${normalized.courseId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error("NOT_FOUND");
  return normalized;
}

export async function updateMasterCourseSettings(
  id: string,
  settings: {
    passingScore?: number;
    status?: MasterCourseStatus;
    title?: string;
    description?: string | null;
  }
): Promise<CourseData> {
  const course = await getMasterCourseData(id);
  if (!course) throw new Error("NOT_FOUND");
  if (settings.passingScore !== undefined) {
    course.passingScore = Math.min(100, Math.max(50, Math.round(settings.passingScore)));
  }
  if (settings.title) course.courseName = settings.title;

  const sql = getSql();
  const meta = await getMasterCourseMeta(id);
  if (!meta) throw new Error("NOT_FOUND");

  await sql`
    UPDATE master_courses SET
      status = ${settings.status ?? meta.status},
      title = ${settings.title ?? meta.title},
      description = ${settings.description !== undefined ? settings.description : meta.description},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  return saveMasterCourseData(course);
}

export async function deleteMasterCourse(id: string): Promise<boolean> {
  const sql = getSql();
  const prov = await sql`
    SELECT 1 FROM company_course_provisions WHERE master_course_id = ${id} LIMIT 1
  `;
  if (prov.length > 0) return false;
  const rows = await sql`DELETE FROM master_courses WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

async function load(id: string): Promise<CourseData> {
  const course = await getMasterCourseData(id);
  if (!course) throw new Error("NOT_FOUND");
  return course;
}

export async function getModule(id: string, moduleId: number): Promise<CourseModule | undefined> {
  const course = await load(id);
  return course.modules.find((m) => m.id === moduleId);
}

export async function saveModule(id: string, module: CourseModule): Promise<CourseModule> {
  const course = await load(id);
  const idx = course.modules.findIndex((m) => m.id === module.id);
  if (idx >= 0) course.modules[idx] = module;
  else {
    course.modules.push(module);
    course.modules.sort((a, b) => a.id - b.id);
  }
  await saveMasterCourseData(course);
  return module;
}

export async function deleteModule(id: string, moduleId: number): Promise<boolean> {
  const course = await load(id);
  const before = course.modules.length;
  course.modules = course.modules.filter((m) => m.id !== moduleId);
  if (course.modules.length === before) return false;
  await saveMasterCourseData(course);
  return true;
}

export async function nextModuleId(id: string): Promise<number> {
  const course = await load(id);
  const ids = course.modules.map((m) => m.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export async function getLesson(
  id: string,
  moduleId: number,
  lessonId: number
): Promise<Lesson | undefined> {
  const mod = await getModule(id, moduleId);
  return mod?.lessons.find((l) => l.id === lessonId);
}

export async function nextLessonId(id: string, moduleId: number): Promise<number> {
  const mod = await getModule(id, moduleId);
  if (!mod?.lessons.length) return 1;
  return Math.max(...mod.lessons.map((l) => l.id)) + 1;
}

export async function saveLesson(
  id: string,
  moduleId: number,
  lesson: Lesson
): Promise<Lesson> {
  const course = await load(id);
  const modIdx = course.modules.findIndex((m) => m.id === moduleId);
  if (modIdx < 0) throw new Error("MODULE_NOT_FOUND");
  const mod = course.modules[modIdx];
  const lessonIdx = mod.lessons.findIndex((l) => l.id === lesson.id);
  if (lessonIdx >= 0) mod.lessons[lessonIdx] = lesson;
  else {
    mod.lessons.push(lesson);
    mod.lessons.sort((a, b) => a.id - b.id);
  }
  await saveMasterCourseData(course);
  return lesson;
}

export async function deleteLesson(
  id: string,
  moduleId: number,
  lessonId: number
): Promise<boolean> {
  const course = await load(id);
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) return false;
  const before = mod.lessons.length;
  mod.lessons = mod.lessons.filter((l) => l.id !== lessonId);
  if (mod.lessons.length === before) return false;
  await saveMasterCourseData(course);
  return true;
}

export async function getExamQuestion(id: string, qid: number): Promise<ExamQuestion | undefined> {
  const course = await load(id);
  return course.exam.find((q) => q.id === qid);
}

export async function saveExamQuestion(id: string, question: ExamQuestion): Promise<ExamQuestion> {
  const course = await load(id);
  const idx = course.exam.findIndex((q) => q.id === question.id);
  if (idx >= 0) course.exam[idx] = question;
  else {
    course.exam.push(question);
    course.exam.sort((a, b) => a.id - b.id);
  }
  await saveMasterCourseData(course);
  return question;
}

export async function deleteExamQuestion(id: string, qid: number): Promise<boolean> {
  const course = await load(id);
  const before = course.exam.length;
  course.exam = course.exam.filter((q) => q.id !== qid);
  if (course.exam.length === before) return false;
  await saveMasterCourseData(course);
  return true;
}

export async function nextExamId(id: string): Promise<number> {
  const course = await load(id);
  const ids = course.exam.map((q) => q.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function masterContentAsCourseData(master: CourseData, companyId: number, slug: string): CourseData {
  const courseId = `${companyId}-${slug}`;
  return normalize({
    ...master,
    courseId,
    courseName: master.courseName,
  });
}

/** Bestehende Firmenkurse als Master übernehmen – nur per POST-Import, nicht beim GET. */
export async function importExistingCoursesAsMasters(): Promise<number> {
  const sql = getSql();
  const slugRows = await sql`
    SELECT DISTINCT COALESCE(NULLIF(TRIM(slug), ''), id) AS course_key
    FROM courses
    WHERE company_id IS NOT NULL
  `;

  let count = 0;
  for (const { course_key: courseKey } of slugRows) {
    const key = String(courseKey);
    const candidates = await sql`
      SELECT
        id, slug, title, description, version,
        passing_score, validity_months, content_json
      FROM courses
      WHERE company_id IS NOT NULL
        AND COALESCE(NULLIF(TRIM(slug), ''), id) = ${key}
      ORDER BY octet_length(COALESCE(content_json::text, '')) DESC
      LIMIT 1
    `;
    const row = candidates[0];
    if (!row) continue;

    const rawSlug = row.slug != null ? String(row.slug) : String(row.id).replace(/^\d+-/, "");
    const slug = rawSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || "kurs";
    const masterId = `master-${slug}`;
    const existing = await getMasterCourseMeta(masterId);
    if (existing) continue;

    const content = row.content_json as CourseData | null;
    const title = String(row.title);
    const normalized =
      content?.modules && content.modules.length > 0
        ? normalize({
            ...content,
            courseId: masterId,
            courseName: title,
            version: String(row.version ?? content.version ?? "1.0"),
            passingScore: Number(row.passing_score ?? content.passingScore ?? 80),
            certificateValidityMonths: Number(
              row.validity_months ?? content.certificateValidityMonths ?? 24
            ),
          })
        : emptyTemplate(masterId, title);

    await sql`
      INSERT INTO master_courses (
        id, slug, title, description, version,
        passing_score, validity_months, content_json, status
      )
      VALUES (
        ${masterId}, ${slug}, ${title}, ${row.description ?? null},
        ${normalized.version}, ${normalized.passingScore},
        ${normalized.certificateValidityMonths},
        ${JSON.stringify(normalized)}::jsonb, 'published'
      )
      ON CONFLICT (id) DO NOTHING
    `;
    count++;
  }
  return count;
}

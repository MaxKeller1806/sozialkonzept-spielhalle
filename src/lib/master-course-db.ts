import {
  courseContentScore,
  isEmptyCourseContent,
  parseContentJson,
} from "./content-json";
import {
  formatValidityRuleLabel,
  parseValidityRuleFromRow,
  type ValidityIntervalUnit,
  type ValidityType,
} from "./course-validity";
import { parseInstructionMetaFromRow } from "./course-instruction-meta";
import type { CourseListFilters } from "./course-hierarchy";
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
  const poolSize = migrated.examPoolSize ?? migrated.exam.length;
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
  const rule = parseValidityRuleFromRow(row);
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    status: row.status as MasterCourseStatus,
    validityType: rule.validityType,
    validityLabel: formatValidityRuleLabel(rule),
    active: row.status !== "disabled",
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
    topicId: row.topic_id != null ? Number(row.topic_id) : null,
    topicIds: [],
    topics: [],
    ...parseInstructionMetaFromRow(row),
  };
}

function filterMasterRows(
  rows: Record<string, unknown>[],
  filters?: CourseListFilters
) {
  if (!filters) return rows;
  return rows.filter((row) => {
    const meta = parseInstructionMetaFromRow(row);
    const rule = parseValidityRuleFromRow(row);
    if (filters.mainCategory && meta.mainCategory !== filters.mainCategory) {
      return false;
    }
    if (filters.seminar && meta.seminar !== filters.seminar) return false;
    if (
      filters.topicId != null &&
      (row.topic_id == null || Number(row.topic_id) !== filters.topicId)
    ) {
      return false;
    }
    if (filters.validityType && rule.validityType !== filters.validityType) {
      return false;
    }
    if (filters.active !== undefined) {
      const active = row.status !== "disabled";
      if (active !== filters.active) return false;
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

function sortMasterRows(rows: Record<string, unknown>[], filters?: CourseListFilters) {
  if (filters?.sort) {
    const dir = filters.sortDir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (filters.sort) {
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

  return [...rows].sort((a, b) => {
    const mainA = String(a.main_category ?? a.category ?? "");
    const mainB = String(b.main_category ?? b.category ?? "");
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

function mapMeta(row: Record<string, unknown>): MasterCourseMeta {
  const rule = parseValidityRuleFromRow(row);
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    version: String(row.version),
    passingScore: Number(row.passing_score),
    validityMonths: Number(row.validity_months),
    validityType: rule.validityType,
    validityIntervalValue: rule.validityIntervalValue ?? null,
    validityIntervalUnit: rule.validityIntervalUnit ?? null,
    status: row.status as MasterCourseStatus,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
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
  validityType: ValidityType;
  validityLabel: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  mainCategory: string | null;
  seminar: string | null;
  instructionCode: string | null;
  instructionTitle: string | null;
  sortOrder: number;
  requiresCertificate: boolean;
  requiresProof: boolean;
  topicId?: number | null;
  topicName?: string | null;
  topicSortOrder?: number;
  topicIds?: number[];
  topics?: { id: number; name: string; sortOrder?: number }[];
};

/** Übersichtsliste – ohne content_json, Module oder Prüfungsfragen. */
export async function listMasterCoursesMetadata(
  filters?: CourseListFilters
): Promise<MasterCourseListItem[]> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT id, title, description, status, validity_type, validity_interval_value,
             validity_interval_unit, validity_months, created_at, updated_at,
             main_category, seminar, instruction_code, instruction_title,
             sort_order, requires_certificate, requires_proof, topic_id
      FROM master_courses
    `;
    const filtered = filterMasterRows(rows as Record<string, unknown>[], filters);
    const sorted = sortMasterRows(filtered, filters);
    let items = sorted.map((r) => mapListItem(r));
    const { enrichMasterCoursesWithTopics } = await import("./course-topics");
    items = await enrichMasterCoursesWithTopics(items);
    if (filters?.topicId != null) {
      items = items.filter((c) => (c.topicIds ?? []).includes(filters.topicId!));
    }
    return items;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") && msg.includes("master_courses")) {
      return [];
    }
    if (
      msg.includes("validity_type") ||
      msg.includes("validity_interval") ||
      msg.includes("column")
    ) {
      const rows = await sql`
        SELECT id, title, description, status, validity_months, created_at, updated_at
        FROM master_courses
      `;
      const enriched = (rows as Record<string, unknown>[]).map((r) => ({
        ...r,
        validity_type: "yearly",
        validity_interval_value: null,
        validity_interval_unit: null,
      }));
      const filtered = filterMasterRows(enriched, filters);
      const sorted = sortMasterRows(filtered, filters);
      return sorted.map((r) => mapListItem(r));
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
  try {
    const rows = await sql`
      SELECT
        mc.*,
        ct.name AS topic_name,
        ct.sort_order AS topic_sort_order
      FROM master_courses mc
      LEFT JOIN course_topics ct ON ct.id = mc.topic_id
      WHERE mc.id = ${id}
      LIMIT 1
    `;
    if (!rows[0]) return undefined;
    const { enrichMasterCoursesWithTopics } = await import("./course-topics");
    const [enriched] = await enrichMasterCoursesWithTopics([
      mapMeta(rows[0] as Record<string, unknown>),
    ]);
    return enriched;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("validity_type") || msg.includes("validity_interval")) {
      const rows = await sql`
        SELECT
          id, slug, title, description, version,
          passing_score, validity_months, status, created_at, updated_at
        FROM master_courses
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!rows[0]) return undefined;
      const { enrichMasterCoursesWithTopics } = await import("./course-topics");
      const [enriched] = await enrichMasterCoursesWithTopics([
        mapMeta({
          ...(rows[0] as Record<string, unknown>),
          validity_type: "yearly",
          validity_interval_value: null,
          validity_interval_unit: null,
        }),
      ]);
      return enriched;
    }
    throw e;
  }
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

export type MasterCourseImportHint = {
  masterEmpty: boolean;
  sourceAvailable: boolean;
  sourceTitle: string | null;
  sourceCourseId: string | null;
};

export async function getMasterCourseDetail(
  id: string
): Promise<
  | { meta: MasterCourseMeta; course: CourseData; importHint: MasterCourseImportHint }
  | undefined
> {
  const sql = getSql();
  let rows;
  try {
    rows = await sql`
      SELECT
        id, slug, title, description, version,
        passing_score, validity_type, validity_interval_value, validity_interval_unit,
        validity_months, status, created_at, updated_at,
        content_json
      FROM master_courses
      WHERE id = ${id}
      LIMIT 1
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("validity_type") || msg.includes("validity_interval")) {
      rows = await sql`
        SELECT
          id, slug, title, description, version,
          passing_score, validity_months, status, created_at, updated_at,
          content_json
        FROM master_courses
        WHERE id = ${id}
        LIMIT 1
      `;
    } else {
      throw e;
    }
  }
  if (!rows[0]) return undefined;
  const base = rows[0] as Record<string, unknown>;
  const row: Record<string, unknown> = {
    ...base,
    validity_type: base.validity_type ?? "yearly",
    validity_interval_value: base.validity_interval_value ?? null,
    validity_interval_unit: base.validity_interval_unit ?? null,
  };
  const course = rowToData(row);
  const { enrichCourseWithQuestionPool } = await import("./question-pool-db");
  const enriched = await enrichCourseWithQuestionPool(course, null, null);
  const { enrichMasterCoursesWithTopics } = await import("./course-topics");
  const [meta] = await enrichMasterCoursesWithTopics([mapMeta(row)]);
  const masterEmpty = isEmptyCourseContent(enriched);
  const source = masterEmpty
    ? await findRichestCompanyCourseForMaster(String(row.slug ?? ""))
    : null;
  return {
    meta,
    course: enriched,
    importHint: {
      masterEmpty,
      sourceAvailable: source != null && !isEmptyCourseContent(source.content),
      sourceTitle: source?.title ?? null,
      sourceCourseId: source?.id ?? null,
    },
  };
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
  const toPersist = { ...normalized, exam: [] };
  const sql = getSql();
  const rows = await sql`
    UPDATE master_courses SET
      title = ${normalized.courseName},
      version = ${normalized.version},
      passing_score = ${normalized.passingScore},
      validity_months = ${normalized.certificateValidityMonths},
      content_json = ${JSON.stringify(toPersist)}::jsonb,
      updated_at = NOW()
    WHERE id = ${normalized.courseId}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error("NOT_FOUND");

  const { propagateMasterCourseToCompanies } = await import("./course-provisions");
  await propagateMasterCourseToCompanies(normalized.courseId).catch((err) => {
    console.error("[saveMasterCourseData] propagate failed:", err);
  });

  return normalized;
}

export async function updateMasterCourseSettings(
  id: string,
  settings: {
    passingScore?: number;
    status?: MasterCourseStatus;
    title?: string;
    description?: string | null;
    validityType?: ValidityType;
    validityIntervalValue?: number | null;
    validityIntervalUnit?: ValidityIntervalUnit | null;
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

  await sql`
    UPDATE master_courses SET
      status = ${settings.status ?? meta.status},
      title = ${settings.title ?? meta.title},
      description = ${settings.description !== undefined ? settings.description : meta.description},
      passing_score = ${course.passingScore},
      validity_type = ${validityType},
      validity_interval_value = ${intervalValue},
      validity_interval_unit = ${intervalUnit},
      validity_months = ${validityMonths},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  course.certificateValidityMonths = validityMonths;
  return saveMasterCourseData(course);
}

export async function updateMasterCourseTopicId(
  id: string,
  topicId: number | null
): Promise<MasterCourseMeta | undefined> {
  const { setMasterCourseTopicAssignments } = await import("./course-topics");
  await setMasterCourseTopicAssignments(id, topicId != null ? [topicId] : []);
  return getMasterCourseMeta(id);
}

export async function updateMasterCourseTopicIds(
  id: string,
  topicIds: number[]
): Promise<MasterCourseMeta | undefined> {
  const { setMasterCourseTopicAssignments } = await import("./course-topics");
  await setMasterCourseTopicAssignments(id, topicIds);
  return getMasterCourseMeta(id);
}

export async function deleteMasterCourse(id: string): Promise<boolean> {
  const result = await removeMasterCourse(id);
  return result.mode === "deleted";
}

export type MasterCourseDependencySummary = {
  provisionCount: number;
  companyCourseCount: number;
  assignmentCount: number;
  certificateCount: number;
  trainingAttemptCount: number;
  hasAny: boolean;
};

export async function getMasterCourseDependencySummary(
  id: string
): Promise<MasterCourseDependencySummary> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM company_course_provisions WHERE master_course_id = ${id}) AS provisions,
      (SELECT COUNT(*)::int FROM courses WHERE master_course_id = ${id}) AS company_courses,
      (
        SELECT COUNT(*)::int FROM user_course_assignments uca
        JOIN courses co ON co.id = uca.course_id
        WHERE co.master_course_id = ${id}
      ) AS assignments,
      (
        SELECT COUNT(*)::int FROM certificates c
        JOIN courses co ON co.id = c.course_id
        WHERE co.master_course_id = ${id}
      ) AS certificates,
      (
        SELECT COUNT(*)::int FROM training_attempts t
        JOIN courses co ON co.id = t.course_id
        WHERE co.master_course_id = ${id}
      ) AS training_attempts
  `;
  const r = rows[0] ?? {};
  const provisionCount = Number(r.provisions ?? 0);
  const companyCourseCount = Number(r.company_courses ?? 0);
  const assignmentCount = Number(r.assignments ?? 0);
  const certificateCount = Number(r.certificates ?? 0);
  const trainingAttemptCount = Number(r.training_attempts ?? 0);
  const hasAny =
    provisionCount > 0 ||
    companyCourseCount > 0 ||
    assignmentCount > 0 ||
    certificateCount > 0 ||
    trainingAttemptCount > 0;
  return {
    provisionCount,
    companyCourseCount,
    assignmentCount,
    certificateCount,
    trainingAttemptCount,
    hasAny,
  };
}

export async function setMasterCourseActive(
  id: string,
  active: boolean
): Promise<boolean> {
  const sql = getSql();
  const status = active ? "published" : "disabled";
  const rows = await sql`
    UPDATE master_courses
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Löscht Masterkurs endgültig. Firmenkurse bleiben erhalten (FK SET NULL). */
export async function permanentlyDeleteMasterCourse(id: string): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    const rows = await tx`
      DELETE FROM master_courses WHERE id = ${id} RETURNING id
    `;
    if (rows.length === 0) throw new Error("NOT_FOUND");
  });
}

/** @deprecated Nur für Legacy-Aufrufer – bevorzugt setMasterCourseActive / permanentlyDeleteMasterCourse. */
export async function removeMasterCourse(
  id: string
): Promise<{ mode: "deactivated" | "deleted" }> {
  const meta = await getMasterCourseMeta(id);
  if (!meta) throw new Error("NOT_FOUND");

  const deps = await getMasterCourseDependencySummary(id);
  if (deps.hasAny) {
    const ok = await setMasterCourseActive(id, false);
    if (!ok) throw new Error("NOT_FOUND");
    return { mode: "deactivated" };
  }

  await permanentlyDeleteMasterCourse(id);
  return { mode: "deleted" };
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
  const { getPoolQuestionById } = await import("./question-pool-db");
  const { poolItemToExamQuestion } = await import("./question-pool");
  const item = await getPoolQuestionById(qid);
  if (item && item.courseId === id && item.sourceType === "master") {
    return poolItemToExamQuestion(item);
  }
  const course = await load(id);
  return course.exam.find((q) => q.id === qid);
}

export async function saveExamQuestion(id: string, question: ExamQuestion): Promise<ExamQuestion> {
  const { saveExamQuestionToPool } = await import("./question-pool-db");
  return saveExamQuestionToPool(question, id, null, "master");
}

export async function deleteExamQuestion(id: string, qid: number): Promise<boolean> {
  const { getPoolQuestionById, deletePoolQuestion } = await import("./question-pool-db");
  const item = await getPoolQuestionById(qid);
  if (item && item.courseId === id && item.sourceType === "master") {
    return deletePoolQuestion(qid);
  }
  const course = await load(id);
  const before = course.exam.length;
  course.exam = course.exam.filter((q) => q.id !== qid);
  if (course.exam.length === before) return false;
  await saveMasterCourseData(course);
  return true;
}

export async function nextExamId(id: string): Promise<number> {
  const { listMasterPoolQuestions } = await import("./question-pool-db");
  const items = await listMasterPoolQuestions(id, { includeInactive: true });
  const ids = items.map((q) => q.id);
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

/** Bestehende Firmenkurse als Master übernehmen – idempotent, füllt leere Master nach. */
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
    const source = await findRichestCompanyCourseForSlug(key);
    if (!source || isEmptyCourseContent(source.content)) continue;

    const rawSlug = source.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || "kurs";
    const masterId = `master-${rawSlug}`;
    const existingMeta = await getMasterCourseMeta(masterId);
    const existingCourse = existingMeta ? await getMasterCourseData(masterId) : undefined;

    if (existingMeta && existingCourse && !isEmptyCourseContent(existingCourse)) {
      continue;
    }

    const normalized = normalizeMasterFromCompanySource(masterId, source);
    if (existingMeta) {
      await upsertMasterFromCompanySource(masterId, source, normalized);
    } else {
      await sql`
        INSERT INTO master_courses (
          id, slug, title, description, version,
          passing_score, validity_type, validity_interval_value, validity_interval_unit,
          validity_months, content_json, status
        )
        VALUES (
          ${masterId}, ${rawSlug}, ${source.title}, ${source.description ?? null},
          ${normalized.version}, ${normalized.passingScore},
          ${source.validityType}, ${source.validityIntervalValue}, ${source.validityIntervalUnit},
          ${normalized.certificateValidityMonths},
          ${JSON.stringify(normalized)}::jsonb, 'published'
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    count++;
  }
  return count;
}

type CompanyCourseSource = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  version: string;
  passingScore: number;
  validityType: ValidityType;
  validityIntervalValue: number | null;
  validityIntervalUnit: ValidityIntervalUnit | null;
  validityMonths: number;
  content: CourseData;
};

async function findRichestCompanyCourseForSlug(slugOrKey: string): Promise<CompanyCourseSource | null> {
  const sql = getSql();
  const candidates = await sql`
    SELECT
      id, slug, title, description, version,
      passing_score, validity_type, validity_interval_value, validity_interval_unit,
      validity_months, content_json
    FROM courses
    WHERE company_id IS NOT NULL
      AND COALESCE(NULLIF(TRIM(slug), ''), id) = ${slugOrKey}
    ORDER BY octet_length(COALESCE(content_json::text, '')) DESC
    LIMIT 1
  `;
  return pickRichestCompanySource(candidates as Record<string, unknown>[]);
}

async function findRichestCompanyCourseForMaster(slug: string): Promise<CompanyCourseSource | null> {
  const key = slug.trim() || slug;
  return findRichestCompanyCourseForSlug(key);
}

function pickRichestCompanySource(
  rows: Record<string, unknown>[]
): CompanyCourseSource | null {
  let best: CompanyCourseSource | null = null;
  let bestScore = -1;

  for (const row of rows) {
    const parsed = parseContentJson(row.content_json);
    if (!parsed) continue;
    const score = courseContentScore(parsed);
    if (score <= bestScore) continue;

    const rule = parseValidityRuleFromRow(row);
    best = {
      id: String(row.id),
      slug: String(row.slug ?? row.id).replace(/^\d+-/, ""),
      title: String(row.title),
      description: row.description != null ? String(row.description) : null,
      version: String(row.version ?? parsed.version ?? "1.0"),
      passingScore: Number(row.passing_score ?? parsed.passingScore ?? 80),
      validityType: rule.validityType,
      validityIntervalValue: rule.validityIntervalValue ?? null,
      validityIntervalUnit: rule.validityIntervalUnit ?? null,
      validityMonths: Number(row.validity_months ?? parsed.certificateValidityMonths ?? 24),
      content: parsed,
    };
    bestScore = score;
  }
  return best;
}

function normalizeMasterFromCompanySource(
  masterId: string,
  source: CompanyCourseSource
): CourseData {
  return normalize({
    ...source.content,
    courseId: masterId,
    courseName: source.title,
    version: source.version,
    passingScore: source.passingScore,
    certificateValidityMonths: source.validityMonths,
  });
}

async function upsertMasterFromCompanySource(
  masterId: string,
  source: CompanyCourseSource,
  normalized: CourseData
): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      UPDATE master_courses SET
        title = ${source.title},
        description = ${source.description ?? null},
        version = ${normalized.version},
        passing_score = ${normalized.passingScore},
        validity_type = ${source.validityType},
        validity_interval_value = ${source.validityIntervalValue},
        validity_interval_unit = ${source.validityIntervalUnit},
        validity_months = ${normalized.certificateValidityMonths},
        content_json = ${JSON.stringify(normalized)}::jsonb,
        updated_at = NOW()
      WHERE id = ${masterId}
    `;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("validity_type") || msg.includes("validity_interval")) {
      await sql`
        UPDATE master_courses SET
          title = ${source.title},
          description = ${source.description ?? null},
          version = ${normalized.version},
          passing_score = ${normalized.passingScore},
          validity_months = ${normalized.certificateValidityMonths},
          content_json = ${JSON.stringify(normalized)}::jsonb,
          updated_at = NOW()
        WHERE id = ${masterId}
      `;
    } else {
      throw e;
    }
  }
}

export type ImportCompanyCourseResult =
  | { ok: true; imported: true; modules: number; lessons: number; examQuestions: number }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_HAS_CONTENT" | "NO_SOURCE" };

/** Übernimmt Inhalte aus dem reichhaltigsten Firmenkurs mit gleichem Slug – nur wenn Master leer ist. */
export async function importCompanyCourseIntoMaster(
  masterId: string
): Promise<ImportCompanyCourseResult> {
  const meta = await getMasterCourseMeta(masterId);
  if (!meta) return { ok: false, reason: "NOT_FOUND" };

  const existing = await getMasterCourseData(masterId);
  if (existing && !isEmptyCourseContent(existing)) {
    return { ok: false, reason: "ALREADY_HAS_CONTENT" };
  }

  const source = await findRichestCompanyCourseForMaster(meta.slug);
  if (!source || isEmptyCourseContent(source.content)) {
    return { ok: false, reason: "NO_SOURCE" };
  }

  const normalized = normalizeMasterFromCompanySource(masterId, source);
  await upsertMasterFromCompanySource(masterId, source, normalized);

  const modules = normalized.modules?.length ?? 0;
  const lessons = normalized.modules?.reduce(
    (sum, mod) => sum + (mod.lessons?.length ?? 0),
    0
  ) ?? 0;
  const examQuestions = normalized.exam?.length ?? 0;

  return { ok: true, imported: true, modules, lessons, examQuestions };
}

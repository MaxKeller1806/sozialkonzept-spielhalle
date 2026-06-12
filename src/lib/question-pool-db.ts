import { getSql } from "./db";
import {
  examQuestionToPoolInput,
  mapPoolRow,
  poolItemToExamQuestion,
} from "./question-pool";
import type { ExamQuestion, QuestionPoolItem, QuestionSourceType, PoolQuestionType } from "./types";

function isMissingRelation(err: unknown, name: string): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("does not exist") && msg.includes(name);
}

export async function listMasterPoolQuestions(
  masterCourseId: string,
  opts?: { includeInactive?: boolean }
): Promise<QuestionPoolItem[]> {
  const sql = getSql();
  try {
    const rows = opts?.includeInactive
      ? await sql`
          SELECT * FROM question_pool
          WHERE course_id = ${masterCourseId} AND source_type = 'master'
          ORDER BY sort_order ASC, created_at ASC, id ASC
        `
      : await sql`
          SELECT * FROM question_pool
          WHERE course_id = ${masterCourseId} AND source_type = 'master' AND active = TRUE
          ORDER BY sort_order ASC, created_at ASC, id ASC
        `;
    return rows.map((r) => mapPoolRow(r as Record<string, unknown>));
  } catch (err) {
    if (isMissingRelation(err, "question_pool")) return [];
    throw err;
  }
}

export async function listCompanyPoolQuestions(
  companyId: number,
  courseId: string,
  opts?: { includeInactive?: boolean }
): Promise<QuestionPoolItem[]> {
  const sql = getSql();
  try {
    const rows = opts?.includeInactive
      ? await sql`
          SELECT * FROM question_pool
          WHERE company_id = ${companyId}
            AND course_id = ${courseId}
            AND source_type = 'company'
          ORDER BY sort_order ASC, created_at ASC, id ASC
        `
      : await sql`
          SELECT * FROM question_pool
          WHERE company_id = ${companyId}
            AND course_id = ${courseId}
            AND source_type = 'company'
            AND active = TRUE
          ORDER BY sort_order ASC, created_at ASC, id ASC
        `;
    return rows.map((r) => mapPoolRow(r as Record<string, unknown>));
  } catch (err) {
    if (isMissingRelation(err, "question_pool")) return [];
    throw err;
  }
}

/** Effektiver Prüfungs-Fragenpool: Master-Fragen + betriebliche Ergänzungen. */
export async function getEffectiveExamPool(
  companyId: number,
  courseId: string,
  masterCourseId?: string | null,
  opts?: { includeInactive?: boolean }
): Promise<ExamQuestion[]> {
  const masterQuestions = masterCourseId
    ? await listMasterPoolQuestions(masterCourseId, opts)
    : [];
  const companyQuestions = await listCompanyPoolQuestions(companyId, courseId, opts);

  if (!masterCourseId) {
    return companyQuestions.map(poolItemToExamQuestion);
  }

  return [...masterQuestions, ...companyQuestions].map(poolItemToExamQuestion);
}

export async function getMasterExamPool(
  masterCourseId: string,
  opts?: { includeInactive?: boolean }
): Promise<ExamQuestion[]> {
  const items = await listMasterPoolQuestions(masterCourseId, opts);
  return items.map(poolItemToExamQuestion);
}

export async function countActivePoolQuestions(
  companyId: number,
  courseId: string,
  masterCourseId?: string | null
): Promise<number> {
  const pool = await getEffectiveExamPool(companyId, courseId, masterCourseId);
  return pool.filter((q) => q.active !== false).length;
}

export async function getPoolQuestionById(
  id: number
): Promise<QuestionPoolItem | undefined> {
  const sql = getSql();
  try {
    const rows = await sql`SELECT * FROM question_pool WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapPoolRow(rows[0] as Record<string, unknown>) : undefined;
  } catch (err) {
    if (isMissingRelation(err, "question_pool")) return undefined;
    throw err;
  }
}

export async function savePoolQuestion(
  input: Omit<QuestionPoolItem, "createdAt" | "updatedAt" | "id"> & { id?: number }
): Promise<QuestionPoolItem> {
  const sql = getSql();
  const now = new Date().toISOString();

  if (input.id && input.id > 0) {
    const rows = await sql`
      UPDATE question_pool SET
        question = ${input.question},
        question_type = ${input.questionType},
        answer_a = ${input.answerA},
        answer_b = ${input.answerB},
        answer_c = ${input.answerC},
        answer_d = ${input.answerD},
        correct_answer = ${input.correctAnswer},
        explanation = ${input.explanation},
        difficulty = ${input.difficulty},
        module_id = ${input.moduleId},
        active = ${input.active},
        sort_order = ${input.sortOrder ?? 0},
        updated_at = ${now}
      WHERE id = ${input.id}
      RETURNING *
    `;
    if (!rows[0]) throw new Error("QUESTION_NOT_FOUND");
    return mapPoolRow(rows[0] as Record<string, unknown>);
  }

  const maxRows = await sql`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
    FROM question_pool
    WHERE course_id = ${input.courseId}
      AND source_type = ${input.sourceType}
      AND company_id IS NOT DISTINCT FROM ${input.companyId}
  `;
  const sortOrder =
    input.sortOrder && input.sortOrder > 0
      ? input.sortOrder
      : Number(maxRows[0]?.next_order ?? 1);

  const rows = await sql`
    INSERT INTO question_pool (
      course_id, company_id, source_type, question, question_type,
      answer_a, answer_b, answer_c, answer_d, correct_answer,
      explanation, difficulty, module_id, active, sort_order, updated_at
    ) VALUES (
      ${input.courseId},
      ${input.companyId},
      ${input.sourceType},
      ${input.question},
      ${input.questionType},
      ${input.answerA},
      ${input.answerB},
      ${input.answerC},
      ${input.answerD},
      ${input.correctAnswer},
      ${input.explanation},
      ${input.difficulty},
      ${input.moduleId},
      ${input.active},
      ${sortOrder},
      ${now}
    )
    RETURNING *
  `;
  return mapPoolRow(rows[0] as Record<string, unknown>);
}

export async function saveExamQuestionToPool(
  question: ExamQuestion & {
    explanation?: string | null;
    difficulty?: string | null;
    active?: boolean;
    poolQuestionType?: PoolQuestionType;
  },
  courseId: string,
  companyId: number | null,
  sourceType: QuestionSourceType
): Promise<ExamQuestion> {
  const poolInput = examQuestionToPoolInput(
    { ...question, sourceType },
    courseId,
    companyId
  );
  const id = question.id && question.id > 0 ? question.id : undefined;
  const saved = await savePoolQuestion({ ...poolInput, id });
  return poolItemToExamQuestion(saved);
}

export async function setPoolQuestionActive(
  id: number,
  active: boolean
): Promise<QuestionPoolItem | undefined> {
  const sql = getSql();
  const rows = await sql`
    UPDATE question_pool
    SET active = ${active}, updated_at = ${new Date().toISOString()}
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? mapPoolRow(rows[0] as Record<string, unknown>) : undefined;
}

export async function deletePoolQuestion(id: number): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM question_pool WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

/** Master-Fragenpool aus content_json.exam in question_pool spiegeln (Upsert). */
export async function syncMasterQuestionPoolFromContent(
  masterCourseId: string,
  examQuestions: ExamQuestion[]
): Promise<void> {
  const sql = getSql();
  const existing = await listMasterPoolQuestions(masterCourseId, { includeInactive: true });
  const incomingIds = new Set<number>();

  for (const q of examQuestions) {
    const poolInput = examQuestionToPoolInput(
      { ...q, sourceType: "master", active: true },
      masterCourseId,
      null
    );
    const match = existing.find(
      (e) =>
        e.question === q.question &&
        e.questionType === (q.type as QuestionPoolItem["questionType"]) &&
        e.moduleId === (q.moduleId > 0 ? q.moduleId : null)
    );

    if (match) {
      incomingIds.add(match.id);
      await savePoolQuestion({ ...poolInput, id: match.id, active: true });
    } else {
      const saved = await savePoolQuestion(poolInput);
      incomingIds.add(saved.id);
    }
  }

  for (const item of existing) {
    if (!incomingIds.has(item.id) && item.active) {
      await setPoolQuestionActive(item.id, false);
    }
  }

  // Legacy: exam-Array im content_json leeren (Fragenpool ist Quelle der Wahrheit)
  await sql`
    UPDATE master_courses
    SET content_json = jsonb_set(COALESCE(content_json, '{}'::jsonb), '{exam}', '[]'::jsonb)
    WHERE id = ${masterCourseId}
      AND jsonb_array_length(COALESCE(content_json->'exam', '[]'::jsonb)) > 0
  `;
}

/** Master-Update an Firmenkurse: Master-Fragen synchronisieren, betriebliche Fragen bleiben. */
export async function syncMasterQuestionPoolToCompanies(
  masterCourseId: string
): Promise<void> {
  const sql = getSql();
  const masterQuestions = await listMasterPoolQuestions(masterCourseId, {
    includeInactive: true,
  });

  const companyCourses = await sql`
    SELECT id, company_id FROM courses
    WHERE master_course_id = ${masterCourseId}
  `;

  for (const row of companyCourses) {
    const courseId = String(row.id);
    const companyId = Number(row.company_id);

    await sql`
      UPDATE courses
      SET content_json = jsonb_set(COALESCE(content_json, '{}'::jsonb), '{exam}', '[]'::jsonb)
      WHERE id = ${courseId}
    `;

    // Betriebliche Fragen bleiben unverändert – nur Master-Pool wird referenziert
    void companyId;
    void masterQuestions;
  }
}

export async function enrichCourseWithQuestionPool<T extends { exam: ExamQuestion[]; courseId: string; passingScore?: number; examQuestionsPerTest?: number }>(
  course: T,
  companyId: number | null,
  masterCourseId?: string | null
): Promise<T & { examPoolSize: number }> {
  let exam: ExamQuestion[];

  if (companyId != null) {
    exam = await getEffectiveExamPool(companyId, course.courseId, masterCourseId, {
      includeInactive: true,
    });
  } else {
    exam = await getMasterExamPool(course.courseId, { includeInactive: true });
  }

  const activeCount = exam.filter((q) => q.active !== false).length;
  const examPerTest = course.examQuestionsPerTest ?? 15;
  const minCorrectAnswers = Math.ceil(
    (examPerTest * (course.passingScore ?? 80)) / 100
  );
  return {
    ...course,
    exam,
    examPoolSize: activeCount,
    minCorrectAnswers,
  };
}

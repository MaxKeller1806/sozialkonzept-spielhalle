#!/usr/bin/env node
/**
 * Befüllt Master-Unterweisungen Sicherheitskonzept mit Lerninhalten.
 * Berührt nicht Sozialkonzept oder Kurse ohne instruction_code.
 * Usage: npm run seed:safety
 */
import postgres from "postgres";
import {
  buildSafetyInstructionCourse,
  examPoolQuestionToDbFields,
  SAFETY_INSTRUCTION_CONTENT,
} from "./safety-instruction-content.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "prefer", prepare: false, max: 1 });

async function syncMasterExamPool(masterId, examPool) {
  if (!examPool?.length) return 0;

  await sql`
    DELETE FROM question_pool
    WHERE course_id = ${masterId} AND source_type = 'master'
  `;

  let count = 0;
  for (const q of examPool) {
    const fields = examPoolQuestionToDbFields(q);
    await sql`
      INSERT INTO question_pool (
        course_id, company_id, source_type, question, question_type,
        answer_a, answer_b, answer_c, answer_d, correct_answer,
        explanation, difficulty, module_id, active
      ) VALUES (
        ${masterId},
        NULL,
        'master',
        ${fields.question},
        ${fields.question_type},
        ${fields.answer_a},
        ${fields.answer_b},
        ${fields.answer_c},
        ${fields.answer_d},
        ${fields.correct_answer},
        ${fields.explanation},
        ${fields.difficulty},
        1,
        TRUE
      )
    `;
    count++;
  }
  return count;
}

async function main() {
  let masterUpdated = 0;
  let companyUpdated = 0;
  let poolQuestions = 0;

  for (const def of SAFETY_INSTRUCTION_CONTENT) {
    const course = buildSafetyInstructionCourse(def);

    const masterRows = await sql`
      UPDATE master_courses
      SET
        title = ${def.fullTitle},
        version = ${course.version},
        content_json = ${sql.json(course)},
        estimated_duration_minutes = ${def.durationMinutes ?? course.durationMinutes},
        updated_at = NOW()
      WHERE instruction_code = ${def.code}
      RETURNING id
    `;

    if (masterRows.length === 0) {
      console.warn(`⚠ Master nicht gefunden: ${def.code}`);
      continue;
    }
    masterUpdated++;
    const masterId = String(masterRows[0].id);

    if (def.examPool?.length) {
      const inserted = await syncMasterExamPool(masterId, def.examPool);
      poolQuestions += inserted;
      console.log(`  ↳ Fragenpool: ${inserted} Prüfungsfragen`);
    }

    const companyCourses = await sql`
      SELECT id, content_json
      FROM courses
      WHERE master_course_id = ${masterId}
    `;

    for (const row of companyCourses) {
      const companyCourse = {
        ...course,
        courseId: String(row.id),
      };
      await sql`
        UPDATE courses
        SET
          title = ${def.fullTitle},
          version = ${course.version},
          content_json = ${sql.json(companyCourse)},
          estimated_duration_minutes = ${def.durationMinutes ?? course.durationMinutes},
          updated_at = NOW()
        WHERE id = ${row.id}
      `;
      companyUpdated++;
    }

    console.log(`✓ ${def.fullTitle} (Version ${course.version})`);
  }

  console.log(
    `\nFertig: ${masterUpdated} Master-Kurse, ${companyUpdated} Firmenkopien, ${poolQuestions} Fragenpool-Einträge aktualisiert.`
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

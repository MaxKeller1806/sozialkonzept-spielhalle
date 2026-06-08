#!/usr/bin/env node
/**
 * Befüllt Master-Unterweisungen Sicherheitskonzept mit Lerninhalten.
 * Berührt nicht Sozialkonzept oder Kurse ohne instruction_code.
 * Usage: npm run seed:safety
 */
import postgres from "postgres";
import {
  buildSafetyInstructionCourse,
  SAFETY_INSTRUCTION_CONTENT,
} from "./safety-instruction-content.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "prefer", prepare: false, max: 1 });

async function main() {
  let masterUpdated = 0;
  let companyUpdated = 0;

  for (const def of SAFETY_INSTRUCTION_CONTENT) {
    const course = buildSafetyInstructionCourse(def);

    const masterRows = await sql`
      UPDATE master_courses
      SET
        content_json = ${sql.json(course)},
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
          content_json = ${sql.json(companyCourse)},
          updated_at = NOW()
        WHERE id = ${row.id}
      `;
      companyUpdated++;
    }

    console.log(`✓ ${def.fullTitle}`);
  }

  console.log(
    `\nFertig: ${masterUpdated} Master-Kurse, ${companyUpdated} leere Firmenkopien aktualisiert.`
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

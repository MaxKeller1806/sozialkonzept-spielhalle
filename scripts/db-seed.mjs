#!/usr/bin/env node
/**
 * Seeds course metadata and demo users. Idempotent.
 * Usage: npm run db:seed
 */
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coursePath = path.join(__dirname, "../data/course.json");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt. Siehe .env.example");
  process.exit(1);
}

const course = JSON.parse(fs.readFileSync(coursePath, "utf-8"));
const sql = postgres(url, { ssl: "prefer", prepare: false, max: 1 });

async function main() {
  await sql`
    INSERT INTO courses (id, title, version, passing_score, validity_months)
    VALUES (
      ${course.courseId},
      ${course.courseName},
      ${course.version},
      ${course.passingScore},
      ${course.certificateValidityMonths}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      version = EXCLUDED.version,
      passing_score = EXCLUDED.passing_score,
      validity_months = EXCLUDED.validity_months
  `;

  const adminHash = bcrypt.hashSync("admin123", 10);
  await sql`
    INSERT INTO users (first_name, last_name, email, password_hash, role, location, active)
    VALUES ('Admin', 'System', 'admin@spielhalle.local', ${adminHash}, 'admin', 'Zentrale', TRUE)
    ON CONFLICT (email) DO NOTHING
  `;

  const demoHash = bcrypt.hashSync("demo123", 10);
  await sql`
    INSERT INTO users (
      first_name, last_name, email, password_hash, birth_date, role, location, active
    )
    VALUES (
      'Max', 'Mustermann', 'mitarbeiter@demo.de', ${demoHash},
      '1990-05-15', 'employee', 'Spielhalle Nord', TRUE
    )
    ON CONFLICT (email) DO NOTHING
  `;

  console.log("Seed abgeschlossen (Kurs + Demo-Benutzer).");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

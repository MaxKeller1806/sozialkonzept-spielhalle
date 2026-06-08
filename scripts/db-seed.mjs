#!/usr/bin/env node
/**
 * Seeds company, course, and demo users. Idempotent.
 * Usage: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { spawnSync } from "node:child_process";
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

function hashLicenseKey(key) {
  return bcrypt.hashSync(key.trim().toUpperCase(), 10);
}

async function main() {
  const companyRows = await sql`
    INSERT INTO companies (
      slug, name, status, license_status, license_activated_at,
      primary_color, secondary_color, background_color, accent_color
    )
    VALUES (
      'standard', 'Standard Spielhalle GmbH', 'active', 'active', NOW(),
      '#000080', '#4040a0', '#f8fafc', '#2563eb'
    )
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const companyId = Number(
    companyRows[0]?.id ??
      (await sql`SELECT id FROM companies WHERE slug = 'standard' LIMIT 1`)[0]?.id
  );

  const existingCourse = await sql`
    SELECT id FROM courses
    WHERE company_id = ${companyId} AND slug = 'sozialkonzept'
    LIMIT 1
  `;
  const courseId = existingCourse[0]?.id ?? `${companyId}-sozialkonzept`;
  const coursePayload = { ...course, courseId };

  await sql`
    INSERT INTO courses (
      id, company_id, slug, title, description, version,
      passing_score, validity_months, content_json, active
    )
    VALUES (
      ${courseId}, ${companyId}, 'sozialkonzept', ${course.courseName}, NULL,
      ${course.version}, ${course.passingScore},
      ${course.certificateValidityMonths},
      ${JSON.stringify(coursePayload)}::jsonb, TRUE
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

  const superHash = bcrypt.hashSync(
    process.env.SUPERUSER_PASSWORD ?? "superuser123",
    10
  );
  await sql`
    INSERT INTO users (
      first_name, last_name, email, password_hash, role, active, must_change_password
    )
    VALUES (
      'Super', 'User', 'superuser@betreiber.local', ${superHash},
      'superuser', TRUE, FALSE
    )
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      active = TRUE,
      must_change_password = FALSE
  `;

  const adminHash = bcrypt.hashSync("admin123", 10);
  await sql`
    INSERT INTO users (
      first_name, last_name, email, password_hash, role, company_id, location, active, must_change_password
    )
    VALUES (
      'Admin', 'System', 'admin@spielhalle.local', ${adminHash},
      'admin', ${companyId}, 'Zentrale', TRUE, FALSE
    )
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      company_id = EXCLUDED.company_id,
      role = EXCLUDED.role,
      active = TRUE,
      must_change_password = FALSE
  `;

  const demoHash = bcrypt.hashSync("demo123", 10);
  const demoRows = await sql`
    INSERT INTO users (
      first_name, last_name, email, password_hash, birth_date,
      role, company_id, location, active, must_change_password
    )
    VALUES (
      'Max', 'Mustermann', 'mitarbeiter@demo.de', ${demoHash},
      '1990-05-15', 'employee', ${companyId}, 'Spielhalle Nord', TRUE, FALSE
    )
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      company_id = EXCLUDED.company_id,
      role = EXCLUDED.role,
      active = TRUE,
      must_change_password = FALSE
    RETURNING id
  `;

  const demoUserId =
    demoRows[0]?.id ??
    (await sql`SELECT id FROM users WHERE email = 'mitarbeiter@demo.de' LIMIT 1`)[0]
      ?.id;

  if (demoUserId) {
    await sql`
      INSERT INTO user_course_assignments (user_id, course_id)
      VALUES (${demoUserId}, ${courseId})
      ON CONFLICT DO NOTHING
    `;
  }

  await sql`
    UPDATE companies
    SET license_key_hash = ${hashLicenseKey(process.env.DEFAULT_LICENSE_KEY ?? "SK-DEMO-LICENSE")}
    WHERE id = ${companyId} AND license_key_hash IS NULL
  `;

  console.log("Seed abgeschlossen (Firma, Kurs, Superuser, Admin, Mitarbeiter).");
  await sql.end();

  const seedTemplates = spawnSync(
    "npx",
    ["tsx", path.join(__dirname, "seed-document-templates.ts")],
    { stdio: "inherit", env: process.env }
  );
  if (seedTemplates.status !== 0) {
    process.exit(seedTemplates.status ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

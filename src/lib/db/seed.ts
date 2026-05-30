import bcrypt from "bcryptjs";
import type postgres from "postgres";
import { getCourse } from "../course";

export async function seedDatabase(sql: postgres.Sql): Promise<void> {
  const course = getCourse();

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
    VALUES (
      'Admin', 'System', 'admin@spielhalle.local', ${adminHash},
      'admin', 'Zentrale', TRUE
    )
    ON CONFLICT (email) DO NOTHING
  `;

  const demoHash = bcrypt.hashSync("demo123", 10);
  await sql`
    INSERT INTO users (
      first_name, last_name, email, password_hash, birth_date,
      role, location, active
    )
    VALUES (
      'Max', 'Mustermann', 'mitarbeiter@demo.de', ${demoHash},
      '1990-05-15', 'employee', 'Spielhalle Nord', TRUE
    )
    ON CONFLICT (email) DO NOTHING
  `;
}

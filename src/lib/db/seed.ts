import bcrypt from "bcryptjs";
import type postgres from "postgres";
import { importCourseFromJson, assignUserToCourse } from "../course-db";
import { getCourseFromFile } from "../course";
import { hashLicenseKey } from "../license";
import { seedGlobalDocumentTemplates } from "../document-template-db";

export async function seedDatabase(sql: postgres.Sql): Promise<void> {
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
  const companyId = Number(companyRows[0]?.id ?? (
    await sql`SELECT id FROM companies WHERE slug = 'standard' LIMIT 1`
  )[0]?.id);

  const course = getCourseFromFile();
  await importCourseFromJson(companyId, course, "sozialkonzept");

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
      first_name, last_name, email, password_hash, role, company_id, location, active
    )
    VALUES (
      'Admin', 'System', 'admin@spielhalle.local', ${adminHash},
      'admin', ${companyId}, 'Zentrale', TRUE
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

  const courseId = `${companyId}-sozialkonzept`;
  const demoUserId = demoRows[0]?.id ?? (
    await sql`SELECT id FROM users WHERE email = 'mitarbeiter@demo.de' LIMIT 1`
  )[0]?.id;

  if (demoUserId) {
    await assignUserToCourse(Number(demoUserId), courseId);
  }

  await sql`
    UPDATE companies
    SET license_key_hash = ${hashLicenseKey(process.env.DEFAULT_LICENSE_KEY ?? "SK-DEMO-LICENSE")}
    WHERE id = ${companyId} AND license_key_hash IS NULL
  `;

  await seedGlobalDocumentTemplates(sql);
}

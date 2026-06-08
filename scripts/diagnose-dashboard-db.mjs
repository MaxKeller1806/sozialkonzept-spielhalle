#!/usr/bin/env node
/**
 * Prüft DB-Schema und Kennzahlen-Basisdaten für das Admin-Dashboard.
 * Usage: npm run db:diagnose
 * Optional: COMPANY_ID=1 npm run db:diagnose
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}

const companyId = Number(process.env.COMPANY_ID ?? "1");
const sql = postgres(url, { ssl: "prefer", prepare: false, max: 1 });

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function tableExists(table) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function countForCompany(table, companyColumn = "company_id") {
  if (!(await tableExists(table))) return null;
  const rows = await sql.unsafe(
    `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${companyColumn} = $1`,
    [companyId]
  );
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  console.log(`Diagnose Admin-Dashboard (company_id=${companyId})\n`);

  const checks = [
    ["users.joined_company_at", () => columnExists("users", "joined_company_at")],
    ["users.left_company_at", () => columnExists("users", "left_company_at")],
    ["responsibility_types", () => tableExists("responsibility_types")],
    ["company_responsibilities", () => tableExists("company_responsibilities")],
    ["industries", () => tableExists("industries")],
    ["business_types", () => tableExists("business_types")],
  ];

  console.log("Schema:");
  for (const [label, fn] of checks) {
    const ok = await fn();
    console.log(`  ${ok ? "OK" : "FEHLT"}  ${label}`);
  }

  console.log("\nDatensätze (Firma):");
  const users = await countForCompany("users");
  const courses = await countForCompany("courses");
  const assignments = await sql`
    SELECT COUNT(*)::int AS c
    FROM user_course_assignments uca
    JOIN users u ON u.id = uca.user_id
    WHERE u.company_id = ${companyId}
  `.then((r) => Number(r[0]?.c ?? 0));
  const certificates = await countForCompany("certificates");
  const attempts = await countForCompany("training_attempts");
  const privacy = await countForCompany("privacy_policy_acceptances");
  const categories = await countForCompany("employee_categories");
  const respTypes = (await tableExists("responsibility_types"))
    ? await sql`SELECT COUNT(*)::int AS c FROM responsibility_types WHERE active = TRUE`.then(
        (r) => Number(r[0]?.c ?? 0)
      )
    : null;
  const respAssign = (await tableExists("company_responsibilities"))
    ? await countForCompany("company_responsibilities")
    : null;

  console.log(`  users: ${users ?? "—"}`);
  console.log(`  courses: ${courses ?? "—"}`);
  console.log(`  user_course_assignments: ${assignments}`);
  console.log(`  certificates: ${certificates ?? "—"}`);
  console.log(`  training_attempts: ${attempts ?? "—"}`);
  console.log(`  privacy_policy_acceptances: ${privacy ?? "—"}`);
  console.log(`  employee_categories: ${categories ?? "—"}`);
  console.log(`  responsibility_types (aktiv): ${respTypes ?? "—"}`);
  console.log(`  company_responsibilities: ${respAssign ?? "—"}`);

  console.log("\nEmpfohlene Migrationen (falls Schema fehlt):");
  console.log("  npm run db:migrate");
  console.log("\nRelevante Dateien:");
  console.log("  20260609120000_industries_business_types.sql");
  console.log("  20260610120000_user_joined_company_at.sql");
  console.log("  20260610130000_user_left_company_at.sql");
  console.log("  20260610140000_privacy_policy_indexes.sql");
  console.log("  20260613120000_responsibility_types.sql");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

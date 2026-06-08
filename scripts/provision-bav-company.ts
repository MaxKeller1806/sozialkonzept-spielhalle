#!/usr/bin/env npx tsx
/**
 * Provisioniert alle BAV-Masterkurse (instruction_code IS NOT NULL) für eine Firma.
 * Nutzt assignMasterToCompany() — keine direkten DB-Kopien.
 *
 * Usage: npx tsx scripts/provision-bav-company.ts [companyId]
 */
import { getSql } from "../src/lib/db";
import { assignMasterToCompany } from "../src/lib/course-provisions";

const companyId = Number(process.argv[2] ?? "1");
if (!Number.isFinite(companyId) || companyId < 1) {
  console.error("Ungültige companyId.");
  process.exit(1);
}

async function main() {
  const sql = getSql();
  const masters = await sql`
    SELECT id, instruction_code, title
    FROM master_courses
    WHERE instruction_code IS NOT NULL
    ORDER BY sort_order, instruction_code
  `;

  if (masters.length === 0) {
    console.error("Keine BAV-Masterkurse gefunden.");
    process.exit(1);
  }

  console.log(`Provisioniere ${masters.length} BAV-Kurse für Firma ${companyId}…\n`);

  for (const m of masters) {
    const masterId = String(m.id);
    const provision = await assignMasterToCompany(masterId, companyId, null);
    console.log(`✓ ${m.instruction_code} → ${provision.courseId} (${provision.status})`);
  }

  console.log("\nFertig.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

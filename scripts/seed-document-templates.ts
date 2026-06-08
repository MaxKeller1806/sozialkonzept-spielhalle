#!/usr/bin/env npx tsx
/**
 * Seed für globale Dokumentvorlagen (Zertifikat + Nachweis).
 * Usage: npm run seed:document-templates
 */
import { getSql } from "../src/lib/db";
import { assertDocumentTemplateSchema } from "./document-template-schema-check";
import { seedGlobalDocumentTemplates } from "../src/lib/document-template";

async function main() {
  const sql = getSql();
  await assertDocumentTemplateSchema(sql);
  const result = await seedGlobalDocumentTemplates(sql);
  console.log("Document-Template-Seed:", JSON.stringify(result, null, 2));
  await sql.end({ timeout: 2 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

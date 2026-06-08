#!/usr/bin/env npx tsx
/**
 * Prüft, ob globale Standardvorlagen vorhanden und auflösbar sind.
 * Usage: npm run verify:document-templates
 */
import { getSql } from "../src/lib/db";
import { assertDocumentTemplateSchema } from "./document-template-schema-check";
import {
  getDefaultPublishedDocumentTemplateRevision,
  listGlobalDocumentTemplates,
  seedGlobalDocumentTemplates,
} from "../src/lib/document-template";

async function main() {
  const sql = getSql();
  await assertDocumentTemplateSchema(sql);

  await seedGlobalDocumentTemplates(sql);

  const templates = await listGlobalDocumentTemplates();
  const certificate = await getDefaultPublishedDocumentTemplateRevision(
    null,
    "certificate"
  );
  const proof = await getDefaultPublishedDocumentTemplateRevision(null, "proof");

  const errors: string[] = [];

  if (templates.length < 2) {
    errors.push(`Erwartet ≥2 globale Vorlagen, gefunden: ${templates.length}`);
  }
  if (!certificate) {
    errors.push("Keine veröffentlichte Default-Vorlage für certificate");
  }
  if (!proof) {
    errors.push("Keine veröffentlichte Default-Vorlage für proof");
  }
  if (certificate && certificate.revisionNumber !== 1) {
    errors.push(
      `certificate revision_number erwartet 1, ist ${certificate.revisionNumber}`
    );
  }
  if (proof && proof.revisionNumber !== 1) {
    errors.push(
      `proof revision_number erwartet 1, ist ${proof.revisionNumber}`
    );
  }

  if (errors.length > 0) {
    console.error("verify:document-templates FEHLGESCHLAGEN");
    for (const e of errors) console.error(" -", e);
    await sql.end({ timeout: 2 });
    process.exit(1);
  }

  console.log("verify:document-templates OK");
  console.log(
    "Globale Vorlagen:",
    templates.map((t) => `${t.documentType} (#${t.id}, rev ${t.publishedRevisionId})`)
  );
  await sql.end({ timeout: 2 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

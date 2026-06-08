#!/usr/bin/env npx tsx
/**
 * Setzt globale Vorlagen auf neutrale Standardwerte zurück (Draft → Publish).
 * Usage: npx tsx scripts/restore-document-templates.ts
 */
import { getSql } from "../src/lib/db";
import {
  createGlobalDocumentTemplateDraft,
  getBuiltinDocumentTemplateConfig,
  getGlobalDocumentTemplateDetail,
  listGlobalDocumentTemplates,
  publishGlobalDocumentTemplateDraft,
  updateGlobalDocumentTemplateDraftConfig,
  type DocumentType,
} from "../src/lib/document-template";

const STANDARD_OVERRIDES: Record<
  DocumentType,
  { title: string; subtitle: string }
> = {
  certificate: {
    title: "Zertifikat",
    subtitle: "Schulungsnachweis",
  },
  proof: {
    title: "Nachweis",
    subtitle: "Unterweisungsnachweis",
  },
};

function standardConfig(documentType: DocumentType) {
  const base = getBuiltinDocumentTemplateConfig(documentType);
  const labels = STANDARD_OVERRIDES[documentType];
  return {
    ...base,
    title: labels.title,
    subtitle: labels.subtitle,
    styling: { ...base.styling, primaryColor: "#000080" },
  };
}

async function restoreTemplate(templateId: number, documentType: DocumentType) {
  let detail = await getGlobalDocumentTemplateDetail(templateId);
  if (!detail) throw new Error(`Template ${templateId} nicht gefunden`);

  if (!detail.draftRevision) {
    detail = await createGlobalDocumentTemplateDraft(templateId);
  }

  await updateGlobalDocumentTemplateDraftConfig(templateId, standardConfig(documentType));
  detail = await publishGlobalDocumentTemplateDraft(templateId);

  const config = detail.publishedRevision?.config;
  if (!config) throw new Error(`Keine published Revision für ${documentType}`);

  const markerHit = JSON.stringify(config).includes("E2E-");
  if (markerHit) {
    throw new Error(`E2E-Marker noch in published config (${documentType})`);
  }

  return { documentType, config };
}

async function main() {
  const templates = await listGlobalDocumentTemplates();
  const results = [];

  for (const template of templates) {
    results.push(await restoreTemplate(template.id, template.documentType));
  }

  for (const r of results) {
    console.log(
      `OK ${r.documentType}: title="${r.config.title}", subtitle="${r.config.subtitle}", color=${r.config.styling.primaryColor}`
    );
  }

  const verify = JSON.stringify(results);
  if (verify.includes("E2E-")) {
    console.error("FEHLER: E2E-Marker noch vorhanden");
    process.exit(1);
  }

  console.log("restore-document-templates OK");
  await getSql().end({ timeout: 2 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

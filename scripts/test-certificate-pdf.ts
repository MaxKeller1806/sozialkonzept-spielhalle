/**
 * Prüft PDF-Generierung für Legacy- und Template-Zertifikate.
 * Usage: npm run test:certificate-pdf
 */
import fs from "node:fs";
import path from "node:path";
import { getSql } from "../src/lib/db";
import { mapCertificate, mapUser } from "../src/lib/db/row-mappers";
import { getCourseForContext } from "../src/lib/course";
import { getCourseMeta } from "../src/lib/course-db";
import { getDocumentTemplateRevisionById } from "../src/lib/document-template";
import { getCompanyById } from "../src/lib/tenant";
import type { Certificate } from "../src/lib/types";

const outDir = path.join(process.cwd(), "tmp", "certificate-pdf-test");

async function renderCertificatePdf(cert: Certificate): Promise<Buffer> {
  const { generateCertificatePdf } = await import("../src/lib/pdf");
  const sql = getSql();
  const userRows = await sql`SELECT * FROM users WHERE id = ${cert.userId} LIMIT 1`;
  const user = mapUser(userRows[0] as Record<string, unknown>);
  const course = await getCourseForContext(cert.companyId!, cert.courseId);
  const courseMeta = await getCourseMeta(cert.companyId!, cert.courseId);
  const company = await getCompanyById(cert.companyId!);

  let templateConfig;
  if (cert.templateRevisionId != null) {
    const revision = await getDocumentTemplateRevisionById(cert.templateRevisionId);
    templateConfig = revision?.config;
  }

  return generateCertificatePdf(user, cert, course, {
    companyName: company?.name,
    branding: company?.branding,
    instructionCode: courseMeta?.instructionCode ?? null,
    instructionTitle: courseMeta?.instructionTitle ?? null,
    templateConfig,
  });
}

function assertPdf(label: string, pdf: Buffer, file: string): string | null {
  if (!pdf.length || pdf.subarray(0, 4).toString() !== "%PDF") {
    return `${label} ungültig.`;
  }
  fs.writeFileSync(file, pdf);
  console.log(`${label} OK: ${file} (${pdf.length} bytes)`);
  return null;
}

async function main() {
  const sql = getSql();
  fs.mkdirSync(outDir, { recursive: true });

  const legacyRows = await sql`
    SELECT * FROM certificates
    WHERE template_revision_id IS NULL AND revoked = FALSE
    ORDER BY id ASC
    LIMIT 1
  `;
  const templateRows = await sql`
    SELECT * FROM certificates
    WHERE template_revision_id IS NOT NULL AND revoked = FALSE
    ORDER BY id DESC
    LIMIT 1
  `;

  const errors: string[] = [];

  if (legacyRows.length === 0) {
    errors.push("Kein Legacy-Zertifikat (template_revision_id IS NULL) gefunden.");
  } else {
    const cert = mapCertificate(legacyRows[0] as Record<string, unknown>);
    const pdf = await renderCertificatePdf(cert);
    const err = assertPdf(
      `Legacy (cert #${cert.id})`,
      pdf,
      path.join(outDir, `legacy-${cert.id}.pdf`)
    );
    if (err) errors.push(err);
  }

  if (templateRows.length > 0) {
    const cert = mapCertificate(templateRows[0] as Record<string, unknown>);
    const pdf = await renderCertificatePdf(cert);
    const err = assertPdf(
      `Template (cert #${cert.id}, rev ${cert.templateRevisionId})`,
      pdf,
      path.join(outDir, `template-${cert.id}.pdf`)
    );
    if (err) errors.push(err);
  } else if (legacyRows.length > 0) {
    const revisionRows = await sql`
      SELECT id FROM document_template_revisions
      WHERE status = 'published'
      ORDER BY id ASC
      LIMIT 1
    `;
    if (revisionRows.length === 0) {
      errors.push("Keine published Template-Revision für Fallback-Test gefunden.");
    } else {
      const cert = mapCertificate(legacyRows[0] as Record<string, unknown>);
      cert.templateRevisionId = Number(revisionRows[0].id);
      const pdf = await renderCertificatePdf(cert);
      const err = assertPdf(
        `Template-Fallback (rev ${cert.templateRevisionId})`,
        pdf,
        path.join(outDir, `template-fallback-rev${cert.templateRevisionId}.pdf`)
      );
      if (err) errors.push(err);
    }
  }

  await sql.end({ timeout: 2 });

  if (errors.length > 0) {
    console.error("test:certificate-pdf FEHLGESCHLAGEN");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }

  console.log("test:certificate-pdf OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

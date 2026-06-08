#!/usr/bin/env npx tsx
/**
 * End-to-End-Test: Zertifikat-/Nachweis-Designer, Ausstellung, PDF, Sicherheit.
 * Usage: npm run test:designer-e2e
 * Voraussetzung: Dev-Server auf APP_URL (default http://localhost:3000)
 */
import fs from "node:fs";
import path from "node:path";
import { getSql } from "../src/lib/db";
import { mapCertificate } from "../src/lib/db/row-mappers";
import type { ExamQuestion } from "../src/lib/types";

const courseJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/course.json"), "utf-8")
) as { exam: ExamQuestion[] };

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp", "e2e-designer-test");

const USERS = {
  superuser: { email: "superuser@betreiber.local", password: "superuser123", portal: "certiano" },
  admin: { email: "admin@spielhalle.local", password: "admin123", companySlug: "standard" },
  employee: { email: "mitarbeiter@demo.de", password: "demo123", companySlug: "standard" },
};

type StepResult = { name: string; ok: boolean; detail?: string };

const results: StepResult[] = [];
const PII_KEYS = [
  "firstName",
  "lastName",
  "birthDate",
  "email",
  "employeeName",
  "certificateNumber",
  "verificationToken",
];

function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) pass(name, detail);
  else fail(name, detail);
}

function cookieFromResponse(res: Response): string {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [];
  if (raw.length > 0) {
    return raw.map((c) => c.split(";")[0]).join("; ");
  }
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
}

async function login(user: {
  email: string;
  password: string;
  portal?: string;
  companySlug?: string;
  companyId?: number;
}) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login ${user.email}: ${data.error ?? res.status}`);
  const cookie = cookieFromResponse(res);
  if (!cookie) throw new Error(`Kein Session-Cookie für ${user.email}`);
  return cookie;
}

async function api(
  cookie: string,
  pathname: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${BASE}${pathname}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Cookie: cookie,
    },
  });
}

function pdfHasText(pdf: Buffer, text: string): boolean {
  return pdf.includes(text);
}

function jsonHasPii(value: unknown): string[] {
  const hits: string[] = [];
  const walk = (v: unknown, keyPath: string) => {
    if (v && typeof v === "object") {
      if (Array.isArray(v)) v.forEach((item, i) => walk(item, `${keyPath}[${i}]`));
      else {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          if (PII_KEYS.includes(k)) hits.push(`${keyPath}.${k}`);
          walk(val, `${keyPath}.${k}`);
        }
      }
    }
  };
  walk(value, "root");
  return hits;
}

async function waitForServer(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/api/auth/me`);
      if (res.status === 401 || res.status === 200) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server nicht erreichbar unter ${BASE}`);
}

async function runDesignerFlow(
  cookie: string,
  documentType: "certificate" | "proof",
  marker: string,
  color: string
): Promise<number> {
  const listRes = await api(cookie, "/api/superuser/document-templates");
  const listData = await listRes.json();
  assert(`${documentType}: GET templates`, listRes.ok, String(listRes.status));
  const template = (listData.templates ?? []).find(
    (t: { documentType: string }) => t.documentType === documentType
  );
  if (!template) throw new Error(`Keine Vorlage für ${documentType}`);
  assert(`${documentType}: keine PII in Liste`, jsonHasPii(listData).length === 0);

  const detailRes = await api(cookie, `/api/superuser/document-templates/${template.id}`);
  const detail = await detailRes.json();
  assert(`${documentType}: GET detail`, detailRes.ok);
  assert(`${documentType}: keine PII in Detail`, jsonHasPii(detail).length === 0);

  if (!detail.draftRevision) {
    const draftRes = await api(
      cookie,
      `/api/superuser/document-templates/${template.id}/draft`,
      { method: "POST" }
    );
    const draftData = await draftRes.json();
    assert(
      `${documentType}: Draft anlegen`,
      draftRes.ok || draftRes.status === 409,
      draftRes.ok ? "created" : "already exists"
    );
    if (!draftRes.ok && draftRes.status !== 409) {
      throw new Error(draftData.error ?? "Draft fehlgeschlagen");
    }
  }

  const patchRes = await api(
    cookie,
    `/api/superuser/document-templates/${template.id}/draft`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          title: marker,
          bodyText: `${marker} Beschreibungstext für E2E-Test.`,
          styling: { primaryColor: color },
        },
      }),
    }
  );
  const patchData = await patchRes.json();
  assert(`${documentType}: Draft speichern`, patchRes.ok, patchData.draftRevision?.config?.title);

  const previewRes = await api(
    cookie,
    `/api/superuser/document-templates/${template.id}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useDraft: true }),
    }
  );
  const previewBuf = Buffer.from(await previewRes.arrayBuffer());
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `preview-${documentType}.pdf`), previewBuf);
  assert(
    `${documentType}: Vorschau PDF`,
    previewRes.ok && previewBuf.subarray(0, 4).toString() === "%PDF",
    `${previewBuf.length} bytes`
  );
  assert(
    `${documentType}: Vorschau enthält Marker`,
    pdfHasText(previewBuf, marker),
    marker
  );

  const publishRes = await api(
    cookie,
    `/api/superuser/document-templates/${template.id}/publish`,
    { method: "POST" }
  );
  const published = await publishRes.json();
  assert(`${documentType}: Veröffentlichen`, publishRes.ok);
  const revId = published.publishedRevision?.id as number;
  assert(
    `${documentType}: Published enthält Marker`,
    published.publishedRevision?.config?.title === marker
  );
  return revId;
}

async function passExamAndCreateCert(
  employeeCookie: string,
  courseId: string,
  sql: ReturnType<typeof getSql>
): Promise<{ certId: number; templateRevisionId: number | null }> {
  await api(employeeCookie, `/api/training?courseId=${encodeURIComponent(courseId)}`);

  const courseRes = await api(employeeCookie, `/api/training?courseId=${encodeURIComponent(courseId)}`);
  const courseData = await courseRes.json();
  const modules = courseData.course?.modules ?? courseData.modules ?? [];
  for (const mod of modules) {
    await api(employeeCookie, "/api/training/module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, moduleId: mod.id }),
    });
  }

  const qRes = await api(
    employeeCookie,
    `/api/training/exam/questions?courseId=${encodeURIComponent(courseId)}`
  );
  const qData = await qRes.json();
  assert("Prüfung: Fragen laden", qRes.ok, `${qData.total ?? 0} Fragen`);

  const answers: Record<string, number | boolean | number[]> = {};
  const courseRows = await sql`
    SELECT content_json FROM courses WHERE id = ${courseId} LIMIT 1
  `;
  const examPool =
    (courseRows[0]?.content_json as { exam?: ExamQuestion[] } | undefined)?.exam ??
    courseJson.exam;
  for (const q of qData.questions ?? []) {
    const full = examPool.find((x) => x.id === q.id);
    if (full) answers[String(q.id)] = full.correct;
  }

  const submitRes = await api(employeeCookie, "/api/training/exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, answers }),
  });
  const submitData = await submitRes.json();
  assert(
    "Prüfung: bestanden",
    submitRes.ok && submitData.passed,
    submitData.error ?? `Score ${submitData.scorePercent}`
  );
  assert("Prüfung: Zertifikat erstellt", submitData.certificate?.id != null);

  const certRows = await sql`
    SELECT * FROM certificates WHERE id = ${submitData.certificate.id} LIMIT 1
  `;
  const cert = mapCertificate(certRows[0] as Record<string, unknown>);
  return { certId: cert.id, templateRevisionId: cert.templateRevisionId };
}

async function downloadPdf(cookie: string, certId: number): Promise<Buffer> {
  const res = await api(cookie, `/api/certificates/${certId}/pdf`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`E2E Designer-Test → ${BASE}\n`);

  await waitForServer();

  const sql = getSql();
  const adminRow = await sql`
    SELECT u.company_id, c.slug
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.email = ${USERS.admin.email}
    LIMIT 1
  `;
  const employeeRow = await sql`
    SELECT u.company_id, c.slug
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.email = ${USERS.employee.email}
    LIMIT 1
  `;
  const adminCompanyId = Number(adminRow[0]?.company_id);
  const employeeCompanyId = Number(employeeRow[0]?.company_id);
  const adminSlug = String(adminRow[0]?.slug ?? "standard");
  const employeeSlug = String(employeeRow[0]?.slug ?? adminSlug);

  const superCookie = await login(USERS.superuser);
  const adminCookie = await login({
    ...USERS.admin,
    companySlug: adminSlug,
    companyId: adminCompanyId,
  });
  const employeeCookie = await login({
    ...USERS.employee,
    companySlug: employeeSlug,
    companyId: employeeCompanyId,
  });
  const companyRow = await sql`SELECT id FROM companies WHERE slug = 'standard' LIMIT 1`;
  const companyId = Number(companyRow[0]?.id);
  const courseRow = await sql`
    SELECT id FROM courses WHERE company_id = ${companyId} AND slug = 'sozialkonzept' LIMIT 1
  `;
  const courseId = String(courseRow[0]?.id ?? `${companyId}-sozialkonzept`);

  const certMarker = `E2E-Zertifikat-${Date.now()}`;
  const proofMarker = `E2E-Nachweis-${Date.now()}`;

  const publishedCertRevId = await runDesignerFlow(
    superCookie,
    "certificate",
    certMarker,
    "#c0392b"
  );

  await sql`
    UPDATE certificates SET revoked = TRUE
    WHERE user_id = (SELECT id FROM users WHERE email = ${USERS.employee.email} LIMIT 1)
      AND course_id = ${courseId}
      AND revoked = FALSE
  `;
  await sql`
    UPDATE training_attempts SET completed_at = NULL, passed = NULL, score = NULL
    WHERE user_id = (SELECT id FROM users WHERE email = ${USERS.employee.email} LIMIT 1)
      AND course_id = ${courseId}
      AND completed_at IS NOT NULL
  `;
  await sql`
    DELETE FROM training_attempts
    WHERE user_id = (SELECT id FROM users WHERE email = ${USERS.employee.email} LIMIT 1)
      AND course_id = ${courseId}
  `;

  let newCertId: number;
  let newTemplateRevId: number | null;
  try {
    const created = await passExamAndCreateCert(employeeCookie, courseId, sql);
    newCertId = created.certId;
    newTemplateRevId = created.templateRevisionId;
  } catch (e) {
    fail("Prüfungsflow", e instanceof Error ? e.message : String(e));
    newCertId = 0;
    newTemplateRevId = null;
  }

  if (newCertId) {
    assert(
      "template_revision_id gesetzt",
      newTemplateRevId != null,
      String(newTemplateRevId)
    );
    assert(
      "template_revision_id = published Revision",
      newTemplateRevId === publishedCertRevId,
      `expected ${publishedCertRevId}, got ${newTemplateRevId}`
    );

    const pdf = await downloadPdf(employeeCookie, newCertId);
    fs.writeFileSync(path.join(OUT, "new-certificate.pdf"), pdf);
    assert("Neues PDF Download", pdf.subarray(0, 4).toString() === "%PDF");
    assert(
      "Neues PDF nutzt Vorlage (Marker im PDF)",
      pdfHasText(pdf, certMarker),
      certMarker
    );
  }

  const legacyRows = await sql`
    SELECT c.id, c.user_id
    FROM certificates c
    WHERE c.template_revision_id IS NULL AND c.revoked = FALSE
    ORDER BY c.id ASC LIMIT 1
  `;
  if (legacyRows.length > 0) {
    const legacyId = Number(legacyRows[0].id);
    const legacyPdf = await downloadPdf(adminCookie, legacyId);
    fs.writeFileSync(path.join(OUT, "legacy-certificate.pdf"), legacyPdf);
    assert(
      "Legacy PDF (NULL template_revision_id)",
      legacyPdf.subarray(0, 4).toString() === "%PDF",
      `cert #${legacyId} via Admin`
    );
  } else {
    fail("Legacy PDF", "Kein Legacy-Zertifikat gefunden");
  }

  const publishedProofRevId = await runDesignerFlow(
    superCookie,
    "proof",
    proofMarker,
    "#16a085"
  );

  await sql`
    UPDATE courses
    SET requires_certificate = FALSE, requires_proof = TRUE
    WHERE id = ${courseId}
  `;

  const employeeId = (
    await sql`SELECT id FROM users WHERE email = ${USERS.employee.email} LIMIT 1`
  )[0]?.id;

  await sql`
    UPDATE certificates SET revoked = TRUE
    WHERE user_id = ${employeeId} AND course_id = ${courseId} AND revoked = FALSE
  `;

  const { createCertificate } = await import("../src/lib/certificate");
  const proofCert = await createCertificate(Number(employeeId), companyId, courseId, 88);
  assert(
    "Nachweis: template_revision_id gesetzt",
    proofCert.templateRevisionId != null,
    String(proofCert.templateRevisionId)
  );
  assert(
    "Nachweis: korrekte Revision",
    proofCert.templateRevisionId === publishedProofRevId,
    `expected ${publishedProofRevId}`
  );

  const proofPdf = await downloadPdf(employeeCookie, proofCert.id);
  fs.writeFileSync(path.join(OUT, "proof-certificate.pdf"), proofPdf);
  assert("Nachweis PDF", proofPdf.subarray(0, 4).toString() === "%PDF");
  assert(
    "Nachweis PDF enthält Marker",
    pdfHasText(proofPdf, proofMarker),
    proofMarker
  );

  await sql`
    UPDATE courses
    SET requires_certificate = TRUE, requires_proof = TRUE
    WHERE id = ${courseId}
  `;

  const employeeCerts = await sql`
    SELECT id, user_id FROM certificates
    WHERE company_id = ${companyId} AND revoked = FALSE
    ORDER BY id DESC LIMIT 5
  `;
  const ownCertId = Number(
    employeeCerts.find((c) => Number(c.user_id) === Number(employeeId))?.id ??
      newCertId
  );
  const otherCert = employeeCerts.find((c) => Number(c.user_id) !== Number(employeeId));

  if (otherCert) {
    const otherId = Number(otherCert.id);
    const forbidden = await api(employeeCookie, `/api/certificates/${otherId}/pdf`);
    assert(
      "Sicherheit: Mitarbeiter fremdes PDF",
      forbidden.status === 404,
      String(forbidden.status)
    );
    const adminOk = await api(adminCookie, `/api/certificates/${otherId}/pdf`);
    assert(
      "Sicherheit: Admin Firmen-PDF",
      adminOk.ok,
      String(adminOk.status)
    );
  } else {
    pass("Sicherheit: Mitarbeiter/Admin PDF", "Kein zweiter Mitarbeiter – übersprungen");
  }

  if (ownCertId) {
    const superOk = await api(superCookie, `/api/certificates/${ownCertId}/pdf`);
    assert("Sicherheit: Superuser PDF", superOk.ok, String(superOk.status));
  }

  const designerList = await api(superCookie, "/api/superuser/document-templates");
  const designerJson = await designerList.json();
  assert(
    "Sicherheit: Designer ohne Zertifikatsliste",
    !("certificates" in designerJson) && Array.isArray(designerJson.templates),
    `${designerJson.templates?.length ?? 0} Vorlagen`
  );

  await sql.end({ timeout: 2 });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Ergebnis: ${results.length - failed.length}/${results.length} OK ---`);
  if (failed.length > 0) {
    console.error("\nFehlgeschlagen:");
    for (const f of failed) console.error(` - ${f.name}: ${f.detail ?? ""}`);
    process.exit(1);
  }
  console.log(`Artefakte: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

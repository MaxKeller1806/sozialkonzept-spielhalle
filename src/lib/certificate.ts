import { randomUUID } from "crypto";
import { ensureSeeded, getSql } from "./db";
import { mapCertificate, mapUser } from "./db/row-mappers";
import { getCourseMeta } from "./course-db";
import { calculateValidUntil, addMonths } from "./course-validity";
import {
  getDefaultPublishedDocumentTemplateRevision,
  resolveDocumentTypeFromCourseMeta,
} from "./document-template";
import { getCertificateStatus, statusLabel } from "./status";
import type { Certificate, User } from "./types";

export async function nextCertificateNumber(companyId: number): Promise<string> {
  await ensureSeeded();
  const sql = getSql();
  const year = new Date().getFullYear();

  const num = await sql.begin(async (tx) => {
    const existing = await tx`
      SELECT last_number FROM certificate_counters
      WHERE company_id = ${companyId} AND year = ${year}
      FOR UPDATE
    `;

    let next: number;
    if (existing.length > 0) {
      next = Number(existing[0].last_number) + 1;
      await tx`
        UPDATE certificate_counters SET last_number = ${next}
        WHERE company_id = ${companyId} AND year = ${year}
      `;
    } else {
      next = 1;
      await tx`
        INSERT INTO certificate_counters (company_id, year, last_number)
        VALUES (${companyId}, ${year}, ${next})
      `;
    }
    return next;
  });

  return `SK-${year}-${String(num).padStart(6, "0")}`;
}

export { addMonths } from "./course-validity";

export async function createCertificate(
  userId: number,
  companyId: number,
  courseId: string,
  score: number
): Promise<Certificate> {
  const meta = await getCourseMeta(companyId, courseId);
  if (!meta) throw new Error("COURSE_NOT_FOUND");
  await ensureSeeded();
  const sql = getSql();
  const issuedAt = new Date();
  const validUntil = calculateValidUntil(issuedAt, {
    validityType: meta.validityType,
    validityIntervalValue: meta.validityIntervalValue,
    validityIntervalUnit: meta.validityIntervalUnit,
    validityMonths: meta.validityMonths,
  });
  const certificateNumber = await nextCertificateNumber(companyId);
  const verificationToken = randomUUID();
  const documentType = resolveDocumentTypeFromCourseMeta(meta);
  const templateRevision = await getDefaultPublishedDocumentTemplateRevision(
    companyId,
    documentType
  );
  const templateRevisionId = templateRevision?.id ?? null;

  const rows = await sql`
    INSERT INTO certificates (
      certificate_number, user_id, company_id, course_id, issued_at, valid_until,
      score, verification_token, revoked, template_revision_id
    )
    VALUES (
      ${certificateNumber}, ${userId}, ${companyId}, ${courseId},
      ${issuedAt.toISOString()}, ${validUntil ? validUntil.toISOString() : null},
      ${score}, ${verificationToken}, FALSE, ${templateRevisionId}
    )
    RETURNING *
  `;

  return mapCertificate(rows[0] as Record<string, unknown>);
}

export async function getLatestCertificate(
  userId: number,
  courseId?: string
): Promise<Certificate | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = courseId
    ? await sql`
        SELECT * FROM certificates
        WHERE user_id = ${userId} AND course_id = ${courseId} AND revoked = FALSE
        ORDER BY issued_at DESC
        LIMIT 1
      `
    : await sql`
        SELECT * FROM certificates
        WHERE user_id = ${userId} AND revoked = FALSE
        ORDER BY issued_at DESC
        LIMIT 1
      `;
  return rows[0]
    ? mapCertificate(rows[0] as Record<string, unknown>)
    : undefined;
}

export type EmployeeCertificateListRow = {
  id: number;
  certificateNumber: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  validUntil: string | null;
  pdfUrl: string;
};

export async function listUserCertificates(
  userId: number
): Promise<EmployeeCertificateListRow[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      cert.id,
      cert.certificate_number,
      cert.course_id,
      cert.issued_at,
      cert.valid_until,
      c.title AS course_title
    FROM certificates cert
    JOIN courses c ON c.id = cert.course_id
    WHERE cert.user_id = ${userId}
      AND cert.revoked = FALSE
    ORDER BY cert.issued_at DESC
  `) as Record<string, unknown>[];

  return rows.map((row) => {
    const id = Number(row.id);
    return {
      id,
      certificateNumber: String(row.certificate_number),
      courseId: String(row.course_id),
      courseTitle: String(row.course_title),
      issuedAt: new Date(String(row.issued_at)).toISOString(),
      validUntil:
        row.valid_until != null
          ? new Date(String(row.valid_until)).toISOString()
          : null,
      pdfUrl: `/api/certificates/${id}/pdf`,
    };
  });
}

export type AdminCertificateListRow = {
  id: number;
  employeeName: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  validUntil: string | null;
  status: "green" | "yellow" | "red";
  statusLabel: string;
  pdfUrl: string;
};

export async function listCompanyCertificates(
  companyId: number
): Promise<AdminCertificateListRow[]> {
  await ensureSeeded();
  const sql = getSql();

  const rows = (await sql`
    SELECT
      cert.id,
      cert.certificate_number,
      cert.issued_at,
      cert.valid_until,
      cert.revoked,
      c.title AS course_title,
      u.first_name,
      u.last_name
    FROM certificates cert
    JOIN courses c ON c.id = cert.course_id AND c.company_id = ${companyId}
    JOIN users u ON u.id = cert.user_id AND u.company_id = ${companyId}
    WHERE cert.company_id = ${companyId}
      AND u.role = 'employee'
    ORDER BY cert.issued_at DESC
  `) as Record<string, unknown>[];

  return rows.map((row) => {
    const id = Number(row.id);
    const validUntil =
      row.valid_until != null
        ? new Date(String(row.valid_until)).toISOString()
        : null;
    const status = getCertificateStatus({
      validUntil,
      revoked: row.revoked ? 1 : 0,
    });

    return {
      id,
      employeeName: `${String(row.first_name)} ${String(row.last_name)}`.trim(),
      courseTitle: String(row.course_title),
      certificateNumber: String(row.certificate_number),
      issuedAt: new Date(String(row.issued_at)).toISOString(),
      validUntil,
      status,
      statusLabel: statusLabel(status),
      pdfUrl: `/api/certificates/${id}/pdf`,
    };
  });
}

export async function getCertificateByToken(
  token: string
): Promise<Certificate | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM certificates WHERE verification_token = ${token} LIMIT 1
  `;
  return rows[0]
    ? mapCertificate(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function getCertificateForUser(
  userId: number,
  certId: number
): Promise<Certificate | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM certificates WHERE id = ${certId} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0]
    ? mapCertificate(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function getCertificateById(
  certId: number
): Promise<Certificate | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM certificates WHERE id = ${certId} LIMIT 1
  `;
  return rows[0]
    ? mapCertificate(rows[0] as Record<string, unknown>)
    : undefined;
}

export async function getUserForCertificate(
  cert: Certificate
): Promise<User | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM users WHERE id = ${cert.userId} LIMIT 1
  `;
  return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

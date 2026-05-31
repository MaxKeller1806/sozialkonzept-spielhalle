import { randomUUID } from "crypto";
import { ensureSeeded, getSql } from "./db";
import { mapCertificate, mapUser } from "./db/row-mappers";
import { getCourseForContext } from "./course";
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

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function createCertificate(
  userId: number,
  companyId: number,
  courseId: string,
  score: number
): Promise<Certificate> {
  const course = await getCourseForContext(companyId, courseId);
  await ensureSeeded();
  const sql = getSql();
  const issuedAt = new Date();
  const validUntil = addMonths(issuedAt, course.certificateValidityMonths);
  const certificateNumber = await nextCertificateNumber(companyId);
  const verificationToken = randomUUID();

  const rows = await sql`
    INSERT INTO certificates (
      certificate_number, user_id, company_id, course_id, issued_at, valid_until,
      score, verification_token, revoked
    )
    VALUES (
      ${certificateNumber}, ${userId}, ${companyId}, ${courseId},
      ${issuedAt.toISOString()}, ${validUntil.toISOString()},
      ${score}, ${verificationToken}, FALSE
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

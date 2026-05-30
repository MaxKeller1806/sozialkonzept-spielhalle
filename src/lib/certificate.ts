import { randomUUID } from "crypto";
import { ensureSeeded, getSql } from "./db";
import { mapCertificate, mapUser } from "./db/row-mappers";
import { getCourse } from "./course";
import type { Certificate, User } from "./types";

export async function nextCertificateNumber(): Promise<string> {
  await ensureSeeded();
  const sql = getSql();
  const year = new Date().getFullYear();

  const num = await sql.begin(async (tx) => {
    const existing = await tx`
      SELECT last_number FROM certificate_counters WHERE year = ${year} FOR UPDATE
    `;

    let next: number;
    if (existing.length > 0) {
      next = Number(existing[0].last_number) + 1;
      await tx`
        UPDATE certificate_counters SET last_number = ${next} WHERE year = ${year}
      `;
    } else {
      next = 1;
      await tx`
        INSERT INTO certificate_counters (year, last_number) VALUES (${year}, ${next})
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
  score: number
): Promise<Certificate> {
  const course = getCourse();
  await ensureSeeded();
  const sql = getSql();
  const issuedAt = new Date();
  const validUntil = addMonths(issuedAt, course.certificateValidityMonths);
  const certificateNumber = await nextCertificateNumber();
  const verificationToken = randomUUID();

  const rows = await sql`
    INSERT INTO certificates (
      certificate_number, user_id, course_id, issued_at, valid_until,
      score, verification_token, revoked
    )
    VALUES (
      ${certificateNumber}, ${userId}, ${course.courseId},
      ${issuedAt.toISOString()}, ${validUntil.toISOString()},
      ${score}, ${verificationToken}, FALSE
    )
    RETURNING *
  `;

  return mapCertificate(rows[0] as Record<string, unknown>);
}

export async function getLatestCertificate(
  userId: number
): Promise<Certificate | undefined> {
  await ensureSeeded();
  const sql = getSql();
  const rows = await sql`
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
    SELECT id, first_name, last_name, email, birth_date, role, location, active, created_at
    FROM users WHERE id = ${cert.userId} LIMIT 1
  `;
  return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

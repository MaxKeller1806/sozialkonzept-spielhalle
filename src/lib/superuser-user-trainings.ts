import { getSql } from "./db";
import { getCertificateStatus, statusLabel } from "./status";

export interface SuperuserUserTrainingRow {
  courseId: string;
  courseTitle: string;
  status: string;
  certificateId: number | null;
  certificateNumber: string | null;
  validUntil: string | null;
  pdfUrl: string | null;
}

export async function fetchSuperuserUserTrainings(
  userId: number
): Promise<SuperuserUserTrainingRow[] | null> {
  const sql = getSql();

  const userRows = await sql`
    SELECT id FROM users
    WHERE id = ${userId} AND role IN ('admin', 'employee')
    LIMIT 1
  `;
  if (userRows.length === 0) return null;

  const rows = await sql`
    SELECT
      c.id AS course_id,
      c.title AS course_title,
      latest_cert.id AS certificate_id,
      latest_cert.certificate_number,
      latest_cert.valid_until,
      latest_cert.revoked,
      COALESCE(active_attempt.in_progress, FALSE) AS in_progress
    FROM (
      SELECT course_id FROM user_course_assignments WHERE user_id = ${userId}
      UNION
      SELECT course_id FROM certificates WHERE user_id = ${userId}
    ) uc
    JOIN courses c ON c.id = uc.course_id
    LEFT JOIN LATERAL (
      SELECT cert.id, cert.certificate_number, cert.valid_until, cert.revoked
      FROM certificates cert
      WHERE cert.user_id = ${userId} AND cert.course_id = c.id
      ORDER BY cert.issued_at DESC
      LIMIT 1
    ) latest_cert ON TRUE
    LEFT JOIN LATERAL (
      SELECT TRUE AS in_progress
      FROM training_attempts ta
      WHERE ta.user_id = ${userId}
        AND ta.course_id = c.id
        AND ta.completed_at IS NULL
      LIMIT 1
    ) active_attempt ON TRUE
    ORDER BY c.title ASC
  `;

  return rows.map((r) => {
    const certId = r.certificate_id != null ? Number(r.certificate_id) : null;
    const certRevoked = Boolean(r.revoked);
    const validUntilRaw = r.valid_until;
    const inProgress = Boolean(r.in_progress);
    const cert =
      certId && validUntilRaw
        ? {
            validUntil: new Date(String(validUntilRaw)).toISOString(),
            revoked: certRevoked ? 1 : 0,
          }
        : null;

    let status: string;
    if (cert && !certRevoked) {
      status = statusLabel(getCertificateStatus(cert));
    } else if (certRevoked) {
      status = "Ungültig";
    } else if (inProgress) {
      status = "In Bearbeitung";
    } else {
      status = "Nicht begonnen";
    }

    const certificateNumber =
      r.certificate_number != null ? String(r.certificate_number) : null;

    return {
      courseId: String(r.course_id),
      courseTitle: String(r.course_title),
      status,
      certificateId: certId,
      certificateNumber,
      validUntil: validUntilRaw
        ? new Date(String(validUntilRaw)).toISOString()
        : null,
      pdfUrl:
        certId && !certRevoked ? `/api/certificates/${certId}/pdf` : null,
    };
  });
}

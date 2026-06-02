import { getSql } from "./db";

export interface UserDeleteCertificatePreview {
  id: number;
  certificateNumber: string;
  courseTitle: string;
  issuedAt: string;
  validUntil: string | null;
  pdfUrl: string;
}

export interface UserDeletePreview {
  userId: number;
  hasEvidenceData: boolean;
  counts: {
    startedTrainings: number;
    examResults: number;
    certificates: number;
    privacyAcceptances: number;
    feedback: number;
  };
  certificates: UserDeleteCertificatePreview[];
  warningMessage: string | null;
}

export const DELETE_EVIDENCE_WARNING =
  "Dieser Benutzer hat bereits Schulungs- oder Zertifikatsdaten. Beim endgültigen Löschen werden diese Daten ebenfalls gelöscht. Bitte laden Sie vorhandene Zertifikate vorher herunter, falls diese noch benötigt werden.";

export class ConfirmDeleteRequiredError extends Error {
  preview: UserDeletePreview;

  constructor(preview: UserDeletePreview) {
    super("CONFIRM_DELETE_REQUIRED");
    this.name = "ConfirmDeleteRequiredError";
    this.preview = preview;
  }
}

export async function getUserDeletePreview(userId: number): Promise<UserDeletePreview> {
  const sql = getSql();

  const [countRows, certRows] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM training_attempts WHERE user_id = ${userId}) AS started_trainings,
        (SELECT COUNT(*)::int FROM training_attempts
          WHERE user_id = ${userId}
            AND (completed_at IS NOT NULL OR score IS NOT NULL OR passed IS NOT NULL)
        ) AS exam_results,
        (SELECT COUNT(*)::int FROM certificates WHERE user_id = ${userId}) AS certificates,
        (SELECT COUNT(*)::int FROM privacy_policy_acceptances WHERE user_id = ${userId}) AS privacy_acceptances,
        (SELECT COUNT(*)::int FROM feedback WHERE user_id = ${userId}) AS feedback
    `,
    sql`
      SELECT
        c.id,
        c.certificate_number,
        c.issued_at,
        c.valid_until,
        c.revoked,
        COALESCE(co.title, c.course_id) AS course_title
      FROM certificates c
      LEFT JOIN courses co ON co.id = c.course_id
      WHERE c.user_id = ${userId}
      ORDER BY c.issued_at DESC
    `,
  ]);

  const r = countRows[0] ?? {};
  const startedTrainings = Number(r.started_trainings ?? 0);
  const examResults = Number(r.exam_results ?? 0);
  const certificates = Number(r.certificates ?? 0);
  const privacyAcceptances = Number(r.privacy_acceptances ?? 0);
  const feedback = Number(r.feedback ?? 0);

  const hasEvidenceData =
    startedTrainings > 0 ||
    examResults > 0 ||
    certificates > 0 ||
    privacyAcceptances > 0 ||
    feedback > 0;

  const certificateList: UserDeleteCertificatePreview[] = certRows.map((row) => ({
    id: Number(row.id),
    certificateNumber: String(row.certificate_number),
    courseTitle: String(row.course_title),
    issuedAt: new Date(String(row.issued_at)).toISOString(),
    validUntil: row.valid_until
      ? new Date(String(row.valid_until)).toISOString()
      : null,
    pdfUrl: `/api/certificates/${Number(row.id)}/pdf`,
  }));

  return {
    userId,
    hasEvidenceData,
    counts: {
      startedTrainings,
      examResults,
      certificates,
      privacyAcceptances,
      feedback,
    },
    certificates: certificateList,
    warningMessage: hasEvidenceData ? DELETE_EVIDENCE_WARNING : null,
  };
}

export async function permanentlyDeleteUserData(
  userId: number,
  companyId: number
): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM feedback WHERE user_id = ${userId}`;
    await tx`DELETE FROM privacy_policy_acceptances WHERE user_id = ${userId}`;
    await tx`DELETE FROM training_attempts WHERE user_id = ${userId}`;
    await tx`DELETE FROM certificates WHERE user_id = ${userId}`;
    await tx`DELETE FROM user_course_assignments WHERE user_id = ${userId}`;
    const rows = await tx`
      DELETE FROM users
      WHERE id = ${userId} AND company_id = ${companyId} AND role != 'superuser'
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new Error("NOT_FOUND");
    }
  });
}

export async function executePermanentUserDelete(
  userId: number,
  companyId: number,
  confirmDelete: boolean
): Promise<{ action: "deleted"; hadEvidenceData: boolean }> {
  const preview = await getUserDeletePreview(userId);

  if (preview.hasEvidenceData && !confirmDelete) {
    throw new ConfirmDeleteRequiredError(preview);
  }

  await permanentlyDeleteUserData(userId, companyId);
  return { action: "deleted", hadEvidenceData: preview.hasEvidenceData };
}

/** @deprecated Use getUserDeletePreview */
export async function getUserEvidenceSummary(userId: number) {
  const preview = await getUserDeletePreview(userId);
  return {
    hasCertificates: preview.counts.certificates > 0,
    hasTrainingAttempts: preview.counts.startedTrainings > 0,
    hasPrivacyAcceptances: preview.counts.privacyAcceptances > 0,
    hasAny: preview.hasEvidenceData,
    blockReason: preview.hasEvidenceData
      ? "Nachweisdaten vorhanden – Bestätigung erforderlich."
      : null,
  };
}

export async function getUsersPermanentDeleteAllowed(
  userIds: number[]
): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  for (const id of userIds) {
    map.set(id, true);
  }
  return map;
}

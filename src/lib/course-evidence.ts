import { getSql } from "./db";

export interface CourseEvidenceSummary {
  hasCertificates: boolean;
  hasTrainingAttempts: boolean;
  hasAny: boolean;
  certificateCount: number;
  trainingAttemptCount: number;
}

export async function getCourseEvidenceSummary(
  courseId: string
): Promise<CourseEvidenceSummary> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM certificates WHERE course_id = ${courseId}) AS certificates,
      (SELECT COUNT(*)::int FROM training_attempts WHERE course_id = ${courseId}) AS training_attempts
  `;
  const r = rows[0] ?? {};
  const certificateCount = Number(r.certificates ?? 0);
  const trainingAttemptCount = Number(r.training_attempts ?? 0);
  const hasCertificates = certificateCount > 0;
  const hasTrainingAttempts = trainingAttemptCount > 0;
  return {
    hasCertificates,
    hasTrainingAttempts,
    hasAny: hasCertificates || hasTrainingAttempts,
    certificateCount,
    trainingAttemptCount,
  };
}

export async function assertCourseCanBePermanentlyDeleted(
  courseId: string
): Promise<void> {
  const evidence = await getCourseEvidenceSummary(courseId);
  if (evidence.hasAny) {
    throw new Error("HAS_EVIDENCE");
  }
}

import { getSql } from "./db";

export interface CourseEvidenceSummary {
  hasCertificates: boolean;
  hasTrainingAttempts: boolean;
  hasAssignments: boolean;
  hasAny: boolean;
  certificateCount: number;
  trainingAttemptCount: number;
  assignmentCount: number;
}

export async function getCourseEvidenceSummary(
  courseId: string
): Promise<CourseEvidenceSummary> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM certificates WHERE course_id = ${courseId}) AS certificates,
      (SELECT COUNT(*)::int FROM training_attempts WHERE course_id = ${courseId}) AS training_attempts,
      (SELECT COUNT(*)::int FROM user_course_assignments WHERE course_id = ${courseId}) AS assignments
  `;
  const r = rows[0] ?? {};
  const certificateCount = Number(r.certificates ?? 0);
  const trainingAttemptCount = Number(r.training_attempts ?? 0);
  const assignmentCount = Number(r.assignments ?? 0);
  const hasCertificates = certificateCount > 0;
  const hasTrainingAttempts = trainingAttemptCount > 0;
  const hasAssignments = assignmentCount > 0;
  return {
    hasCertificates,
    hasTrainingAttempts,
    hasAssignments,
    hasAny: hasCertificates || hasTrainingAttempts || hasAssignments,
    certificateCount,
    trainingAttemptCount,
    assignmentCount,
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

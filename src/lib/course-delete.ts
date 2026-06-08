import { getCourseMeta, permanentlyDeleteCompanyCourse } from "./course-db";
import { getCourseEvidenceSummary } from "./course-evidence";
import type { CourseDeletePreview } from "./course-delete-shared";

export type { CourseDeletePreview } from "./course-delete-shared";
export { COURSE_PERMANENT_DELETE_WARNING } from "./course-delete-shared";

export async function getCourseDeletePreview(
  companyId: number,
  courseId: string
): Promise<CourseDeletePreview> {
  const meta = await getCourseMeta(companyId, courseId);
  if (!meta) throw new Error("NOT_FOUND");

  const evidence = await getCourseEvidenceSummary(courseId);
  return {
    id: courseId,
    title: meta.title,
    active: meta.active,
    counts: {
      assignments: evidence.assignmentCount,
      trainingAttempts: evidence.trainingAttemptCount,
      certificates: evidence.certificateCount,
    },
    hasDependencies: evidence.hasAny,
  };
}

export async function executePermanentCourseDelete(
  companyId: number,
  courseId: string,
  confirmTitle: string
): Promise<{ hadDependencies: boolean }> {
  const preview = await getCourseDeletePreview(companyId, courseId);
  if (preview.title.trim() !== confirmTitle.trim()) {
    throw new Error("CONFIRM_TITLE_MISMATCH");
  }
  await permanentlyDeleteCompanyCourse(companyId, courseId);
  return { hadDependencies: preview.hasDependencies };
}

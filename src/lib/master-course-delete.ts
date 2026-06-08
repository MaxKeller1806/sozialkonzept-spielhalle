import {
  getMasterCourseDependencySummary,
  getMasterCourseMeta,
  permanentlyDeleteMasterCourse,
} from "./master-course-db";
import type { MasterCourseDeletePreview } from "./course-delete-shared";

export type { MasterCourseDeletePreview } from "./course-delete-shared";
export { MASTER_COURSE_PERMANENT_DELETE_WARNING } from "./course-delete-shared";

export async function getMasterCourseDeletePreview(
  id: string
): Promise<MasterCourseDeletePreview> {
  const meta = await getMasterCourseMeta(id);
  if (!meta) throw new Error("NOT_FOUND");

  const deps = await getMasterCourseDependencySummary(id);
  return {
    id,
    title: meta.title,
    status: meta.status,
    counts: {
      provisions: deps.provisionCount,
      companyCourses: deps.companyCourseCount,
      assignments: deps.assignmentCount,
      trainingAttempts: deps.trainingAttemptCount,
      certificates: deps.certificateCount,
    },
    hasDependencies: deps.hasAny,
  };
}

export async function executePermanentMasterCourseDelete(
  id: string,
  confirmTitle: string
): Promise<{ hadDependencies: boolean }> {
  const preview = await getMasterCourseDeletePreview(id);
  if (preview.title.trim() !== confirmTitle.trim()) {
    throw new Error("CONFIRM_TITLE_MISMATCH");
  }
  await permanentlyDeleteMasterCourse(id);
  return { hadDependencies: preview.hasDependencies };
}

import { getCurrentUser, requireAdmin } from "./auth";
import { isMasterCourseId } from "./course-editor-id";
import { resolveAdminCourse } from "./course-context";
import { getMasterCourseData } from "./master-course-db";

export { isMasterCourseId } from "./course-editor-id";

export type MasterEditorContext = {
  mode: "master";
  masterId: string;
};

export type CompanyEditorContext = {
  mode: "company";
  companyId: number;
  courseId: string;
};

export type CourseEditorContext = MasterEditorContext | CompanyEditorContext;

export function isMasterEditor(ctx: CourseEditorContext): ctx is MasterEditorContext {
  return ctx.mode === "master";
}

/** Superuser bearbeitet Masterkurse ohne Firmen-Freigaben. */
export const MASTER_EDITOR_PERMISSIONS = {
  canEditContent: true,
  canEditTests: true,
  canAddModules: true,
  canDeactivate: true,
  readOnly: false,
  fromMaster: false,
  status: "active" as const,
};

export async function resolveCourseEditor(
  courseId?: string | null
): Promise<CourseEditorContext> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const id = courseId?.trim();
  if (id && isMasterCourseId(id)) {
    if (user.role !== "superuser") throw new Error("FORBIDDEN");
    const course = await getMasterCourseData(id);
    if (!course) throw new Error("COURSE_NOT_FOUND");
    return { mode: "master", masterId: id };
  }

  const admin = await requireAdmin();
  const resolved = await resolveAdminCourse(admin, id);
  return {
    mode: "company",
    companyId: resolved.companyId,
    courseId: resolved.courseId,
  };
}

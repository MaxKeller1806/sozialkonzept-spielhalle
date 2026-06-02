import {
  listCompanyCourses,
  getCourseData as getDbCourse,
  resolveDefaultCompanyCourseId,
} from "./course-db";
import { getCourseForContext } from "./course";
import { requireCompanyId } from "./tenant";
import type { CourseData, SessionUser } from "./types";

export async function resolveAdminCourse(
  user: SessionUser,
  courseId?: string | null
): Promise<{ companyId: number; courseId: string; course: CourseData }> {
  const companyId = requireCompanyId(user);
  const courses = await listCompanyCourses(companyId);
  const id =
    courseId ??
    (await resolveDefaultCompanyCourseId(companyId)) ??
    courses[0]?.id;
  if (!id) throw new Error("NO_COURSE");
  const course = await getCourseForContext(companyId, id, { filterContent: false });
  return { companyId, courseId: id, course };
}

export function courseIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("courseId");
}

export async function resolveEmployeeCourse(
  user: SessionUser,
  courseId?: string | null
): Promise<{ companyId: number; courseId: string; course: CourseData }> {
  if (!user.companyId) throw new Error("FORBIDDEN");
  const companyId = user.companyId;

  if (courseId) {
    const course = await getDbCourse(companyId, courseId);
    if (!course) throw new Error("COURSE_NOT_FOUND");
    return { companyId, courseId, course: await getCourseForContext(companyId, courseId) };
  }

  const { getUserAssignedCourses } = await import("./course-db");
  const assigned = await getUserAssignedCourses(user.id, companyId);
  const id = assigned[0]?.id;
  if (!id) throw new Error("NO_COURSE");
  return {
    companyId,
    courseId: id,
    course: await getCourseForContext(companyId, id),
  };
}

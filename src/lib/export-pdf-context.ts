import { filterCourseForCompany } from "./content-provisions";
import { courseIdFromRequest } from "./course-context";
import {
  isMasterEditor,
  resolveCourseEditor,
} from "./course-editor-context";
import { getCourseMeta } from "./course-db";
import { getCourseForContext } from "./course";
import { getMasterCourseData, getMasterCourseMeta } from "./master-course-db";
import { enrichCourseWithQuestionPool } from "./question-pool-db";
import type { CourseData, CourseMeta, MasterCourseMeta } from "./types";

export type PdfExportCourseContext = {
  course: CourseData;
  meta: CourseMeta | MasterCourseMeta;
  companyId: number | null;
  filterForCompany: boolean;
};

export async function resolveCourseForPdfExport(
  request: Request
): Promise<PdfExportCourseContext> {
  const ctx = await resolveCourseEditor(courseIdFromRequest(request));

  if (isMasterEditor(ctx)) {
    const raw = await getMasterCourseData(ctx.masterId);
    if (!raw) throw new Error("COURSE_NOT_FOUND");
    const meta = await getMasterCourseMeta(ctx.masterId);
    if (!meta) throw new Error("COURSE_NOT_FOUND");
    const course = await enrichCourseWithQuestionPool(raw, null, null);
    return { course, meta, companyId: null, filterForCompany: false };
  }

  const course = await getCourseForContext(ctx.companyId, ctx.courseId, {
    filterContent: false,
  });
  const meta = await getCourseMeta(ctx.companyId, ctx.courseId);
  if (!meta) throw new Error("COURSE_NOT_FOUND");

  return {
    course,
    meta,
    companyId: ctx.companyId,
    filterForCompany: true,
  };
}

export async function resolveFilteredCourseForPdfExport(
  request: Request
): Promise<{ course: CourseData; meta: CourseMeta | MasterCourseMeta; companyId: number | null }> {
  const ctx = await resolveCourseForPdfExport(request);
  const course =
    ctx.filterForCompany && ctx.companyId != null
      ? await filterCourseForCompany(ctx.companyId, ctx.course)
      : ctx.course;
  return { course, meta: ctx.meta, companyId: ctx.companyId };
}

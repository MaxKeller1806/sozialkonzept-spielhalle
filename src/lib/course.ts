import { getCourseData as getDbCourseData, getCourseMeta } from "./course-db";
import { filterCourseForCompany } from "./content-provisions";
import { enrichCourseWithQuestionPool } from "./question-pool-db";
import { getCourseData as getFileCourseData } from "./course-store";
import type { CourseData } from "./types";

export async function getCourseForContext(
  companyId: number,
  courseId: string,
  opts?: { filterContent?: boolean }
): Promise<CourseData> {
  const fromDb = await getDbCourseData(companyId, courseId);
  if (!fromDb) throw new Error("COURSE_NOT_FOUND");
  const meta = await getCourseMeta(companyId, courseId);
  const enriched = await enrichCourseWithQuestionPool(
    fromDb,
    companyId,
    meta?.masterCourseId
  );
  if (opts?.filterContent === false) return enriched;
  return filterCourseForCompany(companyId, enriched);
}

/** Fallback für Seed – liest aus Datei wenn DB noch leer */
export function getCourseFromFile(): CourseData {
  return getFileCourseData();
}

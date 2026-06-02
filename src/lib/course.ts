import { getCourseData as getDbCourseData } from "./course-db";
import { filterCourseForCompany } from "./content-provisions";
import { getCourseData as getFileCourseData } from "./course-store";
import type { CourseData } from "./types";

export async function getCourseForContext(
  companyId: number,
  courseId: string,
  opts?: { filterContent?: boolean }
): Promise<CourseData> {
  const fromDb = await getDbCourseData(companyId, courseId);
  if (!fromDb) throw new Error("COURSE_NOT_FOUND");
  if (opts?.filterContent === false) return fromDb;
  return filterCourseForCompany(companyId, fromDb);
}

/** Fallback für Seed – liest aus Datei wenn DB noch leer */
export function getCourseFromFile(): CourseData {
  return getFileCourseData();
}

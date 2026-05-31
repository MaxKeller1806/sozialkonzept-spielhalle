import { getCourseData as getDbCourseData } from "./course-db";
import { getCourseData as getFileCourseData } from "./course-store";
import type { CourseData } from "./types";

export async function getCourseForContext(
  companyId: number,
  courseId: string
): Promise<CourseData> {
  const fromDb = await getDbCourseData(companyId, courseId);
  if (fromDb) return fromDb;
  throw new Error("COURSE_NOT_FOUND");
}

/** Fallback für Seed – liest aus Datei wenn DB noch leer */
export function getCourseFromFile(): CourseData {
  return getFileCourseData();
}

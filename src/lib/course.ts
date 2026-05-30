import type { CourseData } from "./types";
import { getCourseData } from "./course-store";

export function getCourse(): CourseData {
  return getCourseData();
}

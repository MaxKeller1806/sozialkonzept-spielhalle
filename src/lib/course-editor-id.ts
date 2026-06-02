export function isMasterCourseId(courseId: string): boolean {
  return courseId.startsWith("master-");
}

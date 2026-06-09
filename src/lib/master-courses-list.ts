import {
  listMasterCoursesMetadata,
  type MasterCourseListItem,
} from "./master-course-db";
import {
  buildListMeta,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import {
  parseCourseListFilters,
  type CourseListFilters,
} from "./course-hierarchy";

export const MASTER_COURSE_SORT_KEYS = [
  "title",
  "status",
  "createdAt",
  "updatedAt",
] as const;

function sortMasterCourses(
  courses: MasterCourseListItem[],
  sortBy: string,
  sortDirection: "asc" | "desc"
): MasterCourseListItem[] {
  const dir = sortDirection === "desc" ? -1 : 1;
  const sorted = [...courses];
  sorted.sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (sortBy) {
      case "status":
        av = a.status;
        bv = b.status;
        break;
      case "createdAt":
        av = a.createdAt;
        bv = b.createdAt;
        break;
      case "updatedAt":
        av = a.updatedAt;
        bv = b.updatedAt;
        break;
      default:
        av = a.title;
        bv = b.title;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return sorted;
}

export async function listMasterCoursesPaginated(
  query: ListQueryState,
  hierarchyFilters?: CourseListFilters
): Promise<{ courses: MasterCourseListItem[]; meta: ListMeta }> {
  let courses = await listMasterCoursesMetadata(hierarchyFilters);

  if (query.status === "active") {
    courses = courses.filter((c) => c.status !== "disabled");
  } else if (query.status === "archived") {
    courses = courses.filter((c) => c.status === "disabled");
  }

  const search = query.search.trim().toLowerCase();
  if (search) {
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        (c.description?.toLowerCase().includes(search) ?? false) ||
        (c.topics?.some((t) => t.name.toLowerCase().includes(search)) ?? false)
    );
  }

  if (
    query.sortBy &&
    MASTER_COURSE_SORT_KEYS.includes(
      query.sortBy as (typeof MASTER_COURSE_SORT_KEYS)[number]
    )
  ) {
    courses = sortMasterCourses(courses, query.sortBy, query.sortDirection);
  }

  const total = courses.length;
  const paged = courses.slice(query.offset, query.offset + query.pageSize);

  return {
    courses: paged,
    meta: buildListMeta(query, total),
  };
}

export function masterCourseHierarchyFromParams(
  params: URLSearchParams
): CourseListFilters {
  return parseCourseListFilters(params);
}

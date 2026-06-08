import { listCompanyCourses } from "./course-db";
import { formatValidityRuleLabel } from "./course-validity";
import {
  buildListMeta,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import type { CourseListFilters } from "./course-hierarchy";
import type { CourseMeta } from "./types";

export const ADMIN_COURSE_SORT_KEYS = [
  "title",
  "slug",
  "active",
  "createdAt",
] as const;

type AdminCourseRow = CourseMeta & {
  validityLabel: string;
};

function sortCourses(
  courses: AdminCourseRow[],
  sortBy: string,
  sortDirection: "asc" | "desc"
): AdminCourseRow[] {
  const dir = sortDirection === "desc" ? -1 : 1;
  const sorted = [...courses];
  sorted.sort((a, b) => {
    let av: string | number | boolean = "";
    let bv: string | number | boolean = "";
    switch (sortBy) {
      case "slug":
        av = a.slug;
        bv = b.slug;
        break;
      case "active":
        av = a.active ? 1 : 0;
        bv = b.active ? 1 : 0;
        break;
      case "createdAt":
        av = a.createdAt ?? "";
        bv = b.createdAt ?? "";
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

export async function listAdminCoursesPaginated(
  companyId: number,
  query: ListQueryState,
  hierarchyFilters?: CourseListFilters
): Promise<{ courses: AdminCourseRow[]; meta: ListMeta }> {
  const raw = await listCompanyCourses(
    companyId,
    query.status,
    hierarchyFilters
  );

  let courses: AdminCourseRow[] = raw.map((c) => ({
    ...c,
    validityLabel: formatValidityRuleLabel({
      validityType: c.validityType,
      validityIntervalValue: c.validityIntervalValue,
      validityIntervalUnit: c.validityIntervalUnit,
      validityMonths: c.validityMonths,
    }),
  }));

  const search = query.search.trim().toLowerCase();
  if (search) {
    courses = courses.filter(
      (c) =>
        c.title.toLowerCase().includes(search) ||
        c.slug.toLowerCase().includes(search)
    );
  }

  if (
    query.sortBy &&
    ADMIN_COURSE_SORT_KEYS.includes(
      query.sortBy as (typeof ADMIN_COURSE_SORT_KEYS)[number]
    )
  ) {
    courses = sortCourses(courses, query.sortBy, query.sortDirection);
  }

  const total = courses.length;
  const paged = courses.slice(query.offset, query.offset + query.pageSize);

  return {
    courses: paged,
    meta: buildListMeta(query, total),
  };
}

import type { ValidityType } from "./course-validity";

/** Ebene 1 – Hauptkategorien (erweiterbar). */
export const MAIN_CATEGORIES = {
  SOZIAL: "Sozialkonzept",
  SAFETY: "Sicherheitskonzept",
  SPECIALIST: "Fachschulungen",
} as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[keyof typeof MAIN_CATEGORIES];

export type CourseListSort =
  | "name"
  | "code"
  | "createdAt"
  | "updatedAt"
  | "validity";

export type CourseListFilters = {
  mainCategory?: string;
  seminar?: string;
  validityType?: ValidityType;
  active?: boolean;
  requiresCertificate?: boolean;
  requiresProof?: boolean;
  sort?: CourseListSort;
  sortDir?: "asc" | "desc";
};

export type CourseHierarchyItem = {
  id: string;
  title: string;
  fullTitle?: string;
  code?: string | null;
  instructionTitle?: string | null;
  mainCategory?: string | null;
  seminar?: string | null;
  sortOrder?: number;
  slug: string;
  estimatedDurationMinutes?: number | null;
  inProgress?: boolean;
  seminarStatusLabel?: string;
  certificate?: {
    id: number;
    validUntil: string | null;
    status: "green" | "yellow" | "red";
  } | null;
};

export type CourseHierarchySeminar = {
  name: string;
  /** Seminar-Kurse ohne Unterweisungscode (z. B. Sozialkonzept). */
  courses: CourseHierarchyItem[];
  /** BAV-Unterweisungen (Ebene 3). */
  instructions: CourseHierarchyItem[];
};

export type CourseHierarchyMain = {
  name: string;
  seminars: CourseHierarchySeminar[];
};

export function parseCourseListFilters(
  params: URLSearchParams
): CourseListFilters {
  const filters: CourseListFilters = {};
  const mainCategory = params.get("mainCategory");
  const seminar = params.get("seminar");
  const validityType = params.get("validityType");
  const active = params.get("active");
  const requiresCertificate = params.get("requiresCertificate");
  const requiresProof = params.get("requiresProof");
  const sort = params.get("sort");
  const sortDir = params.get("sortDir");

  if (mainCategory) filters.mainCategory = mainCategory;
  if (seminar) filters.seminar = seminar;
  if (
    validityType === "once" ||
    validityType === "unlimited" ||
    validityType === "half_yearly" ||
    validityType === "yearly" ||
    validityType === "custom"
  ) {
    filters.validityType = validityType;
  }
  if (active === "true") filters.active = true;
  if (active === "false") filters.active = false;
  if (requiresCertificate === "true") filters.requiresCertificate = true;
  if (requiresCertificate === "false") filters.requiresCertificate = false;
  if (requiresProof === "true") filters.requiresProof = true;
  if (requiresProof === "false") filters.requiresProof = false;
  if (
    sort === "name" ||
    sort === "code" ||
    sort === "createdAt" ||
    sort === "updatedAt" ||
    sort === "validity"
  ) {
    filters.sort = sort;
  }
  if (sortDir === "asc" || sortDir === "desc") filters.sortDir = sortDir;

  return filters;
}

/** Mitarbeiteransicht: Hauptkategorie → Seminar → Unterweisung. */
export function groupCoursesForEmployeeView(courses: CourseHierarchyItem[]): {
  uncategorized: CourseHierarchyItem[];
  hierarchies: CourseHierarchyMain[];
} {
  const uncategorized: CourseHierarchyItem[] = [];
  const byMain = new Map<string, Map<string, CourseHierarchySeminar>>();

  for (const course of courses) {
    if (!course.mainCategory) {
      uncategorized.push(course);
      continue;
    }

    if (!byMain.has(course.mainCategory)) {
      byMain.set(course.mainCategory, new Map());
    }
    const bySeminar = byMain.get(course.mainCategory)!;
    const seminarName = course.seminar?.trim() || "Allgemein";

    if (!bySeminar.has(seminarName)) {
      bySeminar.set(seminarName, {
        name: seminarName,
        courses: [],
        instructions: [],
      });
    }

    const bucket = bySeminar.get(seminarName)!;
    if (course.code) {
      bucket.instructions.push(course);
    } else {
      bucket.courses.push(course);
    }
  }

  for (const seminarMap of byMain.values()) {
    for (const seminar of seminarMap.values()) {
      seminar.instructions.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
      seminar.courses.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
  }

  const hierarchies: CourseHierarchyMain[] = [...byMain.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "de"))
    .map(([name, seminarMap]) => {
      const seminars = [...seminarMap.values()].sort((a, b) => {
        const minA = Math.min(
          ...[...a.instructions, ...a.courses].map((c) => c.sortOrder ?? 0),
          0
        );
        const minB = Math.min(
          ...[...b.instructions, ...b.courses].map((c) => c.sortOrder ?? 0),
          0
        );
        return minA - minB || a.name.localeCompare(b.name, "de");
      });
      return { name, seminars };
    });

  return { uncategorized, hierarchies };
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  listCompanyCourses,
  createCompanyCourse,
} from "@/lib/course-db";
import {
  listCompanyProvisions,
  provisionPermissions,
} from "@/lib/course-provisions";
import { formatValidityRuleLabel } from "@/lib/course-validity";
import { parseCourseListFilters, MAIN_CATEGORIES } from "@/lib/course-hierarchy";
import { listAssignableCourseTopics } from "@/lib/course-topics";
import {
  listAdminCoursesPaginated,
  ADMIN_COURSE_SORT_KEYS,
} from "@/lib/admin-courses-list";
import { parseListQueryFromUrl } from "@/lib/list-query";
import type { UserListFilter } from "@/lib/tenant";
import {
  isDbConnectionError,
  postgresErrorFields,
  resetSqlOnFailure,
  withDbQuery,
} from "@/lib/db";

function parseFilter(value: string | null): UserListFilter {
  if (value === "active" || value === "archived") return value;
  return "all";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const queryContext = {
    path: "/api/admin/courses",
    filter: params.get("filter"),
    page: params.get("page"),
    search: params.get("search"),
    sortBy: params.get("sortBy"),
  };

  try {
    const user = await requireAdmin();
    const hierarchyFilters = parseCourseListFilters(params);

    if (
      params.has("filter") &&
      !params.has("page") &&
      !params.has("search") &&
      !params.has("sortBy")
    ) {
      const filter = parseFilter(params.get("filter"));
      const courses = await withDbQuery(() =>
        listCompanyCourses(user.companyId!, filter, hierarchyFilters)
      );
      const provisions = await withDbQuery(() =>
        listCompanyProvisions(user.companyId!)
      );
      const byCourse = new Map(provisions.map((p) => [p.courseId, p]));

      let topics: Awaited<ReturnType<typeof listAssignableCourseTopics>> = [];
      try {
        topics = await withDbQuery(() =>
          listAssignableCourseTopics(user.companyId!)
        );
      } catch (topicsErr) {
        console.error("[admin/courses] listAssignableCourseTopics failed", {
          ...postgresErrorFields(topicsErr),
          companyId: user.companyId,
          ...queryContext,
        });
      }

      return NextResponse.json({
        courses: courses.map((c) => ({
          ...c,
          validityLabel: formatValidityRuleLabel({
            validityType: c.validityType,
            validityIntervalValue: c.validityIntervalValue,
            validityIntervalUnit: c.validityIntervalUnit,
            validityMonths: c.validityMonths,
          }),
          permissions: provisionPermissions(byCourse.get(c.id)),
        })),
        filter,
        total: courses.length,
        mainCategories: Object.values(MAIN_CATEGORIES),
        topics,
      });
    }

    const query = parseListQueryFromUrl(params, {
      sortBy: "title",
      sortDirection: "asc",
      status: "active",
    });
    const result = await withDbQuery(() =>
      listAdminCoursesPaginated(user.companyId!, query, hierarchyFilters)
    );
    const provisions = await withDbQuery(() =>
      listCompanyProvisions(user.companyId!)
    );
    const byCourse = new Map(provisions.map((p) => [p.courseId, p]));

    let topics: Awaited<ReturnType<typeof listAssignableCourseTopics>> = [];
    try {
      topics = await withDbQuery(() =>
        listAssignableCourseTopics(user.companyId!)
      );
    } catch (topicsErr) {
      console.error("[admin/courses] listAssignableCourseTopics failed", {
        ...postgresErrorFields(topicsErr),
        companyId: user.companyId,
        ...queryContext,
      });
    }

    return NextResponse.json({
      courses: result.courses.map((c) => ({
        ...c,
        permissions: provisionPermissions(byCourse.get(c.id)),
      })),
      meta: result.meta,
      sortFields: ADMIN_COURSE_SORT_KEYS,
      mainCategories: Object.values(MAIN_CATEGORIES),
      topics,
    });
  } catch (e) {
    await resetSqlOnFailure(e);
    const errFields = postgresErrorFields(e);
    console.error("[admin/courses] GET failed", {
      ...errFields,
      ...queryContext,
    });

    const msg = errFields.message;
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Seminare konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { title, slug, description, withTemplate } = await request.json();

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Titel und Kurzname erforderlich." },
        { status: 400 }
      );
    }

    const course = await createCompanyCourse(user.companyId!, {
      title: String(title).trim(),
      slug: String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      description: description ? String(description) : undefined,
      withTemplate: withTemplate !== false,
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

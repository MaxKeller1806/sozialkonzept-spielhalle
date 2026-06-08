import { NextResponse } from "next/server";
import { requireSuperuser, getCurrentUser } from "@/lib/auth";
import { isDbConnectionError, resetSqlOnFailure, withDbQuery } from "@/lib/db";
import { assignMasterToAllCompanies } from "@/lib/course-provisions";
import {
  createMasterCourse,
  importExistingCoursesAsMasters,
  listMasterCoursesMetadata,
} from "@/lib/master-course-db";
import {
  MAIN_CATEGORIES,
  parseCourseListFilters,
} from "@/lib/course-hierarchy";
import {
  listMasterCoursesPaginated,
  MASTER_COURSE_SORT_KEYS,
} from "@/lib/master-courses-list";
import { parseListQueryFromUrl } from "@/lib/list-query";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await requireSuperuser();
    const params = new URL(request.url).searchParams;
    const hierarchyFilters = parseCourseListFilters(params);

    if (
      !params.has("page") &&
      !params.has("search") &&
      !params.has("sortBy") &&
      Object.keys(hierarchyFilters).length === 0
    ) {
      const courses = await withDbQuery(() =>
        listMasterCoursesMetadata(hierarchyFilters)
      );
      return NextResponse.json({
        courses,
        mainCategories: Object.values(MAIN_CATEGORIES),
      });
    }

    const query = parseListQueryFromUrl(params, {
      sortBy: "title",
      sortDirection: "asc",
    });
    const result = await withDbQuery(() =>
      listMasterCoursesPaginated(query, hierarchyFilters)
    );
    return NextResponse.json({
      courses: result.courses,
      meta: result.meta,
      sortFields: MASTER_COURSE_SORT_KEYS,
      mainCategories: Object.values(MAIN_CATEGORIES),
    });
  } catch (e) {
    console.error("[superuser/master-courses] GET:", e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
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
      { error: msg.includes("master_courses") ? "Migration fehlt: npm run db:migrate" : msg || "Fehler." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();

    if (body.action === "importExisting") {
      const imported = await importExistingCoursesAsMasters();
      const courses = await listMasterCoursesMetadata();
      return NextResponse.json({ imported, courses });
    }

    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: "Titel und Kurzname erforderlich." },
        { status: 400 }
      );
    }

    const course = await createMasterCourse({
      title: String(body.title).trim(),
      slug: String(body.slug).trim(),
      description: body.description ? String(body.description) : undefined,
    });

    if (body.assignToAll === true) {
      const superuser = await getCurrentUser();
      await assignMasterToAllCompanies(course.id, superuser?.id ?? null, {
        canEditContent: body.canEditContent === true,
        canEditTests: body.canEditTests === true,
        canAddModules: body.canAddModules === true,
        canDeactivate: body.canDeactivate === true,
      });
    }

    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    console.error("[superuser/master-courses] POST:", e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg.includes("master_courses") ? "Migration fehlt: npm run db:migrate" : msg || "Anlegen fehlgeschlagen." },
      { status: 500 }
    );
  }
}

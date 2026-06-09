import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { isDbConnectionError, resetSqlOnFailure, withDbQuery } from "@/lib/db";
import {
  COURSE_TOPIC_SORT_ALLOWLIST,
  createGlobalCourseTopic,
  listCourseTopicsPaginated,
  listGlobalCourseTopicOptions,
  parseCourseTopicListQuery,
} from "@/lib/course-topics";

export const dynamic = "force-dynamic";

function parseFilter(value: string | null): "active" | "archived" | "all" {
  if (value === "archived" || value === "all") return value;
  return "active";
}

export async function GET(request: Request) {
  try {
    await requireSuperuser();
    const params = new URL(request.url).searchParams;

    if (
      params.has("filter") &&
      !params.has("page") &&
      !params.has("search") &&
      !params.has("sortBy")
    ) {
      const filter = parseFilter(params.get("filter"));
      const topics = await withDbQuery(() =>
        listGlobalCourseTopicOptions(filter === "active")
      );
      return NextResponse.json({ topics, filter });
    }

    const query = parseCourseTopicListQuery(params);
    const result = await withDbQuery(() =>
      listCourseTopicsPaginated("global", null, query)
    );
    return NextResponse.json({
      topics: result.topics,
      meta: result.meta,
      sortFields: Object.keys(COURSE_TOPIC_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error("[superuser/course-topics] GET:", e);
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
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    }
    const topic = await createGlobalCourseTopic({
      name: String(body.name),
      slug: body.slug ? String(body.slug) : undefined,
      description: body.description != null ? String(body.description) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      active: body.active !== false,
    });
    return NextResponse.json({ topic }, { status: 201 });
  } catch (e) {
    console.error("[superuser/course-topics] POST:", e);
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
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

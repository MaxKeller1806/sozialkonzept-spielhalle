import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isDbConnectionError, resetSqlOnFailure, withDbQuery } from "@/lib/db";
import {
  createCompanyCourseTopic,
  listAssignableCourseTopics,
} from "@/lib/course-topics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const activeOnly = params.get("filter") !== "all";
    const topics = await withDbQuery(() =>
      listAssignableCourseTopics(admin.companyId!, activeOnly)
    );
    return NextResponse.json({ topics });
  } catch (e) {
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
    const admin = await requireAdmin();
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    }
    const topic = await createCompanyCourseTopic(admin.companyId!, {
      name: String(body.name),
      slug: body.slug ? String(body.slug) : undefined,
      description: body.description != null ? String(body.description) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      active: body.active !== false,
    });
    return NextResponse.json({ topic }, { status: 201 });
  } catch (e) {
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

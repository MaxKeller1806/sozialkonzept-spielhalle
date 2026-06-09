import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { isDbConnectionError, resetSqlOnFailure } from "@/lib/db";
import { getCourseTopic, updateCourseTopic } from "@/lib/course-topics";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const topicId = Number(id);
    const body = await request.json();

    const topic = await updateCourseTopic(
      topicId,
      {
        name: body.name != null ? String(body.name) : undefined,
        slug: body.slug != null ? String(body.slug) : undefined,
        description:
          body.description !== undefined
            ? body.description != null
              ? String(body.description)
              : null
            : undefined,
        sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
      },
      { globalOnly: true }
    );

    return NextResponse.json({ topic });
  } catch (e) {
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    if (msg === "FORBIDDEN" || msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const topic = await getCourseTopic(Number(id));
    if (!topic) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ topic });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

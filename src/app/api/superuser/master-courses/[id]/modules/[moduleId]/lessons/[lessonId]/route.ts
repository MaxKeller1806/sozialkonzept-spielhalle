import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateLesson } from "@/lib/course-validation";
import { deleteLesson, getLesson, getModule, saveLesson } from "@/lib/master-course-db";
import type { Lesson } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId, lessonId } = await params;
    const lesson = await getLesson(id, Number(moduleId), Number(lessonId));
    if (!lesson) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ lesson, moduleId: Number(moduleId) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId, lessonId } = await params;
    const mid = Number(moduleId);

    if (!(await getModule(id, mid))) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const lesson: Lesson = {
      id: Number(lessonId),
      title: String(body.title ?? "").trim(),
      content: String(body.content ?? "").trim(),
      blocks: body.blocks,
    };

    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!(await getLesson(id, mid, lesson.id))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    await saveLesson(id, mid, lesson);
    return NextResponse.json({ lesson });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId, lessonId } = await params;
    const ok = await deleteLesson(id, Number(moduleId), Number(lessonId));
    if (!ok) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

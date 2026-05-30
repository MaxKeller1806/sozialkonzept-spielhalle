import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateLesson } from "@/lib/course-validation";
import { deleteLesson, getLesson, getModule, saveLesson } from "@/lib/course-store";
import type { Lesson } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    await requireUser("admin");
    const { id, lessonId } = await params;
    const lesson = getLesson(Number(id), Number(lessonId));
    if (!lesson) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ lesson, moduleId: Number(id) });
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
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    await requireUser("admin");
    const { id, lessonId } = await params;
    const moduleId = Number(id);

    if (!getModule(moduleId)) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const lesson: Lesson = {
      id: Number(lessonId),
      title: String(body.title ?? "").trim(),
      content: String(body.content ?? "").trim(),
    };

    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!getLesson(moduleId, lesson.id)) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    saveLesson(moduleId, lesson);
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
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    await requireUser("admin");
    const { id, lessonId } = await params;
    const ok = deleteLesson(Number(id), Number(lessonId));
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

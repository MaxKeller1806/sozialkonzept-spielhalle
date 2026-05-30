import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateLesson } from "@/lib/course-validation";
import { getModule, nextLessonId, saveLesson } from "@/lib/course-store";
import type { Lesson } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("admin");
    const { id } = await params;
    const moduleId = Number(id);

    if (!getModule(moduleId)) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const lesson: Lesson = {
      id: body.id ?? nextLessonId(moduleId),
      title: String(body.title ?? "").trim(),
      content: String(body.content ?? "").trim(),
    };

    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    saveLesson(moduleId, lesson);
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

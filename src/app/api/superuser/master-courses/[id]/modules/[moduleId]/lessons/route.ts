import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateLesson } from "@/lib/course-validation";
import { getModule, nextLessonId, saveLesson } from "@/lib/master-course-db";
import type { Lesson } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId } = await params;
    const mid = Number(moduleId);

    if (!(await getModule(id, mid))) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const lesson: Lesson = {
      id: body.id ?? (await nextLessonId(id, mid)),
      title: String(body.title ?? "").trim(),
      content: String(body.content ?? "").trim(),
      blocks: body.blocks,
    };

    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    await saveLesson(id, mid, lesson);
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { validateLesson } from "@/lib/course-validation";
import { deleteLesson, getLesson, getModule, saveLesson } from "@/lib/course-db";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import { normalizeLessonForSave } from "@/lib/lesson-blocks";
import type { Lesson } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id, lessonId } = await params;
    const lesson = await getLesson(
      companyId,
      courseId,
      Number(id),
      Number(lessonId)
    );
    if (!lesson) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ lesson, moduleId: Number(id) });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
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
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id, lessonId } = await params;
    const moduleId = Number(id);
    await assertCourseEditable(companyId, courseId, "content");

    if (!(await getModule(companyId, courseId, moduleId))) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const lesson = normalizeLessonForSave({
      id: Number(lessonId),
      title: String(body.title ?? ""),
      content: body.content,
      blocks: body.blocks,
    });

    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!(await getLesson(companyId, courseId, moduleId, lesson.id))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    await saveLesson(companyId, courseId, moduleId, lesson);
    return NextResponse.json({ lesson });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id, lessonId } = await params;
    await assertCourseEditable(companyId, courseId, "content");
    const ok = await deleteLesson(
      companyId,
      courseId,
      Number(id),
      Number(lessonId)
    );
    if (!ok) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

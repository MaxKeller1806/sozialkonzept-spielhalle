import { NextResponse } from "next/server";
import { validateLesson } from "@/lib/course-validation";
import {
  deleteLesson as deleteCompanyLesson,
  getLesson as getCompanyLesson,
  getModule as getCompanyModule,
  saveLesson as saveCompanyLesson,
} from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import { normalizeLessonForSave } from "@/lib/lesson-blocks";
import {
  deleteLesson as deleteMasterLesson,
  getLesson as getMasterLesson,
  getModule as getMasterModule,
  saveLesson as saveMasterLesson,
} from "@/lib/master-course-db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id, lessonId } = await params;
    const moduleId = Number(id);
    const lid = Number(lessonId);

    const lesson = isMasterEditor(ctx)
      ? await getMasterLesson(ctx.masterId, moduleId, lid)
      : await getCompanyLesson(ctx.companyId, ctx.courseId, moduleId, lid);

    if (!lesson) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ lesson, moduleId });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
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
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id, lessonId } = await params;
    const moduleId = Number(id);
    const lid = Number(lessonId);
    const body = await request.json();
    const lesson = normalizeLessonForSave({
      id: lid,
      title: String(body.title ?? ""),
      content: body.content,
      blocks: body.blocks,
    });
    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (isMasterEditor(ctx)) {
      if (!(await getMasterModule(ctx.masterId, moduleId))) {
        return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
      }
      if (!(await getMasterLesson(ctx.masterId, moduleId, lid))) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      await saveMasterLesson(ctx.masterId, moduleId, lesson);
      return NextResponse.json({ lesson });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "content");
    if (!(await getCompanyModule(ctx.companyId, ctx.courseId, moduleId))) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }
    if (!(await getCompanyLesson(ctx.companyId, ctx.courseId, moduleId, lid))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    await saveCompanyLesson(ctx.companyId, ctx.courseId, moduleId, lesson);
    return NextResponse.json({ lesson });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
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
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id, lessonId } = await params;
    const moduleId = Number(id);
    const lid = Number(lessonId);

    if (isMasterEditor(ctx)) {
      const ok = await deleteMasterLesson(ctx.masterId, moduleId, lid);
      if (!ok) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "content");
    const ok = await deleteCompanyLesson(ctx.companyId, ctx.courseId, moduleId, lid);
    if (!ok) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

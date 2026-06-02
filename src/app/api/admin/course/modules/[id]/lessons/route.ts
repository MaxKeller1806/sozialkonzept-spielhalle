import { NextResponse } from "next/server";
import { validateLesson } from "@/lib/course-validation";
import {
  getModule as getCompanyModule,
  nextLessonId as nextCompanyLessonId,
  saveLesson as saveCompanyLesson,
} from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import { normalizeLessonForSave } from "@/lib/lesson-blocks";
import {
  getModule as getMasterModule,
  nextLessonId as nextMasterLessonId,
  saveLesson as saveMasterLesson,
} from "@/lib/master-course-db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const moduleId = Number(id);
    const body = await request.json();

    if (isMasterEditor(ctx)) {
      if (!(await getMasterModule(ctx.masterId, moduleId))) {
        return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
      }
      const lesson = normalizeLessonForSave({
        id: body.id ?? (await nextMasterLessonId(ctx.masterId, moduleId)),
        title: String(body.title ?? ""),
        content: body.content,
        blocks: body.blocks,
      });
      const error = validateLesson(lesson);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      await saveMasterLesson(ctx.masterId, moduleId, lesson);
      return NextResponse.json({ lesson }, { status: 201 });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "content");
    if (!(await getCompanyModule(ctx.companyId, ctx.courseId, moduleId))) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }
    const lesson = normalizeLessonForSave({
      id: body.id ?? (await nextCompanyLessonId(ctx.companyId, ctx.courseId, moduleId)),
      title: String(body.title ?? ""),
      content: body.content,
      blocks: body.blocks,
    });
    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    await saveCompanyLesson(ctx.companyId, ctx.courseId, moduleId, lesson);
    return NextResponse.json({ lesson }, { status: 201 });
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

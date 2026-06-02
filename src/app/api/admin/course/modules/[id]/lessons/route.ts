import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { validateLesson } from "@/lib/course-validation";
import { getModule, nextLessonId, saveLesson } from "@/lib/course-db";
import { normalizeLessonForSave } from "@/lib/lesson-blocks";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id } = await params;
    const moduleId = Number(id);
    await assertCourseEditable(companyId, courseId, "content");

    if (!(await getModule(companyId, courseId, moduleId))) {
      return NextResponse.json({ error: "Modul nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const lesson = normalizeLessonForSave({
      id: body.id ?? (await nextLessonId(companyId, courseId, moduleId)),
      title: String(body.title ?? ""),
      content: body.content,
      blocks: body.blocks,
    });

    const error = validateLesson(lesson);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    await saveLesson(companyId, courseId, moduleId, lesson);
    return NextResponse.json({ lesson }, { status: 201 });
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

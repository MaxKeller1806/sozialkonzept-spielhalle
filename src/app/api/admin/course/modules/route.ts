import { NextResponse } from "next/server";
import { validateModule } from "@/lib/course-validation";
import { nextModuleId, saveModule as saveCompanyModule } from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import {
  nextModuleId as nextMasterModuleId,
  saveModule as saveMasterModule,
} from "@/lib/master-course-db";
import type { CourseModule } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const body = await request.json();

    if (isMasterEditor(ctx)) {
      const module: CourseModule = {
        id: body.id ?? (await nextMasterModuleId(ctx.masterId)),
        title: String(body.title ?? "").trim(),
        duration: Number(body.duration) || 0,
        lessons: [],
      };
      const error = validateModule(module);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      await saveMasterModule(ctx.masterId, module);
      return NextResponse.json({ module }, { status: 201 });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "add_modules");
    const module: CourseModule = {
      id: body.id ?? (await nextModuleId(ctx.companyId, ctx.courseId)),
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: [],
    };
    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    await saveCompanyModule(ctx.companyId, ctx.courseId, module);
    return NextResponse.json({ module }, { status: 201 });
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

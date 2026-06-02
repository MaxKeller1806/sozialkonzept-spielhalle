import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { validateModule } from "@/lib/course-validation";
import { nextModuleId, saveModule } from "@/lib/course-db";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import type { CourseModule } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    await assertCourseEditable(companyId, courseId, "add_modules");
    const body = await request.json();
    const module: CourseModule = {
      id: body.id ?? (await nextModuleId(companyId, courseId)),
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: [],
    };

    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    await saveModule(companyId, courseId, module);
    return NextResponse.json({ module }, { status: 201 });
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

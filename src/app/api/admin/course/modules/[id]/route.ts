import { NextResponse } from "next/server";
import { validateModule } from "@/lib/course-validation";
import {
  deleteModule as deleteCompanyModule,
  getModule as getCompanyModule,
  saveModule as saveCompanyModule,
} from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import {
  deleteModule as deleteMasterModule,
  getModule as getMasterModule,
  saveModule as saveMasterModule,
} from "@/lib/master-course-db";
import type { CourseModule } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const moduleId = Number(id);

    const module = isMasterEditor(ctx)
      ? await getMasterModule(ctx.masterId, moduleId)
      : await getCompanyModule(ctx.companyId, ctx.courseId, moduleId);

    if (!module) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ module });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const moduleId = Number(id);
    const body = await request.json();

    if (isMasterEditor(ctx)) {
      const existing = await getMasterModule(ctx.masterId, moduleId);
      if (!existing) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      const module: CourseModule = {
        id: moduleId,
        title: String(body.title ?? "").trim(),
        duration: Number(body.duration) || 0,
        lessons: existing.lessons,
      };
      const error = validateModule(module);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      await saveMasterModule(ctx.masterId, module);
      return NextResponse.json({ module });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "content");
    const existing = await getCompanyModule(ctx.companyId, ctx.courseId, moduleId);
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    const module: CourseModule = {
      id: moduleId,
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: existing.lessons,
    };
    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    await saveCompanyModule(ctx.companyId, ctx.courseId, module);
    return NextResponse.json({ module });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const moduleId = Number(id);

    if (isMasterEditor(ctx)) {
      const ok = await deleteMasterModule(ctx.masterId, moduleId);
      if (!ok) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "content");
    const ok = await deleteCompanyModule(ctx.companyId, ctx.courseId, moduleId);
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

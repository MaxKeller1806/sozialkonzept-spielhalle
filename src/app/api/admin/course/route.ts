import { NextResponse } from "next/server";
import { getCompanyAdminSettings } from "@/lib/company-admin-settings";
import { getCourseMeta, updateCourseSettings } from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { buildContentStateMap } from "@/lib/content-provisions";
import {
  MASTER_EDITOR_PERMISSIONS,
  isMasterEditor,
  resolveCourseEditor,
} from "@/lib/course-editor-context";
import { getCourseForContext } from "@/lib/course";
import {
  assertCourseSettingsFieldEditable,
  getCourseProvision,
  provisionPermissions,
} from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import { getMasterCourseData } from "@/lib/master-course-db";

export async function GET(request: Request) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));

    if (isMasterEditor(ctx)) {
      const course = await getMasterCourseData(ctx.masterId);
      if (!course) {
        return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({
        courseId: ctx.masterId,
        course,
        permissions: MASTER_EDITOR_PERMISSIONS,
        contentStates: { modules: {}, lessons: {}, questions: {} },
      });
    }

    const course = await getCourseForContext(ctx.companyId, ctx.courseId, {
      filterContent: false,
    });
    const provision = await getCourseProvision(ctx.companyId, ctx.courseId);
    const meta = await getCourseMeta(ctx.companyId, ctx.courseId);
    const companySettings = await getCompanyAdminSettings(ctx.companyId);
    const contentStates = await buildContentStateMap(
      ctx.companyId,
      ctx.courseId,
      course
    );
    return NextResponse.json({
      courseId: ctx.courseId,
      course,
      permissions: provisionPermissions(
        provision,
        meta?.masterCourseId,
        companySettings
      ),
      contentStates,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (
      msg === "UNAUTHORIZED" ||
      msg === "FORBIDDEN" ||
      msg === "NO_COURSE" ||
      msg === "COURSE_NOT_FOUND"
    ) {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));

    if (isMasterEditor(ctx)) {
      return NextResponse.json(
        { error: "Bestehensgrenze bitte in der Master-Seminarverwaltung ändern." },
        { status: 400 }
      );
    }

    await assertCourseSettingsFieldEditable(
      ctx.companyId,
      ctx.courseId,
      "passing_score"
    );
    const body = await request.json();
    const { passingScore } = body;

    if (passingScore === undefined || passingScore === null) {
      return NextResponse.json(
        { error: "Bestehensgrenze fehlt." },
        { status: 400 }
      );
    }

    const score = Number(passingScore);
    if (Number.isNaN(score) || score < 50 || score > 100) {
      return NextResponse.json(
        { error: "Bestehensgrenze muss zwischen 50 und 100 % liegen." },
        { status: 400 }
      );
    }

    const course = await updateCourseSettings(ctx.companyId, ctx.courseId, {
      passingScore: score,
    });
    return NextResponse.json({ course });
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

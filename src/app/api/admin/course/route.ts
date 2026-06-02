import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateCourseSettings } from "@/lib/course-db";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import { buildContentStateMap } from "@/lib/content-provisions";
import {
  assertCourseEditable,
  getCourseProvision,
  provisionPermissions,
} from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId, course } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const provision = await getCourseProvision(companyId, courseId);
    const contentStates = await buildContentStateMap(companyId, courseId, course);
    return NextResponse.json({
      courseId,
      course,
      permissions: provisionPermissions(provision),
      contentStates,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "NO_COURSE") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    await assertCourseEditable(companyId, courseId, "content");
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

    const course = await updateCourseSettings(companyId, courseId, {
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

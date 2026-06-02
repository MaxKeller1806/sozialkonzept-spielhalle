import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getCourseMeta,
  permanentlyDeleteCompanyCourse,
  setCompanyCourseActive,
  updateCourseSettings,
} from "@/lib/course-db";
import { getCourseEvidenceSummary } from "@/lib/course-evidence";
import {
  assertCourseSettingsEditable,
  getCourseProvision,
  provisionPermissions,
} from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import { normalizeValidityType, normalizeIntervalUnit } from "@/lib/course-validity";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const meta = await getCourseMeta(user.companyId!, courseId);
    if (!meta) {
      return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
    }
    const provision = await getCourseProvision(user.companyId!, courseId);
    const evidence = await getCourseEvidenceSummary(courseId);
    return NextResponse.json({
      course: meta,
      permissions: provisionPermissions(provision),
      canPermanentDelete: !evidence.hasAny,
      evidence,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const companyId = user.companyId!;
    const body = await request.json();

    if (typeof body.active === "boolean") {
      const provision = await getCourseProvision(companyId, courseId);
      const perms = provisionPermissions(provision);
      if (!body.active && !perms.canDeactivate) {
        return NextResponse.json(
          { error: "Deaktivieren ist für dieses Seminar nicht erlaubt." },
          { status: 403 }
        );
      }
      const ok = await setCompanyCourseActive(companyId, courseId, body.active);
      if (!ok) {
        return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
      }
      const meta = await getCourseMeta(companyId, courseId);
      return NextResponse.json({
        course: meta,
        message: body.active
          ? "Seminar wurde reaktiviert."
          : "Seminar wurde deaktiviert.",
      });
    }

    await assertCourseSettingsEditable(companyId, courseId);
    const course = await updateCourseSettings(companyId, courseId, {
      passingScore:
        body.passingScore != null ? Number(body.passingScore) : undefined,
      validityType:
        body.validityType != null
          ? normalizeValidityType(body.validityType)
          : undefined,
      validityIntervalValue:
        body.validityIntervalValue != null
          ? Number(body.validityIntervalValue)
          : undefined,
      validityIntervalUnit:
        body.validityIntervalUnit != null
          ? normalizeIntervalUnit(body.validityIntervalUnit) ?? undefined
          : undefined,
    });
    const meta = await getCourseMeta(companyId, courseId);
    return NextResponse.json({ course: meta, courseData: course });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const companyId = user.companyId!;

    const meta = await getCourseMeta(companyId, courseId);
    if (!meta) {
      return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
    }

    await permanentlyDeleteCompanyCourse(companyId, courseId);
    return NextResponse.json({ ok: true, message: "Seminar wurde endgültig gelöscht." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "HAS_EVIDENCE") {
      return NextResponse.json(
        {
          error:
            "Dieses Seminar hat Nachweisdaten und kann nicht gelöscht werden. Bitte deaktivieren.",
        },
        { status: 409 }
      );
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Löschen fehlgeschlagen." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  adminAccessForResponsibilities,
  resetCourseToTopicDefault,
  setCourseResponsibleUsers,
} from "@/lib/course-responsible-users";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const { courseId } = await context.params;
    const body = await request.json();

    if (body.resetToTopicDefault === true) {
      const adminAccess = adminAccessForResponsibilities(admin);
      if (!adminAccess) {
        return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
      }
      await resetCourseToTopicDefault(companyId, courseId);
      return NextResponse.json({
        ok: true,
        message: "Individuelle Zuordnung entfernt — Hauptthema gilt wieder.",
      });
    }

    const raw = body.userIds;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "userIds-Array erforderlich." },
        { status: 400 }
      );
    }

    const userIds = raw
      .map((id: unknown) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    const adminAccess = adminAccessForResponsibilities(admin);
    const responsibleUsers = await setCourseResponsibleUsers(
      companyId,
      courseId,
      userIds,
      adminAccess
    );

    return NextResponse.json({
      ok: true,
      message: "Verantwortliche gespeichert.",
      responsibleUsers,
    });
  } catch (e) {
    console.error("[admin/responsibilities/[courseId]] PATCH:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "INVALID_USER") {
      return NextResponse.json(
        { error: "Ungültiger Mitarbeiter für diese Firma." },
        { status: 400 }
      );
    }
    if (msg === "COURSE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Seminar nicht gefunden." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

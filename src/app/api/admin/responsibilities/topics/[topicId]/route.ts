import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  adminAccessForResponsibilities,
  setTopicResponsibleUsers,
} from "@/lib/course-responsible-users";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ topicId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const { topicId: topicIdRaw } = await context.params;
    const topicId = Number(topicIdRaw);
    if (!Number.isFinite(topicId) || topicId <= 0) {
      return NextResponse.json({ error: "Ungültiges Hauptthema." }, { status: 400 });
    }

    const body = await request.json();
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
    const responsibleUsers = await setTopicResponsibleUsers(
      companyId,
      topicId,
      userIds,
      adminAccess
    );

    return NextResponse.json({
      ok: true,
      message: "Verantwortliche für das Hauptthema gespeichert.",
      responsibleUsers,
    });
  } catch (e) {
    console.error("[admin/responsibilities/topics/[topicId]] PATCH:", e);
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
    if (msg === "TOPIC_NOT_FOUND") {
      return NextResponse.json(
        { error: "Hauptthema nicht gefunden." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

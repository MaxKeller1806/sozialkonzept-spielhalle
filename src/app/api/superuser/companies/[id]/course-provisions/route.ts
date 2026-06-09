import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { syncCompanyMasterCourseProvisions } from "@/lib/course-assignment-options";
import { resetSql } from "@/lib/db";
import { getCompanyById } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superuser = await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: "Ungültige Firmen-ID." }, { status: 400 });
    }

    const company = await getCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }

    const body = await request.json();
    const raw = body.masterCourseIds;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "masterCourseIds (Array) erforderlich." },
        { status: 400 }
      );
    }

    const masterCourseIds = [...new Set(raw.map(String).filter((id) => id.length > 0))];

    const result = await syncCompanyMasterCourseProvisions(
      companyId,
      masterCourseIds,
      superuser.id
    );

    return NextResponse.json({ ok: true, ...result, masterCourseIds });
  } catch (e) {
    console.error("[course-provisions] PATCH:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MASTER_NOT_FOUND") {
      return NextResponse.json({ error: "Master-Kurs nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg || "Speichern fehlgeschlagen." },
      { status: 500 }
    );
  }
}

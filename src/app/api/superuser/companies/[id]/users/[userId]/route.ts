import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { removeOrArchiveCompanyUser, setCompanyUserActive } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, userId } = await params;
    const companyId = Number(id);
    const body = await request.json();

    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active erforderlich." }, { status: 400 });
    }

    const ok = await setCompanyUserActive(Number(userId), companyId, body.active);
    if (!ok) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[superuser/users] PATCH:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Aktion fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, userId } = await params;
    const companyId = Number(id);
    const uid = Number(userId);

    const result = await removeOrArchiveCompanyUser(uid, companyId);

    return NextResponse.json({
      action: result.action,
      message:
        "Benutzer wurde archiviert. Vorhandene Prüfungs- und Zertifikatsdaten bleiben aus Nachweisgründen erhalten.",
    });
  } catch (e) {
    console.error("[superuser/users] DELETE:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Aktion fehlgeschlagen." }, { status: 500 });
  }
}

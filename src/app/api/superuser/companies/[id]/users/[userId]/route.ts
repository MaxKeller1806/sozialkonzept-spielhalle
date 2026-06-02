import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { setCompanyUserActive } from "@/lib/tenant";
import {
  ConfirmDeleteRequiredError,
  executePermanentUserDelete,
} from "@/lib/user-delete";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function deleteErrorResponse(e: unknown) {
  if (e instanceof ConfirmDeleteRequiredError) {
    return NextResponse.json(
      {
        error: e.preview.warningMessage,
        code: "CONFIRM_DELETE_REQUIRED",
        preview: e.preview,
      },
      { status: 409 }
    );
  }
  const msg = e instanceof Error ? e.message : "";
  if (msg === "NOT_FOUND") {
    return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
  }
  return null;
}

async function parseConfirmDelete(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  if (url.searchParams.get("confirmDelete") === "true") return true;
  try {
    const body = await request.json();
    return body?.confirmDelete === true;
  } catch {
    return false;
  }
}

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
    return NextResponse.json({
      ok: true,
      message: body.active
        ? "Benutzer wurde reaktiviert."
        : "Benutzer wurde archiviert. Nachweisdaten bleiben erhalten.",
    });
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
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, userId } = await params;
    const companyId = Number(id);
    const uid = Number(userId);

    const confirmDelete = await parseConfirmDelete(request);
    const result = await executePermanentUserDelete(uid, companyId, confirmDelete);

    return NextResponse.json({
      action: result.action,
      hadEvidenceData: result.hadEvidenceData,
      message: result.hadEvidenceData
        ? "Benutzer und zugehörige Nachweisdaten wurden endgültig gelöscht."
        : "Benutzer wurde endgültig gelöscht.",
    });
  } catch (e) {
    console.error("[superuser/users] DELETE:", e);
    await resetSql();
    const del = deleteErrorResponse(e);
    if (del) return del;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Aktion fehlgeschlagen." }, { status: 500 });
  }
}

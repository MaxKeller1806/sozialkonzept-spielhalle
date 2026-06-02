import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  getTenantUserCompanyId,
  setCompanyUserActive,
} from "@/lib/tenant";
import {
  ConfirmDeleteRequiredError,
  executePermanentUserDelete,
  getUserDeletePreview,
} from "@/lib/user-delete";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 401 }
    );
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 403 }
    );
  }
  return null;
}

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperuser();
    const { userId } = await params;
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) {
      return NextResponse.json({ error: "Ungültige Benutzer-ID." }, { status: 400 });
    }

    const companyId = await getTenantUserCompanyId(uid);
    if (companyId == null) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }

    const preview = await getUserDeletePreview(uid);
    return NextResponse.json({ preview });
  } catch (e) {
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Abfrage fehlgeschlagen." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperuser();
    const { userId } = await params;
    const uid = Number(userId);
    const body = await request.json();

    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active erforderlich." }, { status: 400 });
    }

    const companyId = await getTenantUserCompanyId(uid);
    if (companyId == null) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }

    const ok = await setCompanyUserActive(uid, companyId, body.active);
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
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Aktion fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperuser();
    const { userId } = await params;
    const uid = Number(userId);

    const companyId = await getTenantUserCompanyId(uid);
    if (companyId == null) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }

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
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Aktion fehlgeschlagen." }, { status: 500 });
  }
}

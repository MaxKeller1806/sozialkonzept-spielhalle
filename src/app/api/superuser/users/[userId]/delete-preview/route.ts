import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { getTenantUserCompanyId } from "@/lib/tenant";
import { getUserDeletePreview } from "@/lib/user-delete";

export const dynamic = "force-dynamic";

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 403 }
    );
  }
  return null;
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
    return NextResponse.json(
      { error: "Vorschau konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

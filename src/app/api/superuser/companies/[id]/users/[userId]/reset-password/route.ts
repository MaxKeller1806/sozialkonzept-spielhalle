import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { postgresErrorFields, resetSql } from "@/lib/db";
import { resetCompanyAdminPassword } from "@/lib/user-password-reset";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, userId } = await params;
    const companyId = Number(id);
    const uid = Number(userId);

    if (!Number.isFinite(companyId) || companyId <= 0 || !Number.isFinite(uid) || uid <= 0) {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await resetCompanyAdminPassword(
      uid,
      companyId,
      body.password ?? null
    );

    return NextResponse.json({
      ok: true,
      adminAccess: {
        email: result.email,
        initialPassword: result.initialPassword,
      },
    });
  } catch (e) {
    console.error(
      "[superuser/users/reset-password] POST failed",
      postgresErrorFields(e)
    );
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Admin-Benutzer nicht gefunden." },
        { status: 404 }
      );
    }
    if (msg === "PASSWORD_INVALID") {
      return NextResponse.json(
        { error: "Passwort muss mindestens 8 Zeichen haben." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Passwort-Reset fehlgeschlagen." }, { status: 500 });
  }
}

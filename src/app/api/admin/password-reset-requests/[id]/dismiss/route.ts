import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dismissPasswordResetRequest } from "@/lib/password-reset-requests";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const requestId = Number(id);

    if (!Number.isFinite(requestId) || requestId <= 0) {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    await dismissPasswordResetRequest(requestId, admin.id, admin.companyId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Anfrage nicht gefunden." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

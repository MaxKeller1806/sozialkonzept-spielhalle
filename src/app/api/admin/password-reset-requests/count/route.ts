import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { countOpenPasswordResetRequests } from "@/lib/password-reset-requests";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const count = await countOpenPasswordResetRequests(admin.companyId);
    return NextResponse.json({ count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

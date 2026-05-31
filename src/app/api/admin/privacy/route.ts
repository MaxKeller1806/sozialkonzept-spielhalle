import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCompanyPrivacyStats } from "@/lib/privacy";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const stats = await getCompanyPrivacyStats(admin.companyId!);
    return NextResponse.json({ stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

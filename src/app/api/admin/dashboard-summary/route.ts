import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { getAdminDashboardSummary } from "@/lib/admin-dashboard-summary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const admin = await requireAdmin();
    const summary = await getAdminDashboardSummary(admin.companyId!);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[admin/dashboard-summary] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

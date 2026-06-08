import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listCompanyCertificates } from "@/lib/certificate";
import { resetSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const admin = await requireAdmin();
    const certificates = await listCompanyCertificates(admin.companyId!);
    return NextResponse.json({ certificates });
  } catch (e) {
    console.error("[admin/certificates] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminAccessFromSession, resolveListLocationId } from "@/lib/admin-access";
import { listCompanyCertificates } from "@/lib/certificate";
import { parseOptionalId } from "@/lib/list-query";
import { resetSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    const locationId = resolveListLocationId(
      access,
      parseOptionalId(new URL(request.url).searchParams.get("locationId"))
    );
    const certificates = await listCompanyCertificates(
      admin.companyId!,
      locationId
    );
    return NextResponse.json({ certificates, locationId });
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

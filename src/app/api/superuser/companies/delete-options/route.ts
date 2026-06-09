import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { listCompaniesForDeleteConfirm } from "@/lib/company-delete";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperuser();
    const companies = await listCompaniesForDeleteConfirm();
    return NextResponse.json({ companies });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { listAllCompanyDataExports } from "@/lib/company-data-export";
import { COMPANY_DATA_EXPORT_REASONS } from "@/lib/company-data-export-reasons";
import { isDbConnectionError, resetSqlOnFailure } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperuser();
    const exports = await listAllCompanyDataExports();
    return NextResponse.json({
      exportReasons: COMPANY_DATA_EXPORT_REASONS,
      exports,
    });
  } catch (e) {
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen." },
        { status: 503 }
      );
    }
    console.error("[superuser/data-exports] GET", e);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

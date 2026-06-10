import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { getCompanyDataExportById } from "@/lib/company-data-export";
import { isDbConnectionError, resetSqlOnFailure } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const exportId = Number(id);
    if (!Number.isFinite(exportId) || exportId <= 0) {
      return NextResponse.json({ error: "Ungültige Export-ID." }, { status: 400 });
    }

    const row = await getCompanyDataExportById(exportId);
    if (!row) {
      return NextResponse.json({ error: "Export nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ export: row });
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
    console.error("[superuser/data-exports/[id]] GET", e);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

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

    if (!row.protocolFileUrl) {
      return NextResponse.json(
        {
          error:
            "Kein archiviertes Exportprotokoll vorhanden. Snapshot-Daten sind weiterhin in der Datenbank gespeichert.",
        },
        { status: 404 }
      );
    }

    const res = await fetch(row.protocolFileUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Exportprotokoll nicht mehr verfügbar. Snapshot-Daten bleiben erhalten." },
        { status: 404 }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="export_protokoll_${exportId}.pdf"`,
        "Cache-Control": "no-store",
      },
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
    console.error("[superuser/data-exports/[id]/protocol] GET", e);
    return NextResponse.json({ error: "Download fehlgeschlagen." }, { status: 500 });
  }
}

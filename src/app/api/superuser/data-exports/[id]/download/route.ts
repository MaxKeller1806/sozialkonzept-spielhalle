import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { getCompanyDataExportById } from "@/lib/company-data-export";
import { isDbConnectionError, resetSqlOnFailure } from "@/lib/db";

export const dynamic = "force-dynamic";

async function proxyStoredFile(
  url: string,
  filename: string,
  contentType: string
): Promise<NextResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Exportdatei nicht mehr verfügbar. Das Exportprotokoll und der Snapshot bleiben erhalten." },
      { status: 404 }
    );
  }
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

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

    if (!row.fileUrl) {
      return NextResponse.json(
        {
          error:
            "Keine archivierte Exportdatei vorhanden. Der Export wurde nur lokal heruntergeladen.",
        },
        { status: 404 }
      );
    }

    const date = row.createdAt.slice(0, 10);
    const code = row.companyCode || `company_${row.companyId}`;
    const filename = `firma_${code}_export_${date}.zip`;

    return proxyStoredFile(row.fileUrl, filename, "application/zip");
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
    console.error("[superuser/data-exports/[id]/download] GET", e);
    return NextResponse.json({ error: "Download fehlgeschlagen." }, { status: 500 });
  }
}

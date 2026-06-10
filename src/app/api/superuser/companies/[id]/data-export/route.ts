import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  createCompanyDataExport,
  listCompanyDataExports,
} from "@/lib/company-data-export";
import { CompanyDataExportTenantError } from "@/lib/company-data-export-raw";
import {
  COMPANY_DATA_EXPORT_REASONS,
  normalizeExportReason,
  validateExportRequest,
} from "@/lib/company-data-export-reasons";
import { isDbConnectionError, resetSqlOnFailure, withDbQuery } from "@/lib/db";
import { getCompanyById } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: "Ungültige Firma." }, { status: 400 });
    }

    const company = await getCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }

    const exports = await listCompanyDataExports(companyId);
    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        companyCode: company.companyCode,
      },
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
    console.error("[superuser/data-export] GET", e);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: "Ungültige Firma." }, { status: 400 });
    }

    const company = await getCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }

    let body: { exportReason?: string; customReason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const exportReasonRaw = body.exportReason?.trim() ?? "";
    const customReason = body.customReason?.trim() ?? null;
    const validationError = validateExportRequest(exportReasonRaw, customReason);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const exportReason = normalizeExportReason(exportReasonRaw)!;
    const exportedByName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    const { buffer, filename } = await withDbQuery(
      () =>
        createCompanyDataExport({
          companyId,
          exportReason,
          customReason: exportReason === "SONSTIGES" ? customReason : null,
          exportedByUserId: user.id,
          exportedByName,
        }),
      90000
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "COMPANY_NOT_FOUND") {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }
    if (e instanceof CompanyDataExportTenantError) {
      console.error("[superuser/data-export] Mandantentrennung:", e.violations);
      return NextResponse.json(
        {
          error:
            "Export abgebrochen: Mandantentrennung verletzt. Es wurden Daten einer anderen Firma erkannt.",
        },
        { status: 409 }
      );
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    console.error("[superuser/data-export] POST", e);
    return NextResponse.json(
      { error: "Datenexport konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminAccessFromSession, resolveListLocationId } from "@/lib/admin-access";
import {
  buildAuditExportZip,
  MAX_AUDIT_EXPORT_USERS,
} from "@/lib/admin-audit-export";
import { isDbConnectionError, resetSqlOnFailure, withDbQuery, getSql } from "@/lib/db";
import { sqlUserAssignedToLocationFilter } from "@/lib/user-locations";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    const body = await request.json();
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.map(Number).filter((id: number) => Number.isFinite(id) && id > 0)
      : [];

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "Bitte mindestens einen Mitarbeiter auswählen." },
        { status: 400 }
      );
    }
    if (userIds.length > MAX_AUDIT_EXPORT_USERS) {
      return NextResponse.json(
        {
          error: `Maximal ${MAX_AUDIT_EXPORT_USERS} Mitarbeiter pro Export.`,
        },
        { status: 400 }
      );
    }

    const options = {
      includeCertificates: body.includeCertificates !== false,
      includeLearningContent: body.includeLearningContent === true,
      includeExams: body.includeExams === true,
      showExamCorrectAnswers: body.showExamCorrectAnswers === true,
    };

    if (
      !options.includeCertificates &&
      !options.includeLearningContent &&
      !options.includeExams
    ) {
      return NextResponse.json(
        { error: "Bitte wählen Sie mindestens einen Exportinhalt aus." },
        { status: 400 }
      );
    }

    const effectiveLocationId = resolveListLocationId(access, null);

    if (effectiveLocationId != null) {
      const sql = getSql();
      const locationFilter = sqlUserAssignedToLocationFilter(
        sql,
        effectiveLocationId
      );
      const rows = await sql`
        SELECT u.id FROM users u
        WHERE u.company_id = ${admin.companyId}
          AND u.role = 'employee'
          AND u.id IN ${sql(userIds)}
        ${locationFilter}
      `;
      if (rows.length !== userIds.length) {
        return NextResponse.json(
          { error: "Einige Mitarbeiter liegen außerhalb Ihres Standortbereichs." },
          { status: 403 }
        );
      }
    }

    const { buffer, filename } = await withDbQuery(
      () =>
        buildAuditExportZip(
          admin.companyId!,
          userIds,
          effectiveLocationId,
          options
        ),
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
    if (msg === "NO_ACCESSIBLE_USERS" || msg === "USER_SCOPE_VIOLATION") {
      return NextResponse.json(
        { error: "Ausgewählte Mitarbeiter konnten nicht exportiert werden." },
        { status: 403 }
      );
    }
    if (msg === "TOO_MANY_USERS") {
      return NextResponse.json(
        { error: `Maximal ${MAX_AUDIT_EXPORT_USERS} Mitarbeiter pro Export.` },
        { status: 400 }
      );
    }
    if (msg === "NO_EXPORT_CONTENT") {
      return NextResponse.json(
        { error: "Bitte wählen Sie mindestens einen Exportinhalt aus." },
        { status: 400 }
      );
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    console.error("[audit-export/download]", e);
    return NextResponse.json(
      { error: "Audit-Paket konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}

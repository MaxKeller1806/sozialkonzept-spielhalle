import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminAccessFromSession, resolveListLocationId } from "@/lib/admin-access";
import {
  listAuditExportEmployees,
  parseTrainingStatusListQuery,
} from "@/lib/admin-audit-export";
import { isDbConnectionError, resetSqlOnFailure, withDbQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    const params = new URL(request.url).searchParams;
    const query = parseTrainingStatusListQuery(params);
    const effectiveLocationId = resolveListLocationId(access, query.locationId);

    const result = await withDbQuery(() =>
      listAuditExportEmployees(admin.companyId!, query, effectiveLocationId)
    );

    return NextResponse.json(result);
  } catch (e) {
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

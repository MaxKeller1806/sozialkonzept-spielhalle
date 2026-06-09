import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardSummary } from "@/lib/admin-dashboard-summary";
import { adminAccessFromSession, resolveListLocationId } from "@/lib/admin-access";
import { parseOptionalId } from "@/lib/list-query";
import {
  isQueryTimeoutError,
  resetSqlOnFailure,
  withDbQuery,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function dashboardErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  if (isQueryTimeoutError(e)) {
    return NextResponse.json(
      {
        error:
          "Kennzahlen konnten nicht rechtzeitig geladen werden. Bitte später erneut versuchen.",
      },
      { status: 504 }
    );
  }
  if (msg.includes("does not exist")) {
    return NextResponse.json(
      {
        error:
          "Datenbank-Schema unvollständig. Bitte fehlende Migrationen in Production ausführen (npm run db:migrate).",
      },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { error: "Kennzahlen konnten nicht geladen werden." },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const access = adminAccessFromSession(admin)!;
    const requestedLocationId = parseOptionalId(
      new URL(request.url).searchParams.get("locationId")
    );
    const locationId = resolveListLocationId(access, requestedLocationId);
    const summary = await withDbQuery(
      () => getAdminDashboardSummary(companyId, locationId),
      45000
    );
    return NextResponse.json({
      summary,
      adminScope: access.adminScope,
      locationId,
    });
  } catch (e) {
    console.error("[admin/dashboard-summary] GET:", e);
    await resetSqlOnFailure(e);
    return dashboardErrorResponse(e);
  }
}

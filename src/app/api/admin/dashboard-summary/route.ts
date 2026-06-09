import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardSummary } from "@/lib/admin-dashboard-summary";
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

export async function GET() {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const summary = await withDbQuery(
      () => getAdminDashboardSummary(companyId),
      45000
    );
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[admin/dashboard-summary] GET:", e);
    await resetSqlOnFailure(e);
    return dashboardErrorResponse(e);
  }
}

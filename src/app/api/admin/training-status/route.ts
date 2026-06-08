import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  listAdminTrainingStatus,
  parseTrainingStatusListQuery,
  TRAINING_STATUS_SORT_ALLOWLIST,
} from "@/lib/admin-training-status-list";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const query = parseTrainingStatusListQuery(params);
    const result = await listAdminTrainingStatus(admin.companyId!, query);

    return NextResponse.json({
      employees: result.employees,
      meta: result.meta,
      sortFields: [
        ...Object.keys(TRAINING_STATUS_SORT_ALLOWLIST),
        "expiredCount",
        "dueSoonCount",
        "nextDueAt",
        "courseCount",
      ],
    });
  } catch (e) {
    console.error("[admin/training-status] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

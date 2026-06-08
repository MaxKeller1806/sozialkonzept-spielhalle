import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  listAdminPrivacyStatus,
  parsePrivacyStatusListQuery,
  PRIVACY_STATUS_SORT_ALLOWLIST,
} from "@/lib/admin-privacy-status-list";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const query = parsePrivacyStatusListQuery(params);
    const result = await listAdminPrivacyStatus(admin.companyId!, query);

    return NextResponse.json({
      employees: result.employees,
      meta: result.meta,
      stats: result.stats,
      sortFields: [
        ...Object.keys(PRIVACY_STATUS_SORT_ALLOWLIST),
        "acceptedAt",
        "privacyStatus",
      ],
    });
  } catch (e) {
    console.error("[admin/privacy-status] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

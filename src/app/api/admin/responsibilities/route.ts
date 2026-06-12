import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  adminAccessForResponsibilities,
  listAdminCourseResponsibilities,
} from "@/lib/course-responsible-users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const adminAccess = adminAccessForResponsibilities(admin);
    const payload = await listAdminCourseResponsibilities(companyId, adminAccess);

    return NextResponse.json(payload);
  } catch (e) {
    console.error("[admin/responsibilities] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Migration fehlt: npm run db:migrate", groups: [], uncategorized: [] },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

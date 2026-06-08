import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { listEmployeeResponsibilities } from "@/lib/company-responsibilities";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireEmployee();
    const responsibilities = await listEmployeeResponsibilities(
      user.id,
      user.companyId!
    );
    return NextResponse.json({ responsibilities });
  } catch (e) {
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });
    }
    if (msg.includes("does not exist")) {
      return NextResponse.json({ responsibilities: [] });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { generateLicenseKey, hashLicenseKey } from "@/lib/license";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    const licenseKey = generateLicenseKey();
    const licenseHash = hashLicenseKey(licenseKey);

    await ensureSeeded();
    const sql = getSql();
    await sql`
      UPDATE companies SET
        license_key_hash = ${licenseHash},
        license_status = 'unlicensed'
      WHERE id = ${companyId}
    `;

    return NextResponse.json({ licenseKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

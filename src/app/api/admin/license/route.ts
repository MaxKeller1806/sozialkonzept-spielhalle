import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { verifyLicenseKey, isLicenseValid } from "@/lib/license";
import { getCompanyById } from "@/lib/tenant";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return NextResponse.json(
        { error: "Bitte Lizenzschlüssel eingeben." },
        { status: 400 }
      );
    }

    const company = await getCompanyById(user.companyId!);
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }

    if (!verifyLicenseKey(licenseKey, await getLicenseHash(user.companyId!))) {
      return NextResponse.json(
        { error: "Ungültiger Lizenzschlüssel." },
        { status: 401 }
      );
    }

    await ensureSeeded();
    const sql = getSql();
    await sql`
      UPDATE companies SET
        license_status = 'active',
        license_activated_at = COALESCE(license_activated_at, NOW()),
        status = 'active'
      WHERE id = ${user.companyId}
    `;

    const updated = await getCompanyById(user.companyId!);
    return NextResponse.json({
      ok: true,
      licenseActive: updated
        ? isLicenseValid(updated.licenseStatus, updated.licenseExpiresAt)
        : true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Aktivierung fehlgeschlagen." }, { status: 500 });
  }
}

async function getLicenseHash(companyId: number): Promise<string | null> {
  await ensureSeeded();
  const sql = (await import("@/lib/db")).getSql();
  const rows = await sql`
    SELECT license_key_hash FROM companies WHERE id = ${companyId} LIMIT 1
  `;
  return rows[0]?.license_key_hash != null
    ? String(rows[0].license_key_hash)
    : null;
}

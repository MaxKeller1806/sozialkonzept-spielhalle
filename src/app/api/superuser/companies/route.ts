import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { isDbConnectionError, getSql, resetSql, withDbQuery } from "@/lib/db";
import { generateLicenseKey, hashLicenseKey } from "@/lib/license";
import { getCompanySummaries, mapCompany } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const tag = `[superuser/companies] ${Date.now()}`;
  try {
    console.time(`${tag} auth`);
    await requireSuperuser();
    console.timeEnd(`${tag} auth`);

    console.time(`${tag} query`);
    const companies = await withDbQuery(() => getCompanySummaries());
    console.timeEnd(`${tag} query`);

    console.time(`${tag} response`);
    const body = NextResponse.json({ companies });
    console.timeEnd(`${tag} response`);
    return body;
  } catch (e) {
    console.error("[superuser/companies] GET:", e);
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Firmen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();
    const {
      name,
      slug,
      email,
      phone,
      website,
      licenseExpiresAt,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Firmenname und Kurzname erforderlich." },
        { status: 400 }
      );
    }

    const normalizedSlug = String(slug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    const licenseKey = generateLicenseKey();
    const licenseHash = hashLicenseKey(licenseKey);

    const sql = getSql();

    const existing = await sql`
      SELECT id FROM companies WHERE slug = ${normalizedSlug} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Kurzname bereits vergeben." },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO companies (
        slug, name, email, phone, website,
        status, license_status, license_key_hash, license_expires_at
      )
      VALUES (
        ${normalizedSlug}, ${name}, ${email ?? null}, ${phone ?? null}, ${website ?? null},
        'pending', 'unlicensed', ${licenseHash},
        ${licenseExpiresAt ? new Date(licenseExpiresAt).toISOString() : null}
      )
      RETURNING *
    `;

    const company = mapCompany(rows[0] as Record<string, unknown>);

    const adminHash = (await import("@/lib/auth")).hashPassword("admin123");
    await sql`
      INSERT INTO users (
        first_name, last_name, email, password_hash, role, company_id, active, must_change_password
      )
      VALUES (
        'Admin', ${name}, ${`admin@${normalizedSlug}.local`}, ${adminHash},
        'admin', ${company.id}, TRUE, TRUE
      )
      ON CONFLICT (email) DO NOTHING
    `;

    return NextResponse.json(
      {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          status: company.status,
          licenseStatus: company.licenseStatus,
        },
        licenseKey,
        adminEmail: `admin@${normalizedSlug}.local`,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

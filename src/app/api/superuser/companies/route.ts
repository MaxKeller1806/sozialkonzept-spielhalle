import { NextResponse } from "next/server";
import { hashPassword, requireSuperuser, resolveInitialPassword } from "@/lib/auth";
import { isDbConnectionError, getSql, resetSqlOnFailure, withDbQuery } from "@/lib/db";
import { generateLicenseKey, hashLicenseKey } from "@/lib/license";
import {
  validateCompanyIndustryAssignment,
} from "@/lib/industries";
import { parseListQueryFromUrl } from "@/lib/list-query";
import { listCompanySummaries, mapCompany, COMPANY_SORT_ALLOWLIST } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const tag = `[superuser/companies] ${Date.now()}`;
  try {
    console.time(`${tag} auth`);
    await requireSuperuser();
    console.timeEnd(`${tag} auth`);

    const params = new URL(request.url).searchParams;
    const query = parseListQueryFromUrl(params, {
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    console.time(`${tag} query`);
    const result = await withDbQuery(() => listCompanySummaries(query));
    console.timeEnd(`${tag} query`);

    return NextResponse.json({
      companies: result.companies,
      meta: result.meta,
      sortFields: Object.keys(COMPANY_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error("[superuser/companies] GET:", e);
    await resetSqlOnFailure(e);
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
      industryId,
      businessTypeId,
      adminEmail,
      adminPassword,
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

    let industryFields = { industryId: null as number | null, businessTypeId: null as number | null };
    try {
      industryFields = await validateCompanyIndustryAssignment(
        industryId,
        businessTypeId
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "BUSINESS_TYPE_REQUIRES_INDUSTRY") {
        return NextResponse.json(
          { error: "Betriebstyp erfordert eine Branche." },
          { status: 400 }
        );
      }
      if (
        code === "INDUSTRY_NOT_FOUND" ||
        code === "BUSINESS_TYPE_NOT_FOUND" ||
        code === "BUSINESS_TYPE_INDUSTRY_MISMATCH"
      ) {
        return NextResponse.json(
          { error: "Ungültige Branche oder Betriebstyp." },
          { status: 400 }
        );
      }
      throw err;
    }

    const rows = await sql`
      INSERT INTO companies (
        slug, name, email, phone, website,
        status, license_status, license_key_hash, license_expires_at,
        industry_id, business_type_id
      )
      VALUES (
        ${normalizedSlug}, ${name}, ${email ?? null}, ${phone ?? null}, ${website ?? null},
        'pending', 'unlicensed', ${licenseHash},
        ${licenseExpiresAt ? new Date(licenseExpiresAt).toISOString() : null},
        ${industryFields.industryId}, ${industryFields.businessTypeId}
      )
      RETURNING *
    `;

    const company = mapCompany(rows[0] as Record<string, unknown>);

    const resolvedAdminEmail = adminEmail?.trim()
      ? String(adminEmail).trim().toLowerCase()
      : `admin@${normalizedSlug}.local`;

    const { password: initialPassword, error: passwordError } =
      resolveInitialPassword(adminPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingAdmin = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${resolvedAdminEmail} LIMIT 1
    `;
    if (existingAdmin.length > 0) {
      return NextResponse.json(
        { error: "Admin-E-Mail bereits vergeben." },
        { status: 409 }
      );
    }

    const adminHash = hashPassword(initialPassword);
    const adminRows = await sql`
      INSERT INTO users (
        first_name, last_name, email, password_hash, role, company_id, active, must_change_password
      )
      VALUES (
        'Admin', ${name}, ${resolvedAdminEmail}, ${adminHash},
        'admin', ${company.id}, TRUE, TRUE
      )
      RETURNING id
    `;

    if (adminRows.length === 0) {
      return NextResponse.json(
        { error: "Admin-Benutzer konnte nicht angelegt werden." },
        { status: 500 }
      );
    }

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
        adminAccess: {
          email: resolvedAdminEmail,
          initialPassword,
        },
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

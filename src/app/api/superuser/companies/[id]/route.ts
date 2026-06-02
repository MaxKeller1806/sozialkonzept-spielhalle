import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { generateLicenseKey, hashLicenseKey } from "@/lib/license";
import {
  getCompanyById,
  removeOrArchiveCompanyUser,
} from "@/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const company = await getCompanyById(Number(id));
    if (!company) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        licenseStatus: company.licenseStatus,
        licenseExpiresAt: company.licenseExpiresAt,
        branding: company.branding,
        street: company.street,
        postalCode: company.postalCode,
        city: company.city,
        country: company.country,
        email: company.email,
        phone: company.phone,
        website: company.website,
        createdAt: company.createdAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    const body = await request.json();
    const patch: Record<string, string | boolean | null> = {};

    if (body.status !== undefined) patch.status = body.status;
    if (body.licenseStatus !== undefined) patch.license_status = body.licenseStatus;
    if (body.name !== undefined) patch.name = body.name;
    if (body.licenseExpiresAt !== undefined) {
      patch.license_expires_at = body.licenseExpiresAt
        ? new Date(body.licenseExpiresAt).toISOString()
        : null;
    }

    const fields: [string, string][] = [
      ["primaryColor", "primary_color"],
      ["secondaryColor", "secondary_color"],
      ["backgroundColor", "background_color"],
      ["accentColor", "accent_color"],
      ["logoUrl", "logo_url"],
      ["loginBackgroundUrl", "login_background_url"],
      ["street", "street"],
      ["postalCode", "postal_code"],
      ["city", "city"],
      ["country", "country"],
      ["email", "email"],
      ["phone", "phone"],
      ["website", "website"],
    ];

    for (const [jsKey, dbKey] of fields) {
      if (body[jsKey] !== undefined) patch[dbKey] = body[jsKey] || null;
    }

    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    await requireSuperuser();
    const sql = getSql();
    await sql`
      UPDATE companies SET ${sql(patch, ...keys)}
      WHERE id = ${companyId}
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    const deleteUserId = new URL(request.url).searchParams.get("userId");
    if (!deleteUserId) {
      return NextResponse.json({ error: "userId erforderlich." }, { status: 400 });
    }

    const uid = Number(deleteUserId);
    const result = await removeOrArchiveCompanyUser(uid, companyId);

    return NextResponse.json({
      action: result.action,
      message:
        "Benutzer wurde archiviert. Vorhandene Prüfungs- und Zertifikatsdaten bleiben aus Nachweisgründen erhalten.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

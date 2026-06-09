import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { getSql, postgresErrorFields, resetSql } from "@/lib/db";
import {
  getCompanyById,
  permanentlyDeleteCompanyUser,
  removeOrArchiveCompanyUser,
} from "@/lib/tenant";
import {
  CompanyDeleteProtectedError,
  permanentlyDeleteCompany,
} from "@/lib/company-delete";
import { resolveCompanyIndustryFields } from "@/lib/industries";
import { ConfirmDeleteRequiredError } from "@/lib/user-delete";

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
        industryId: company.industryId,
        businessTypeId: company.businessTypeId,
        industryName: company.industryName ?? null,
        businessTypeName: company.businessTypeName ?? null,
        allowAdminValidityOverride: company.allowAdminValidityOverride,
        allowAdminPassingScoreOverride: company.allowAdminPassingScoreOverride,
        createdAt: company.createdAt,
      },
    });
  } catch (e) {
    console.error("[superuser/companies] GET failed", postgresErrorFields(e));
    await resetSql();
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
    const patch: Record<string, string | boolean | null | number> = {};

    if (body.status !== undefined) patch.status = body.status;
    if (body.licenseStatus !== undefined) patch.license_status = body.licenseStatus;
    if (body.allowAdminValidityOverride !== undefined) {
      patch.allow_admin_validity_override = Boolean(body.allowAdminValidityOverride);
    }
    if (body.allowAdminPassingScoreOverride !== undefined) {
      patch.allow_admin_passing_score_override = Boolean(
        body.allowAdminPassingScoreOverride
      );
    }
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
      ["loginDomain", "login_domain"],
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

    const current = await getCompanyById(companyId);
    if (!current) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    try {
      const industryFields = await resolveCompanyIndustryFields(
        {
          industryId: current.industryId,
          businessTypeId: current.businessTypeId,
        },
        {
          industryId: body.industryId,
          businessTypeId: body.businessTypeId,
        }
      );
      if (industryFields) {
        patch.industry_id = industryFields.industryId;
        patch.business_type_id = industryFields.businessTypeId;
      }
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

    const company = await getCompanyById(companyId);
    return NextResponse.json({
      ok: true,
      company: company
        ? {
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
            industryId: company.industryId,
            businessTypeId: company.businessTypeId,
            industryName: company.industryName ?? null,
            businessTypeName: company.businessTypeName ?? null,
            allowAdminValidityOverride: company.allowAdminValidityOverride,
            allowAdminPassingScoreOverride: company.allowAdminPassingScoreOverride,
            createdAt: company.createdAt,
          }
        : null,
    });
  } catch (e) {
    console.error("[superuser/companies] PATCH failed", postgresErrorFields(e));
    await resetSql();
    const errFields = postgresErrorFields(e);
    const msg = errFields.message;
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (errFields.code === "42703" && msg.includes("allow_admin_")) {
      return NextResponse.json(
        {
          error:
            "Datenbank-Migration fehlt: Spalten für Admin-Berechtigungen nicht vorhanden. Bitte npm run db:migrate ausführen.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
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
      const body = await request.json().catch(() => ({}));
      const confirmCompanyId = Number(body.confirmCompanyId);
      if (!Number.isFinite(confirmCompanyId) || confirmCompanyId <= 0) {
        return NextResponse.json(
          { error: "Bitte Firma zur Bestätigung auswählen." },
          { status: 400 }
        );
      }
      if (confirmCompanyId !== companyId) {
        return NextResponse.json(
          { error: "Die ausgewählte Firma stimmt nicht überein." },
          { status: 400 }
        );
      }

      await permanentlyDeleteCompany(companyId);
      return NextResponse.json({
        ok: true,
        message: "Firma wurde erfolgreich gelöscht.",
      });
    }

    const uid = Number(deleteUserId);
    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "true";
    const confirmDelete =
      url.searchParams.get("confirmDelete") === "true" ||
      (await request
        .clone()
        .json()
        .then((body) => body?.confirmDelete === true)
        .catch(() => false));

    if (permanent) {
      const result = await permanentlyDeleteCompanyUser(uid, companyId, confirmDelete);
      return NextResponse.json({
        action: result.action,
        hadEvidenceData: result.hadEvidenceData,
        message: result.hadEvidenceData
          ? "Benutzer und zugehörige Nachweisdaten wurden endgültig gelöscht."
          : "Benutzer wurde endgültig gelöscht.",
      });
    }

    const result = await removeOrArchiveCompanyUser(uid, companyId);

    return NextResponse.json({
      action: result.action,
      message:
        "Benutzer wurde archiviert. Vorhandene Prüfungs- und Zertifikatsdaten bleiben aus Nachweisgründen erhalten.",
    });
  } catch (e) {
    console.error("[superuser/companies] DELETE failed", postgresErrorFields(e));
    await resetSql();
    if (e instanceof CompanyDeleteProtectedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof ConfirmDeleteRequiredError) {
      return NextResponse.json(
        {
          error: e.preview.warningMessage,
          code: "CONFIRM_DELETE_REQUIRED",
          preview: e.preview,
        },
        { status: 409 }
      );
    }
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Firma oder Nutzer nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { getCompanyById } from "@/lib/tenant";

export async function GET() {
  try {
    const user = await requireAdmin();
    const company = await getCompanyById(user.companyId!);
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ company });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const patch: Record<string, string | null> = {};

    if (body.name !== undefined) patch.name = body.name;
    const fields: [string, string][] = [
      ["certSignaturePerson", "cert_signature_person"],
      ["certSignaturePosition", "cert_signature_position"],
      ["certSignatureText", "cert_signature_text"],
      ["street", "street"],
      ["postalCode", "postal_code"],
      ["city", "city"],
      ["country", "country"],
      ["email", "email"],
      ["phone", "phone"],
      ["website", "website"],
      ["contactPerson", "contact_person"],
      ["primaryColor", "primary_color"],
      ["secondaryColor", "secondary_color"],
      ["backgroundColor", "background_color"],
      ["accentColor", "accent_color"],
      ["textColor", "text_color"],
      ["textSecondaryColor", "text_secondary_color"],
      ["menuTextColor", "menu_text_color"],
      ["buttonTextColor", "button_text_color"],
      ["logoUrl", "logo_url"],
      ["loginBackgroundUrl", "login_background_url"],
    ];
    for (const [jsKey, dbKey] of fields) {
      if (body[jsKey] !== undefined) patch[dbKey] = body[jsKey] || null;
    }

    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    await ensureSeeded();
    const sql = getSql();
    await sql`
      UPDATE companies SET ${sql(patch, ...keys)}
      WHERE id = ${user.companyId}
    `;

    const company = await getCompanyById(user.companyId!);
    return NextResponse.json({ company });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

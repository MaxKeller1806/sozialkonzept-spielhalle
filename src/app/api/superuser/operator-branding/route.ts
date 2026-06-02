import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";
import {
  DEFAULT_BRANDING,
  normalizeBranding,
  OPERATOR_COMPANY_SLUG,
} from "@/lib/branding-theme";
import { getSql, resetSql } from "@/lib/db";
import {
  fetchOperatorBranding,
  invalidateOperatorBrandingCache,
} from "@/lib/operator-branding";
import { getCompanyBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET() {
  const tag = `[superuser/operator-branding] ${Date.now()}`;
  try {
    console.time(`${tag} auth`);
    await requireSuperuser();
    console.timeEnd(`${tag} auth`);

    console.time(`${tag} query`);
    const data = await fetchOperatorBranding();
    console.timeEnd(`${tag} query`);

    console.time(`${tag} response`);
    const body = NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
    console.timeEnd(`${tag} response`);
    return body;
  } catch (e) {
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json(
      {
        name: APP_NAME,
        operatorName: OPERATOR_NAME,
        branding: DEFAULT_BRANDING,
      },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();
    const patch: Record<string, string | null> = {};

    if (body.name !== undefined) patch.name = String(body.name).trim() || APP_NAME;

    const fields: [string, string][] = [
      ["primaryColor", "primary_color"],
      ["secondaryColor", "secondary_color"],
      ["backgroundColor", "background_color"],
      ["accentColor", "accent_color"],
      ["logoUrl", "logo_url"],
      ["loginBackgroundUrl", "login_background_url"],
    ];

    for (const [jsKey, dbKey] of fields) {
      if (body[jsKey] !== undefined) patch[dbKey] = body[jsKey] || null;
    }

    const sql = getSql();
    const existing = await getCompanyBySlug(OPERATOR_COMPANY_SLUG);

    if (existing) {
      const keys = Object.keys(patch);
      if (keys.length > 0) {
        await sql`
          UPDATE companies SET ${sql(patch, ...keys)}
          WHERE slug = ${OPERATOR_COMPANY_SLUG}
        `;
      }
    } else {
      const b = normalizeBranding({
        primaryColor: patch.primary_color ?? DEFAULT_BRANDING.primaryColor,
        secondaryColor: patch.secondary_color ?? DEFAULT_BRANDING.secondaryColor,
        backgroundColor: patch.background_color ?? DEFAULT_BRANDING.backgroundColor,
        accentColor: patch.accent_color ?? DEFAULT_BRANDING.accentColor,
        logoUrl: patch.logo_url ?? null,
        loginBackgroundUrl: patch.login_background_url ?? null,
      });
      await sql`
        INSERT INTO companies (
          slug, name, status, license_status, license_activated_at,
          primary_color, secondary_color, background_color, accent_color,
          logo_url, login_background_url
        )
        VALUES (
          ${OPERATOR_COMPANY_SLUG},
          ${patch.name ?? APP_NAME},
          'active',
          'active',
          NOW(),
          ${b.primaryColor},
          ${b.secondaryColor},
          ${b.backgroundColor},
          ${b.accentColor},
          ${b.logoUrl},
          ${b.loginBackgroundUrl}
        )
      `;
    }

    invalidateOperatorBrandingCache();
    const data = await fetchOperatorBranding();
    return NextResponse.json(data);
  } catch (e) {
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

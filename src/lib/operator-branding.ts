import { APP_NAME, OPERATOR_NAME } from "./branding";
import {
  DEFAULT_BRANDING,
  normalizeBranding,
  OPERATOR_COMPANY_SLUG,
} from "./branding-theme";
import { getSql } from "./db";

export interface OperatorBrandingPayload {
  name: string;
  operatorName: string;
  branding: ReturnType<typeof normalizeBranding>;
}

let cache: { value: OperatorBrandingPayload; expiresAt: number } | null = null;
const CACHE_MS = 60_000;

export function invalidateOperatorBrandingCache(): void {
  cache = null;
}

export async function fetchOperatorBranding(): Promise<OperatorBrandingPayload> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const sql = getSql();
  const rows = await sql`
    SELECT
      name,
      primary_color,
      secondary_color,
      background_color,
      accent_color,
      text_color,
      text_secondary_color,
      menu_text_color,
      button_text_color,
      logo_url,
      login_background_url
    FROM companies
    WHERE slug = ${OPERATOR_COMPANY_SLUG}
    LIMIT 1
  `;

  if (rows.length === 0) {
    const fallback: OperatorBrandingPayload = {
      name: APP_NAME,
      operatorName: OPERATOR_NAME,
      branding: DEFAULT_BRANDING,
    };
    cache = { value: fallback, expiresAt: Date.now() + CACHE_MS };
    return fallback;
  }

  const row = rows[0];
  const value: OperatorBrandingPayload = {
    name: String(row.name ?? APP_NAME),
    operatorName: OPERATOR_NAME,
    branding: normalizeBranding({
      primaryColor: row.primary_color != null ? String(row.primary_color) : undefined,
      secondaryColor: row.secondary_color != null ? String(row.secondary_color) : undefined,
      backgroundColor:
        row.background_color != null ? String(row.background_color) : undefined,
      accentColor: row.accent_color != null ? String(row.accent_color) : undefined,
      textColor: row.text_color != null ? String(row.text_color) : undefined,
      textSecondaryColor:
        row.text_secondary_color != null ? String(row.text_secondary_color) : undefined,
      menuTextColor:
        row.menu_text_color != null ? String(row.menu_text_color) : undefined,
      buttonTextColor:
        row.button_text_color != null ? String(row.button_text_color) : undefined,
      logoUrl: row.logo_url != null ? String(row.logo_url) : null,
      loginBackgroundUrl:
        row.login_background_url != null ? String(row.login_background_url) : null,
    }),
  };
  cache = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

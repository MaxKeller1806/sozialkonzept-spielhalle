import type { CompanyBranding } from "./types";

export const DEFAULT_BRANDING: CompanyBranding = {
  primaryColor: "#000080",
  secondaryColor: "#4040a0",
  backgroundColor: "#f8fafc",
  accentColor: "#2563eb",
  logoUrl: null,
  loginBackgroundUrl: null,
};

export const OPERATOR_COMPANY_SLUG = "certiano";

export function normalizeBranding(
  partial?: Partial<CompanyBranding> | null
): CompanyBranding {
  if (!partial) return { ...DEFAULT_BRANDING };
  return {
    primaryColor: partial.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: partial.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    backgroundColor: partial.backgroundColor || DEFAULT_BRANDING.backgroundColor,
    accentColor: partial.accentColor || DEFAULT_BRANDING.accentColor,
    logoUrl: partial.logoUrl ?? null,
    loginBackgroundUrl: partial.loginBackgroundUrl ?? null,
  };
}

export function brandingToCssVars(
  branding: Partial<CompanyBranding> | null | undefined
): Record<string, string> {
  const b = normalizeBranding(branding);
  return {
    "--brand-primary": b.primaryColor,
    "--brand-secondary": b.secondaryColor,
    "--brand-bg": b.backgroundColor,
    "--brand-accent": b.accentColor,
    "--brand-navy": b.primaryColor,
    "--brand-navy-muted": b.secondaryColor,
    "--brand-navy-border": b.secondaryColor,
    "--background": b.backgroundColor,
    "--focus-color": b.primaryColor,
  };
}

export function applyBrandingCssVars(
  branding: Partial<CompanyBranding> | null | undefined
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(brandingToCssVars(branding))) {
    root.style.setProperty(key, value);
  }
}

export function clearBrandingCssVars(): void {
  applyBrandingCssVars(DEFAULT_BRANDING);
}

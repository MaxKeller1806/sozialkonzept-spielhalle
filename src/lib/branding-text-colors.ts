import type { CompanyBranding } from "./types";

export type BrandingSurfaceColors = Pick<
  CompanyBranding,
  "primaryColor" | "secondaryColor" | "backgroundColor" | "accentColor"
>;

export type BrandingTextColors = Pick<
  CompanyBranding,
  "textColor" | "textSecondaryColor" | "menuTextColor" | "buttonTextColor"
>;

const LIGHT_TEXT = "#f8fafc";
const DARK_TEXT = "#0f172a";
const LIGHT_MUTED = "#cbd5e1";
const DARK_MUTED = "#64748b";
const MENU_BACKGROUND = "#ffffff";
const MIN_BODY_CONTRAST = 4.5;
const MIN_MUTED_CONTRAST = 3;
const MIN_UI_CONTRAST = 4.5;

function normalizeHex(color: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const hex = trimmed.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return trimmed;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex).replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLightBackground(hex: string): boolean {
  return relativeLuminance(hex) > 0.5;
}

export function pickContrastingText(
  background: string,
  lightText = LIGHT_TEXT,
  darkText = DARK_TEXT
): string {
  const lightRatio = contrastRatio(lightText, background);
  const darkRatio = contrastRatio(darkText, background);
  if (lightRatio >= darkRatio) return lightText;
  return darkText;
}

function pickMutedText(background: string, baseText: string): string {
  const muted = baseText === LIGHT_TEXT ? LIGHT_MUTED : DARK_MUTED;
  const baseRatio = contrastRatio(baseText, background);
  const mutedRatio = contrastRatio(muted, background);
  if (mutedRatio >= MIN_MUTED_CONTRAST && mutedRatio < baseRatio) return muted;
  return baseText;
}

function ensureContrast(
  foreground: string,
  background: string,
  minimum: number,
  lightText = LIGHT_TEXT,
  darkText = DARK_TEXT
): string {
  if (contrastRatio(foreground, background) >= minimum) {
    return normalizeHex(foreground);
  }
  const preferred = pickContrastingText(background, lightText, darkText);
  if (contrastRatio(preferred, background) >= minimum) return preferred;
  return isLightBackground(background) ? darkText : lightText;
}

export function computeAutoTextColors(
  colors: BrandingSurfaceColors
): BrandingTextColors {
  const backgroundColor = normalizeHex(colors.backgroundColor);
  const accentColor = normalizeHex(colors.accentColor);
  const textColor = pickContrastingText(backgroundColor);
  return {
    textColor,
    textSecondaryColor: pickMutedText(backgroundColor, textColor),
    menuTextColor: pickContrastingText(MENU_BACKGROUND),
    buttonTextColor: pickContrastingText(accentColor),
  };
}

export function ensureReadableTextColors(
  branding: BrandingSurfaceColors & BrandingTextColors
): BrandingTextColors {
  const backgroundColor = normalizeHex(branding.backgroundColor);
  const accentColor = normalizeHex(branding.accentColor);
  const textColor = ensureContrast(
    branding.textColor,
    backgroundColor,
    MIN_BODY_CONTRAST
  );
  return {
    textColor,
    textSecondaryColor: ensureContrast(
      branding.textSecondaryColor,
      backgroundColor,
      MIN_MUTED_CONTRAST,
      LIGHT_MUTED,
      DARK_MUTED
    ),
    menuTextColor: ensureContrast(
      branding.menuTextColor,
      MENU_BACKGROUND,
      MIN_UI_CONTRAST
    ),
    buttonTextColor: ensureContrast(
      branding.buttonTextColor,
      accentColor,
      MIN_UI_CONTRAST
    ),
  };
}

export function resolveBrandingTextColors(
  surface: BrandingSurfaceColors,
  manual: Partial<BrandingTextColors> | null | undefined,
  autoTextColors: boolean
): BrandingTextColors {
  const auto = computeAutoTextColors(surface);
  const merged = autoTextColors
    ? auto
    : {
        textColor: manual?.textColor ?? auto.textColor,
        textSecondaryColor: manual?.textSecondaryColor ?? auto.textSecondaryColor,
        menuTextColor: manual?.menuTextColor ?? auto.menuTextColor,
        buttonTextColor: manual?.buttonTextColor ?? auto.buttonTextColor,
      };
  return ensureReadableTextColors({ ...surface, ...merged });
}

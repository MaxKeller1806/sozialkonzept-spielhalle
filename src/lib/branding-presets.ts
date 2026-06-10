import { DEFAULT_BRANDING } from "./branding-theme";
import type { BrandingTextColors } from "./branding-text-colors";

export type BrandingColorPresetId =
  | "certiano"
  | "blue"
  | "green"
  | "dark"
  | "light";

export type BrandingColorPreset = {
  id: BrandingColorPresetId;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  textSecondaryColor: string;
  menuTextColor: string;
  buttonTextColor: string;
};

export const BRANDING_COLOR_PRESETS: BrandingColorPreset[] = [
  {
    id: "certiano",
    label: "Certiano Standard",
    primaryColor: DEFAULT_BRANDING.primaryColor,
    secondaryColor: DEFAULT_BRANDING.secondaryColor,
    backgroundColor: DEFAULT_BRANDING.backgroundColor,
    accentColor: DEFAULT_BRANDING.accentColor,
    textColor: DEFAULT_BRANDING.textColor,
    textSecondaryColor: DEFAULT_BRANDING.textSecondaryColor,
    menuTextColor: DEFAULT_BRANDING.menuTextColor,
    buttonTextColor: DEFAULT_BRANDING.buttonTextColor,
  },
  {
    id: "blue",
    label: "Blau",
    primaryColor: "#1e3a8a",
    secondaryColor: "#3b82f6",
    backgroundColor: "#f0f9ff",
    accentColor: "#2563eb",
    textColor: "#0f172a",
    textSecondaryColor: "#475569",
    menuTextColor: "#334155",
    buttonTextColor: "#ffffff",
  },
  {
    id: "green",
    label: "Grün",
    primaryColor: "#14532d",
    secondaryColor: "#22c55e",
    backgroundColor: "#f0fdf4",
    accentColor: "#16a34a",
    textColor: "#052e16",
    textSecondaryColor: "#166534",
    menuTextColor: "#334155",
    buttonTextColor: "#ffffff",
  },
  {
    id: "dark",
    label: "Dunkel",
    primaryColor: "#e2e8f0",
    secondaryColor: "#94a3b8",
    backgroundColor: "#1e293b",
    accentColor: "#38bdf8",
    textColor: "#f8fafc",
    textSecondaryColor: "#cbd5e1",
    menuTextColor: "#334155",
    buttonTextColor: "#0f172a",
  },
  {
    id: "light",
    label: "Hell",
    primaryColor: "#334155",
    secondaryColor: "#64748b",
    backgroundColor: "#ffffff",
    accentColor: "#6366f1",
    textColor: "#0f172a",
    textSecondaryColor: "#64748b",
    menuTextColor: "#475569",
    buttonTextColor: "#ffffff",
  },
];

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

export function matchBrandingPreset(form: {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor?: string;
  textSecondaryColor?: string;
  menuTextColor?: string;
  buttonTextColor?: string;
}): BrandingColorPresetId | null {
  for (const preset of BRANDING_COLOR_PRESETS) {
    const surfaceMatch =
      normalizeColor(form.primaryColor) === normalizeColor(preset.primaryColor) &&
      normalizeColor(form.secondaryColor) === normalizeColor(preset.secondaryColor) &&
      normalizeColor(form.backgroundColor) === normalizeColor(preset.backgroundColor) &&
      normalizeColor(form.accentColor) === normalizeColor(preset.accentColor);

    if (!surfaceMatch) continue;

    if (
      form.textColor == null &&
      form.textSecondaryColor == null &&
      form.menuTextColor == null &&
      form.buttonTextColor == null
    ) {
      return preset.id;
    }

    const textMatch =
      normalizeColor(form.textColor ?? "") === normalizeColor(preset.textColor) &&
      normalizeColor(form.textSecondaryColor ?? "") ===
        normalizeColor(preset.textSecondaryColor) &&
      normalizeColor(form.menuTextColor ?? "") === normalizeColor(preset.menuTextColor) &&
      normalizeColor(form.buttonTextColor ?? "") === normalizeColor(preset.buttonTextColor);

    if (textMatch) return preset.id;
  }
  return null;
}

export function defaultBrandingFormState(name: string) {
  const preset = BRANDING_COLOR_PRESETS[0];
  return {
    name,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    backgroundColor: preset.backgroundColor,
    accentColor: preset.accentColor,
    textColor: preset.textColor,
    textSecondaryColor: preset.textSecondaryColor,
    menuTextColor: preset.menuTextColor,
    buttonTextColor: preset.buttonTextColor,
    logoUrl: "",
  };
}

export function presetToFormColors(preset: BrandingColorPreset): BrandingTextColors & {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
} {
  return {
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    backgroundColor: preset.backgroundColor,
    accentColor: preset.accentColor,
    textColor: preset.textColor,
    textSecondaryColor: preset.textSecondaryColor,
    menuTextColor: preset.menuTextColor,
    buttonTextColor: preset.buttonTextColor,
  };
}

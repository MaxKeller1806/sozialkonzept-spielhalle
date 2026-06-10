export const COMPANY_DATA_EXPORT_REASONS = {
  DSGVO_AUSKUNFT: "DSGVO-Auskunft",
  VERTRAGSENDE: "Vertragsende",
  DATENUEBERNAHME: "Datenübernahme",
  INTERNE_PRUEFUNG: "Interne Prüfung",
  SONSTIGES: "Sonstiges",
} as const;

export type CompanyDataExportReasonKey = keyof typeof COMPANY_DATA_EXPORT_REASONS;

export const CUSTOM_REASON_MIN_LENGTH = 12;
export const CUSTOM_REASON_MAX_LENGTH = 500;

const LEGACY_REASON_MAP: Record<string, CompanyDataExportReasonKey> = {
  dsgvo_auskunft: "DSGVO_AUSKUNFT",
  vertragsende: "VERTRAGSENDE",
  datenuebernahme: "DATENUEBERNAHME",
  interne_pruefung: "INTERNE_PRUEFUNG",
  sonstiges: "SONSTIGES",
};

export function normalizeExportReason(value: string): CompanyDataExportReasonKey | null {
  const trimmed = value.trim();
  if (trimmed in COMPANY_DATA_EXPORT_REASONS) {
    return trimmed as CompanyDataExportReasonKey;
  }
  return LEGACY_REASON_MAP[trimmed.toLowerCase()] ?? null;
}

export function isValidExportReason(value: string): value is CompanyDataExportReasonKey {
  return normalizeExportReason(value) != null;
}

export function exportReasonLabel(key: string): string {
  const normalized = normalizeExportReason(key);
  if (normalized) return COMPANY_DATA_EXPORT_REASONS[normalized];
  return key;
}

export function validateCustomReason(
  exportReason: string,
  customReason: string | null | undefined
): string | null {
  const normalized = normalizeExportReason(exportReason);
  if (!normalized) return "Bitte einen gültigen Exportgrund wählen.";
  if (normalized !== "SONSTIGES") return null;

  const text = customReason?.trim() ?? "";
  if (text.length < CUSTOM_REASON_MIN_LENGTH) {
    return `Bitte eine Begründung mit mindestens ${CUSTOM_REASON_MIN_LENGTH} Zeichen angeben.`;
  }
  if (text.length > CUSTOM_REASON_MAX_LENGTH) {
    return `Die Begründung darf maximal ${CUSTOM_REASON_MAX_LENGTH} Zeichen haben.`;
  }
  return null;
}

export function validateExportRequest(
  exportReason: string,
  customReason?: string | null
): string | null {
  if (!isValidExportReason(exportReason)) {
    return "Bitte einen gültigen Exportgrund wählen.";
  }
  return validateCustomReason(exportReason, customReason);
}

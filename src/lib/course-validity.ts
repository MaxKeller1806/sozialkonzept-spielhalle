export type ValidityType = "unlimited" | "once" | "half_yearly" | "yearly" | "custom";
export type ValidityIntervalUnit = "days" | "months" | "years";

export interface CourseValidityRule {
  validityType: ValidityType;
  validityIntervalValue?: number | null;
  validityIntervalUnit?: ValidityIntervalUnit | null;
  /** Legacy-Fallback aus validity_months */
  validityMonths?: number;
}

export const VALIDITY_TYPE_LABELS: Record<ValidityType, string> = {
  unlimited: "Unbegrenzt gültig",
  once: "Einmalig erforderlich",
  half_yearly: "Halbjährlich zu wiederholen",
  yearly: "Jährlich zu wiederholen",
  custom: "Benutzerdefinierter Zeitraum",
};

export function normalizeValidityType(value: unknown): ValidityType {
  const v = String(value ?? "yearly");
  if (
    v === "unlimited" ||
    v === "once" ||
    v === "half_yearly" ||
    v === "yearly" ||
    v === "custom"
  ) {
    return v;
  }
  return "yearly";
}

export function normalizeIntervalUnit(value: unknown): ValidityIntervalUnit | null {
  const v = String(value ?? "");
  if (v === "days" || v === "months" || v === "years") return v;
  return null;
}

export function addInterval(
  date: Date,
  value: number,
  unit: ValidityIntervalUnit
): Date {
  const result = new Date(date);
  if (unit === "days") {
    result.setDate(result.getDate() + value);
    return result;
  }
  if (unit === "years") {
    result.setFullYear(result.getFullYear() + value);
    return result;
  }
  result.setMonth(result.getMonth() + value);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  return addInterval(date, months, "months");
}

/** Berechnet valid_until beim Zertifikatsausstellen. null = unbegrenzt/einmalig dauerhaft. */
export function calculateValidUntil(
  issuedAt: Date,
  rule: CourseValidityRule
): Date | null {
  switch (rule.validityType) {
    case "unlimited":
    case "once":
      return null;
    case "half_yearly":
      return addMonths(issuedAt, 6);
    case "yearly":
      return addMonths(issuedAt, 12);
    case "custom": {
      const value = rule.validityIntervalValue ?? rule.validityMonths ?? 12;
      const unit = rule.validityIntervalUnit ?? "months";
      if (!Number.isFinite(value) || value <= 0) return addMonths(issuedAt, 12);
      return addInterval(issuedAt, value, unit);
    }
    default:
      return addMonths(issuedAt, rule.validityMonths ?? 12);
  }
}

export function formatValidityRuleLabel(rule: CourseValidityRule): string {
  if (rule.validityType === "custom") {
    const value = rule.validityIntervalValue ?? rule.validityMonths;
    const unit = rule.validityIntervalUnit ?? "months";
    const unitLabel =
      unit === "days" ? "Tage" : unit === "years" ? "Jahre" : "Monate";
    if (value != null && value > 0) {
      return `${value} ${unitLabel}`;
    }
  }
  return VALIDITY_TYPE_LABELS[rule.validityType];
}

export type EmployeeSeminarStatus =
  | "open"
  | "valid_until"
  | "expired"
  | "unlimited";

export function getEmployeeSeminarStatus(
  cert: { validUntil: string | null; revoked?: number | boolean } | null | undefined,
  now = new Date()
): EmployeeSeminarStatus {
  if (!cert || cert.revoked) return "open";
  if (!cert.validUntil) return "unlimited";
  const until = new Date(cert.validUntil);
  if (until < now) return "expired";
  return "valid_until";
}

export function formatEmployeeSeminarStatus(
  status: EmployeeSeminarStatus,
  validUntil: string | null
): string {
  switch (status) {
    case "open":
      return "Offen";
    case "unlimited":
      return "Unbegrenzt gültig";
    case "expired":
      return "Abgelaufen";
    case "valid_until":
      return validUntil
        ? `Gültig bis ${new Date(validUntil).toLocaleDateString("de-DE")}`
        : "Gültig";
  }
}

export function parseValidityRuleFromRow(row: Record<string, unknown>): CourseValidityRule {
  return {
    validityType: normalizeValidityType(row.validity_type),
    validityIntervalValue:
      row.validity_interval_value != null
        ? Number(row.validity_interval_value)
        : null,
    validityIntervalUnit: normalizeIntervalUnit(row.validity_interval_unit),
    validityMonths:
      row.validity_months != null ? Number(row.validity_months) : undefined,
  };
}

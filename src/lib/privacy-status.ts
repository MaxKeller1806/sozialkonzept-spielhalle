import { parseEmploymentFilter, type EmploymentFilter } from "./training-status";

export type PrivacyStatusKey = "accepted" | "open" | "departed";

export type PrivacyStatusFilter = "all" | PrivacyStatusKey;

export { parseEmploymentFilter, type EmploymentFilter };
export { employmentFilterLabel } from "./training-status";

export function parsePrivacyStatusFilter(
  value: string | null | undefined
): PrivacyStatusFilter {
  if (value === "accepted" || value === "open" || value === "departed") {
    return value;
  }
  return "all";
}

export function privacyStatusFilterLabel(filter: PrivacyStatusFilter): string {
  switch (filter) {
    case "all":
      return "Alle Status";
    case "accepted":
      return "Bestätigt";
    case "open":
      return "Offen";
    case "departed":
      return "Ausgeschieden";
  }
}

export function privacyStatusLabel(key: PrivacyStatusKey): string {
  switch (key) {
    case "accepted":
      return "bestätigt";
    case "open":
      return "offen";
    case "departed":
      return "ausgeschieden";
  }
}

export function privacyStatusBadgeClass(key: PrivacyStatusKey): string {
  switch (key) {
    case "accepted":
      return "bg-green-100 text-green-800";
    case "open":
      return "bg-orange-100 text-orange-800";
    case "departed":
      return "bg-slate-100 text-slate-600";
  }
}

/** Ausgeschieden: left_company_at gesetzt und nicht in der Zukunft. */
export function isEmployeeDeparted(leftCompanyAt: string | null): boolean {
  if (!leftCompanyAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return leftCompanyAt <= today;
}

export function resolvePrivacyStatus(input: {
  leftCompanyAt: string | null;
  currentVersionAcceptedAt: string | null;
  anyAcceptedAt: string | null;
  activePolicyId: number | null;
}): PrivacyStatusKey {
  if (isEmployeeDeparted(input.leftCompanyAt)) return "departed";
  if (input.activePolicyId != null) {
    return input.currentVersionAcceptedAt ? "accepted" : "open";
  }
  return input.anyAcceptedAt ? "accepted" : "open";
}

export function formatPrivacyDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE");
}

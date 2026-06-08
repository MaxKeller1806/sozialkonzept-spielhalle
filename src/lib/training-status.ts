import {
  calculateValidUntil,
  parseValidityRuleFromRow,
  type CourseValidityRule,
  type ValidityType,
} from "./course-validity";
import { DUE_SOON_DAYS } from "./status";

/**
 * Admin-Schulungsstatus je zugewiesenem Kurs (user_course_assignments → courses).
 * Kein Status „Nicht zugewiesen“ – nicht zugewiesene Seminare erscheinen nicht.
 *
 * Abschlussquelle (Priorität):
 * 1. certificates – letztes nicht widerrufenes Zertifikat je user/course
 * 2. training_attempts – fehlgeschlagener Versuch → „nicht bestanden“
 * 3. training_attempts – laufender Versuch → „in Bearbeitung“
 */

export type CourseTrainingStatusKey =
  | "not_started"
  | "in_progress"
  | "valid"
  | "unlimited_valid"
  | "due_soon"
  | "expired"
  | "failed";

export type TrainingStatusFilter =
  | "all"
  | "expired"
  | "due_soon"
  | "not_started"
  | "valid"
  | "unlimited_valid"
  | "in_progress"
  | "failed";

export type EmploymentFilter = "active" | "departed" | "all";

export type CourseTrainingStatus = {
  key: CourseTrainingStatusKey;
  label: string;
  color: "gray" | "blue" | "green" | "yellow" | "red" | "darkred";
};

export type CourseTrainingStatusInput = {
  inProgress: boolean;
  latestCert: {
    id: number;
    issuedAt: string;
    validUntil: string | null;
    revoked: boolean;
    certificateNumber: string | null;
  } | null;
  latestFailedAttemptAt: string | null;
  validityRule: CourseValidityRule;
  assignedAt: string | null;
  joinedCompanyAt: string | null;
};

const STATUS_META: Record<
  CourseTrainingStatusKey,
  { label: string; color: CourseTrainingStatus["color"] }
> = {
  not_started: { label: "Nicht begonnen", color: "gray" },
  in_progress: { label: "In Bearbeitung", color: "blue" },
  valid: { label: "Gültig", color: "green" },
  unlimited_valid: { label: "Unbegrenzt gültig", color: "green" },
  due_soon: { label: "Bald fällig", color: "yellow" },
  expired: { label: "Abgelaufen", color: "red" },
  failed: { label: "Nicht bestanden", color: "darkred" },
};

export function trainingStatusFilterLabel(filter: TrainingStatusFilter): string {
  switch (filter) {
    case "all":
      return "Alle";
    case "expired":
      return "Abgelaufen";
    case "due_soon":
      return "Bald fällig";
    case "not_started":
      return "Nicht begonnen";
    case "valid":
      return "Gültig";
    case "unlimited_valid":
      return "Unbegrenzt gültig";
    case "in_progress":
      return "In Bearbeitung";
    case "failed":
      return "Nicht bestanden";
  }
}

export function parseTrainingStatusFilter(
  value: string | null | undefined
): TrainingStatusFilter {
  const allowed: TrainingStatusFilter[] = [
    "all",
    "expired",
    "due_soon",
    "not_started",
    "valid",
    "unlimited_valid",
    "in_progress",
    "failed",
  ];
  if (value && allowed.includes(value as TrainingStatusFilter)) {
    return value as TrainingStatusFilter;
  }
  return "all";
}

export function parseEmploymentFilter(value: string | null): EmploymentFilter {
  if (value === "departed" || value === "all") return value;
  return "active";
}

export function employmentFilterLabel(filter: EmploymentFilter): string {
  switch (filter) {
    case "active":
      return "Aktive Mitarbeiter";
    case "departed":
      return "Ausgeschiedene Mitarbeiter";
    case "all":
      return "Alle Mitarbeiter";
  }
}

export function matchesTrainingStatusFilter(
  key: CourseTrainingStatusKey,
  filter: TrainingStatusFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "valid") {
    return key === "valid" || key === "due_soon";
  }
  return key === filter;
}

export function resolveCourseTrainingStatus(
  input: CourseTrainingStatusInput,
  now = new Date()
): CourseTrainingStatus {
  const cert = input.latestCert;
  const meta = STATUS_META;

  if (cert && !cert.revoked) {
    const validUntil = cert.validUntil ? new Date(cert.validUntil) : null;

    if (validUntil && validUntil < now) {
      return { key: "expired", ...meta.expired };
    }

    if (validUntil) {
      const daysLeft =
        (validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (daysLeft <= DUE_SOON_DAYS) {
        return { key: "due_soon", ...meta.due_soon };
      }
    }

    if (input.validityRule.validityType === "unlimited") {
      return { key: "unlimited_valid", ...meta.unlimited_valid };
    }

    return { key: "valid", ...meta.valid };
  }

  if (input.inProgress) {
    return { key: "in_progress", ...meta.in_progress };
  }

  if (input.latestFailedAttemptAt) {
    return { key: "failed", ...meta.failed };
  }

  return { key: "not_started", ...meta.not_started };
}

export function computeNextDueAt(
  statusKey: CourseTrainingStatusKey,
  validUntil: string | null,
  validityType: ValidityType
): string | null {
  if (
    statusKey === "expired" ||
    statusKey === "due_soon" ||
    (statusKey === "valid" &&
      validityType !== "once" &&
      validityType !== "unlimited")
  ) {
    return validUntil;
  }
  return null;
}

export function formatTrainingDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE");
}

export function formatValidUntil(
  validUntil: string | null,
  validityType: ValidityType
): string {
  if (validityType === "unlimited") return "Unbegrenzt";
  if (validityType === "once" && !validUntil) return "Einmalig (keine Wiederholung)";
  if (!validUntil) return "Unbegrenzt";
  return formatTrainingDate(validUntil);
}

/** Berechnet valid_until aus Abschlussdatum, falls kein Zertifikat vorliegt (Anzeige). */
export function projectedValidUntil(
  completedAt: string,
  rule: CourseValidityRule
): string | null {
  const until = calculateValidUntil(new Date(completedAt), rule);
  return until ? until.toISOString() : null;
}

export function validityRuleFromCourseRow(
  row: Record<string, unknown>
): CourseValidityRule {
  return parseValidityRuleFromRow(row);
}

export function trainingStatusBadgeClass(
  color: CourseTrainingStatus["color"]
): string {
  switch (color) {
    case "gray":
      return "bg-slate-100 text-slate-700";
    case "blue":
      return "bg-blue-100 text-blue-800";
    case "green":
      return "bg-emerald-100 text-emerald-800";
    case "yellow":
      return "bg-amber-100 text-amber-900";
    case "red":
      return "bg-red-100 text-red-800";
    case "darkred":
      return "bg-red-200 text-red-950";
  }
}

export type EmployeeTrainingSummary = {
  courseCount: number;
  expiredCount: number;
  dueSoonCount: number;
  notStartedCount: number;
  inProgressCount: number;
  failedCount: number;
  validCount: number;
  unlimitedValidCount: number;
  nextDueAt: string | null;
};

export function summarizeEmployeeCourses(
  statuses: CourseTrainingStatusKey[],
  nextDueDates: (string | null)[]
): EmployeeTrainingSummary {
  const summary: EmployeeTrainingSummary = {
    courseCount: statuses.length,
    expiredCount: 0,
    dueSoonCount: 0,
    notStartedCount: 0,
    inProgressCount: 0,
    failedCount: 0,
    validCount: 0,
    unlimitedValidCount: 0,
    nextDueAt: null,
  };

  for (const key of statuses) {
    switch (key) {
      case "expired":
        summary.expiredCount++;
        break;
      case "due_soon":
        summary.dueSoonCount++;
        summary.validCount++;
        break;
      case "not_started":
        summary.notStartedCount++;
        break;
      case "in_progress":
        summary.inProgressCount++;
        break;
      case "failed":
        summary.failedCount++;
        break;
      case "valid":
        summary.validCount++;
        break;
      case "unlimited_valid":
        summary.unlimitedValidCount++;
        summary.validCount++;
        break;
    }
  }

  const futureDue = nextDueDates
    .filter((d): d is string => !!d)
    .map((d) => new Date(d))
    .filter((d) => d >= new Date())
    .sort((a, b) => a.getTime() - b.getTime());

  if (futureDue.length > 0) {
    summary.nextDueAt = futureDue[0].toISOString();
  } else {
    const pastDue = nextDueDates
      .filter((d): d is string => !!d)
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    summary.nextDueAt = pastDue[0]?.toISOString() ?? null;
  }

  return summary;
}

export function employeeMatchesTrainingFilter(
  statuses: CourseTrainingStatusKey[],
  filter: TrainingStatusFilter
): boolean {
  if (filter === "all") return true;
  return statuses.some((key) => matchesTrainingStatusFilter(key, filter));
}

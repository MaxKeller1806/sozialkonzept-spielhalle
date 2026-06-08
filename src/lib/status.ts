import type { Certificate, TrainingStatus } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Schwellenwert „bald fällig“ in Tagen (identisch zur Mitarbeiterlisten-Legende). */
export const DUE_SOON_DAYS = 30;

export function getCertificateStatus(
  cert: Pick<Certificate, "validUntil" | "revoked"> | null | undefined,
  now = new Date()
): TrainingStatus {
  if (!cert || cert.revoked) return "red";
  if (!cert.validUntil) return "green";

  const validUntil = new Date(cert.validUntil);
  if (validUntil < now) return "red";

  const daysLeft = (validUntil.getTime() - now.getTime()) / MS_PER_DAY;
  if (daysLeft <= DUE_SOON_DAYS) return "yellow";

  return "green";
}

export function statusLabel(status: TrainingStatus): string {
  switch (status) {
    case "green":
      return "Gültig";
    case "yellow":
      return "Läuft bald ab";
    case "red":
      return "Nicht geschult / abgelaufen";
  }
}

export function verificationStatus(
  cert: Pick<Certificate, "validUntil" | "revoked"> | null | undefined,
  now = new Date()
): "gültig" | "abgelaufen" | "ungültig" {
  if (!cert || cert.revoked) return "ungültig";
  if (!cert.validUntil) return "gültig";
  const validUntil = new Date(cert.validUntil);
  if (validUntil < now) return "abgelaufen";
  return "gültig";
}

import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateLicenseKey(): string {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString("hex").toUpperCase()
  );
  return `SK-${segments.join("-")}`;
}

export function hashLicenseKey(key: string): string {
  return bcrypt.hashSync(key.trim().toUpperCase(), 10);
}

export function verifyLicenseKey(key: string, hash: string | null): boolean {
  if (!hash) return false;
  return bcrypt.compareSync(key.trim().toUpperCase(), hash);
}

export function maskLicenseKey(key: string): string {
  const normalized = key.trim().toUpperCase();
  if (normalized.length <= 8) return "****";
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export function isLicenseValid(
  licenseStatus: string,
  licenseExpiresAt: string | null
): boolean {
  if (licenseStatus !== "active") return false;
  if (!licenseExpiresAt) return true;
  return new Date(licenseExpiresAt) > new Date();
}

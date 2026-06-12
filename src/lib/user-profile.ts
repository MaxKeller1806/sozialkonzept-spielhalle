/** Ort und legacy Wohnort synchron halten */
export function syncCityFields(city: string | null | undefined): {
  city: string | null;
  placeOfResidence: string | null;
} {
  const normalized = city?.trim() || null;
  return { city: normalized, placeOfResidence: normalized };
}

export const JOINED_COMPANY_AT_BODY_KEYS = [
  "joinedCompanyAt",
  "joined_company_at",
] as const;

/** Prüft, ob ein Request-Body versucht, das Eintrittsdatum zu ändern. */
export function bodyIncludesJoinedCompanyAt(
  body: Record<string, unknown>
): boolean {
  return JOINED_COMPANY_AT_BODY_KEYS.some(
    (key) => key in body && body[key] !== undefined
  );
}

/** Nur für Admin-APIs: normalisiert ein optionales Eintrittsdatum (YYYY-MM-DD). */
export function parseJoinedCompanyAtForAdmin(
  value: unknown
): string | null {
  if (value == null || value === "") return null;
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error("INVALID_JOINED_COMPANY_AT");
  }
  const date = new Date(`${str}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_JOINED_COMPANY_AT");
  }
  return str;
}

export function formatJoinedCompanyAtDisplay(
  iso: string | null | undefined
): string {
  return formatCompanyDateDisplay(iso);
}

export const LEFT_COMPANY_AT_BODY_KEYS = [
  "leftCompanyAt",
  "left_company_at",
] as const;

/** Prüft, ob ein Request-Body versucht, das Austrittsdatum zu ändern. */
export function bodyIncludesLeftCompanyAt(
  body: Record<string, unknown>
): boolean {
  return LEFT_COMPANY_AT_BODY_KEYS.some(
    (key) => key in body && body[key] !== undefined
  );
}

/** Nur für Admin-APIs: normalisiert ein optionales Austrittsdatum (YYYY-MM-DD). */
export function parseLeftCompanyAtForAdmin(value: unknown): string | null {
  if (value == null || value === "") return null;
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error("INVALID_LEFT_COMPANY_AT");
  }
  const date = new Date(`${str}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_LEFT_COMPANY_AT");
  }
  return str;
}

export function formatLeftCompanyAtDisplay(
  iso: string | null | undefined
): string {
  if (!iso) return "Noch im Betrieb";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE");
}

function formatCompanyDateDisplay(iso: string | null | undefined): string {
  if (!iso) return "nicht hinterlegt";
  return new Date(iso).toLocaleDateString("de-DE");
}

/** DATE-Spalte aus der DB ohne Zeitzonen-Verschiebung (YYYY-MM-DD). */
export function parseDateOnlyFromDb(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** Prüft, ob Austrittsdatum nicht vor Eintrittsdatum liegt. */
export function assertCompanyEmploymentDatesValid(
  joinedCompanyAt: string | null,
  leftCompanyAt: string | null
): void {
  if (!joinedCompanyAt || !leftCompanyAt) return;
  if (leftCompanyAt < joinedCompanyAt) {
    throw new Error("LEFT_BEFORE_JOINED");
  }
}

export function formatUserAddress(user: {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  placeOfResidence?: string | null;
}): string {
  const streetLine = [user.street, user.houseNumber].filter(Boolean).join(" ").trim();
  const city = user.city || user.placeOfResidence;
  const cityLine = [user.postalCode, city].filter(Boolean).join(" ").trim();
  return [streetLine, cityLine].filter(Boolean).join(", ") || "—";
}

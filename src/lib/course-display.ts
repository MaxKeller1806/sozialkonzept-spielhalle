/** Escaped Regex-Sonderzeichen für Code-Vergleiche. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s{2,}/g, " ");
}

function buildCodeVariants(rawCode: string): string[] {
  const trimmed = rawCode.trim();
  const variants = new Set<string>();
  variants.add(trimmed);
  variants.add(trimmed.toUpperCase());
  variants.add(trimmed.toLowerCase());

  const withoutBav = trimmed.replace(/^BAV[-\s]*/i, "").trim();
  if (withoutBav) {
    variants.add(withoutBav);
    variants.add(`BAV-${withoutBav}`);
    variants.add(`BAV ${withoutBav}`);
  }
  if (/^BAV[-\s]/i.test(trimmed)) {
    variants.add(trimmed.replace(/^BAV[-\s]*/i, ""));
  }

  return [...variants].filter(Boolean);
}

/** Regex mit optionalen Leerzeichen zwischen Code-Zeichen (z. B. N7 ↔ N 7). */
function flexibleCodePrefixPattern(variant: string): RegExp {
  const withoutBav = variant.replace(/^BAV[-\s]*/i, "").trim();
  const chars = withoutBav.replace(/\s+/g, "").split("").filter(Boolean);
  if (chars.length === 0) {
    return /^$/;
  }

  const hasBav = /^BAV[-\s]*/i.test(variant);
  const body = chars.map((c) => escapeRegex(c)).join("\\s*");
  const prefix = hasBav ? "BAV[-\\s]*" : "";
  return new RegExp(`^${prefix}${body}(?:\\s+|$)`, "i");
}

function exactCodePrefixPattern(variant: string): RegExp {
  return new RegExp(`^${escapeRegex(variant)}(?:\\s+|$)`, "i");
}

/**
 * Entfernt einen führenden Kurs-/BAV-Code aus dem Titel (Anzeige only).
 * Robust gegen BAV-N10, n10, N 7, doppelte Leerzeichen usw.
 */
export function stripLeadingCourseCode(
  code: string | null | undefined,
  title: string
): string {
  const trimmedTitle = normalizeWhitespace(title);
  if (!trimmedTitle) return trimmedTitle;

  const rawCode = code?.trim();
  if (!rawCode) return trimmedTitle;

  for (const variant of buildCodeVariants(rawCode)) {
    for (const pattern of [
      flexibleCodePrefixPattern(variant),
      exactCodePrefixPattern(variant),
    ]) {
      if (pattern.test(trimmedTitle)) {
        return normalizeWhitespace(trimmedTitle.replace(pattern, ""));
      }
    }
  }

  return trimmedTitle;
}

/** Badge-Code + bereinigter Titel für Kurslisten. */
export function formatCourseCodeTitle(
  code: string | null | undefined,
  title: string
): { code: string | null; displayTitle: string } {
  const normalizedCode = code?.trim() || null;
  const displayTitle =
    stripLeadingCourseCode(normalizedCode, title) || title.trim() || "—";
  return { code: normalizedCode, displayTitle };
}

/** Flache Textzeile für Checkbox-Labels o. Ä. */
export function formatCourseLabel(
  code: string | null | undefined,
  title: string
): string {
  const { code: badge, displayTitle } = formatCourseCodeTitle(code, title);
  if (badge && displayTitle) return `${badge} ${displayTitle}`;
  return badge ?? displayTitle ?? "—";
}

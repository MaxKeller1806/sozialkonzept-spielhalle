/** Escaped Regex-Sonderzeichen für Code-Vergleiche. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Entfernt einen führenden Kurs-/BAV-Code aus dem Titel (Anzeige only).
 * Robust gegen BAV-N10, n10, N10 usw.
 */
export function stripLeadingCourseCode(
  code: string | null | undefined,
  title: string
): string {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return trimmedTitle;

  const rawCode = code?.trim();
  if (!rawCode) return trimmedTitle;

  const variants = new Set<string>();
  variants.add(rawCode);
  variants.add(rawCode.toUpperCase());
  variants.add(rawCode.toLowerCase());
  if (/^BAV-/i.test(rawCode)) {
    variants.add(rawCode.replace(/^BAV-/i, ""));
  } else {
    variants.add(`BAV-${rawCode}`);
  }

  for (const variant of variants) {
    if (!variant) continue;
    const pattern = new RegExp(`^${escapeRegex(variant)}(?:\\s+|$)`, "i");
    if (pattern.test(trimmedTitle)) {
      return trimmedTitle.replace(pattern, "").trim();
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

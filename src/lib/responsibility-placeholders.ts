/**
 * Dokumentenvariablen für Zertifikat-/Nachweis-Designer.
 * Beispiel: {{responsible_person_sozialkonzept}}
 */

export function responsibilityPlaceholderKey(slug: string): string {
  const normalized = slug.trim().toLowerCase().replace(/-/g, "_");
  return `responsible_person_${normalized}`;
}

export function formatResponsibilityPlaceholder(slug: string): string {
  return `{{${responsibilityPlaceholderKey(slug)}}}`;
}

export type ResponsibilityPlaceholderMap = Record<string, string>;

export function buildResponsibilityPlaceholderMap(
  entries: Array<{ slug: string; personName: string }>
): ResponsibilityPlaceholderMap {
  const map: ResponsibilityPlaceholderMap = {};
  for (const entry of entries) {
    if (!entry.personName.trim()) continue;
    map[responsibilityPlaceholderKey(entry.slug)] = entry.personName.trim();
  }
  return map;
}

/** Alle bekannten Platzhalter-Schlüssel für aktive Verantwortungstypen. */
export function listResponsibilityPlaceholderKeys(
  slugs: string[]
): string[] {
  return slugs.map((slug) => responsibilityPlaceholderKey(slug));
}

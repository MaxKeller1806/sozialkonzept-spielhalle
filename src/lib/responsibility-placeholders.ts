/**
 * Dokumentenvariablen für Zertifikat-/Nachweis-Designer.
 * Beispiel: {{responsible_person_sozialkonzept}}
 */

export const GENERIC_RESPONSIBLE_PERSON_KEY = "responsible_person";
export const GENERIC_RESPONSIBILITY_NAME_KEY = "responsibility_name";
export const GENERIC_RESPONSIBLE_EMAIL_KEY = "responsible_email";

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

export type GenericResponsibilityContext = {
  responsiblePerson: string;
  responsibilityName: string;
  responsibleEmail: string;
};

export function applyResponsibilityPlaceholders(
  text: string,
  slugMap: ResponsibilityPlaceholderMap,
  generic?: GenericResponsibilityContext | null
): string {
  let result = text;
  for (const [key, value] of Object.entries(slugMap)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  if (generic) {
    result = result
      .replace(
        new RegExp(`\\{\\{${GENERIC_RESPONSIBLE_PERSON_KEY}\\}\\}`, "g"),
        generic.responsiblePerson
      )
      .replace(
        new RegExp(`\\{\\{${GENERIC_RESPONSIBILITY_NAME_KEY}\\}\\}`, "g"),
        generic.responsibilityName
      )
      .replace(
        new RegExp(`\\{\\{${GENERIC_RESPONSIBLE_EMAIL_KEY}\\}\\}`, "g"),
        generic.responsibleEmail
      );
  }
  return result;
}

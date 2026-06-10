const UNKNOWN_CONTACT_LABEL = "k.A.";

/** Anzeige des Ansprechpartners in Listen (leer/NULL → k.A.). */
export function formatContactPersonDisplay(
  value: string | null | undefined
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_CONTACT_LABEL;
}

export { UNKNOWN_CONTACT_LABEL };

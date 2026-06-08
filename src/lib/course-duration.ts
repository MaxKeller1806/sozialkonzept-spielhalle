/** Anzeige geschätzter Bearbeitungsdauer (z. B. „ca. 7 Minuten“). */
export function formatEstimatedDuration(
  minutes: number | null | undefined
): string | null {
  if (minutes == null || minutes <= 0) return null;
  return `ca. ${minutes} Minuten`;
}

/** Summe der geschätzten Minuten für eine Kursliste. */
export function sumEstimatedDurationMinutes(
  courses: { estimatedDurationMinutes?: number | null }[]
): number {
  return courses.reduce(
    (sum, c) => sum + Math.max(0, c.estimatedDurationMinutes ?? 0),
    0
  );
}

/** Kurzlabel für Auswahl-Zusammenfassung (z. B. „47 Minuten“). */
export function formatDurationSummary(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  return `${totalMinutes} Minuten`;
}

export type InhalteBereich =
  | "uebersicht"
  | "module"
  | "fragen"
  | "export"
  | "einstellungen";

export const DEFAULT_INHALTE_BEREICH: InhalteBereich = "uebersicht";

export const INHALTE_BEREICH_LABELS: Record<InhalteBereich, string> = {
  uebersicht: "Übersicht",
  module: "Module",
  fragen: "Prüfungsfragen",
  export: "Export",
  einstellungen: "Einstellungen",
};

const VALID_BEREICHE = new Set<string>(Object.keys(INHALTE_BEREICH_LABELS));

export function parseInhalteBereich(value: string | null | undefined): InhalteBereich {
  if (value && VALID_BEREICHE.has(value)) {
    return value as InhalteBereich;
  }
  return DEFAULT_INHALTE_BEREICH;
}

export type CourseInhalteHubOptions = {
  bereich?: InhalteBereich;
  modul?: string | number | "neu";
};

/** Hub-URL für Kursinhalte mit optionalem Bereich und Modul-Kontext. */
export function courseInhalteHubHref(
  courseId: string,
  options?: CourseInhalteHubOptions
): string {
  const params = new URLSearchParams({ courseId });
  const bereich = options?.bereich ?? DEFAULT_INHALTE_BEREICH;
  if (bereich !== DEFAULT_INHALTE_BEREICH) {
    params.set("bereich", bereich);
  }
  if (options?.modul != null && options.modul !== "") {
    params.set("modul", String(options.modul));
  }
  return `/dashboard/inhalte?${params.toString()}`;
}

export function courseInhalteQuery(
  courseId: string,
  options?: CourseInhalteHubOptions
): string {
  const href = courseInhalteHubHref(courseId, options);
  return href.slice(href.indexOf("?"));
}

import { stripLeadingCourseCode } from "./course-display";

export type SeminarPdfDocumentType = "lerninhalte" | "test";

const DOC_LABEL: Record<SeminarPdfDocumentType, string> = {
  lerninhalte: "Lerninhalte",
  test: "Test",
};

/** ASCII-sicherer Dateiname ohne Sonderzeichen. */
export function slugifyFilenameSegment(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeVersionSegment(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) return "v1.0";
  return trimmed.startsWith("v") || trimmed.startsWith("V")
    ? `v${trimmed.slice(1)}`
    : `v${trimmed}`;
}

function formatTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("") + `-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function buildSeminarPdfFilename(opts: {
  instructionCode?: string | null;
  instructionTitle?: string | null;
  courseName: string;
  version: string;
  documentType: SeminarPdfDocumentType;
  includeTimestamp?: boolean;
  exportedAt?: Date;
}): string {
  const code = opts.instructionCode?.trim().toUpperCase() || null;
  const titleBase = code
    ? opts.instructionTitle?.trim() ||
      stripLeadingCourseCode(code, opts.courseName) ||
      opts.courseName.trim()
    : opts.courseName.trim() || opts.instructionTitle?.trim() || "";

  const titleSlug = slugifyFilenameSegment(titleBase);
  const versionSlug = normalizeVersionSegment(opts.version);
  const docLabel = DOC_LABEL[opts.documentType];

  const parts: string[] = [];
  if (code) {
    parts.push(code);
    if (titleSlug) parts.push(titleSlug);
  } else if (titleSlug) {
    parts.push(titleSlug);
  }

  parts.push(docLabel, versionSlug);

  if (opts.includeTimestamp) {
    parts.push(formatTimestamp(opts.exportedAt ?? new Date()));
  }

  return `${parts.filter(Boolean).join("-")}.pdf`;
}

export function pdfAttachmentContentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/"/g, "")}"`;
}

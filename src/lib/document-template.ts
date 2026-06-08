/**
 * Dokumentvorlagen für Zertifikate und Nachweise (Designer-Vorbereitung).
 * Built-in-Defaults entsprechen dem historischen PDF-Layout in pdf.ts (V0).
 */

export type {
  DocumentTemplate,
  DocumentTemplateConfig,
  DocumentTemplateConfigSignature,
  DocumentTemplateConfigStyling,
  DocumentTemplateConfigVisibility,
  DocumentTemplateRevision,
  DocumentTemplateRevisionStatus,
  DocumentType,
  GlobalDocumentTemplateDetail,
} from "./document-template-shared";

export {
  DEFAULT_SIGNATURE_PERSON_LABEL,
  DEFAULT_SIGNATURE_POSITION_LABEL,
  DOCUMENT_TYPE_LABELS,
} from "./document-template-shared";

import {
  DEFAULT_SIGNATURE_PERSON_LABEL,
  DEFAULT_SIGNATURE_POSITION_LABEL,
  type DocumentTemplateConfig,
  type DocumentTemplateConfigSignature,
  type DocumentTemplateConfigVisibility,
  type DocumentType,
} from "./document-template-shared";

export const DOCUMENT_TEMPLATE_CONFIG_SCHEMA_VERSION = 2;

/** Historisches Layout – entspricht generateCertificatePdf() vor Template-Integration. */
const BUILTIN_CERTIFICATE_CONFIG: DocumentTemplateConfig = {
  layoutVersion: 1,
  title: "{{courseCertificateTitle}}",
  subtitle: "",
  bodyText:
    "Hiermit wird bestätigt, dass die oben genannte Person die Schulung „{{courseName}}“ erfolgreich abgeschlossen hat.",
  footerText: "Certiano Campus",
  visibility: {
    companyLogo: false,
    certianoLogo: false,
    bavCode: true,
    validUntil: true,
    examScore: true,
    signatureBlock: false,
    qrCode: true,
  },
  signature: {
    personLabel: DEFAULT_SIGNATURE_PERSON_LABEL,
    positionLabel: DEFAULT_SIGNATURE_POSITION_LABEL,
  },
  styling: {
    primaryColor: "#000080",
  },
};

/** Historisches Nachweis-Layout – ohne Prüfungsergebnis, Unterweisungswording. */
const BUILTIN_PROOF_CONFIG: DocumentTemplateConfig = {
  layoutVersion: 1,
  title: "{{courseCertificateTitle}}",
  subtitle: "",
  bodyText:
    "Hiermit wird bestätigt, dass die oben genannte Person die Unterweisung „{{courseName}}“ erfolgreich abgeschlossen hat.",
  footerText: "Certiano Campus",
  visibility: {
    companyLogo: false,
    certianoLogo: false,
    bavCode: true,
    validUntil: true,
    examScore: false,
    signatureBlock: false,
    qrCode: true,
  },
  signature: {
    personLabel: DEFAULT_SIGNATURE_PERSON_LABEL,
    positionLabel: DEFAULT_SIGNATURE_POSITION_LABEL,
  },
  styling: {
    primaryColor: "#000080",
  },
};

export const BUILTIN_DOCUMENT_TEMPLATE_CONFIG: Record<
  DocumentType,
  DocumentTemplateConfig
> = {
  certificate: BUILTIN_CERTIFICATE_CONFIG,
  proof: BUILTIN_PROOF_CONFIG,
};

export function getBuiltinDocumentTemplateConfig(
  documentType: DocumentType
): DocumentTemplateConfig {
  return structuredClone(BUILTIN_DOCUMENT_TEMPLATE_CONFIG[documentType]);
}

function mergeSignature(
  base: DocumentTemplateConfigSignature,
  patch?: Partial<DocumentTemplateConfigSignature>
): DocumentTemplateConfigSignature {
  return {
    personLabel: patch?.personLabel?.trim() || base.personLabel,
    positionLabel: patch?.positionLabel?.trim() || base.positionLabel,
  };
}

/** Liest gespeicherte Config (inkl. Legacy-Felder) in das aktuelle Schema. */
export function normalizeDocumentTemplateConfig(
  raw: unknown,
  documentType: DocumentType = "certificate"
): DocumentTemplateConfig {
  const builtin = getBuiltinDocumentTemplateConfig(documentType);
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawSignature =
    obj.signature && typeof obj.signature === "object"
      ? (obj.signature as Record<string, unknown>)
      : {};
  const rawVisibility =
    obj.visibility && typeof obj.visibility === "object"
      ? (obj.visibility as Partial<DocumentTemplateConfigVisibility>)
      : {};
  const rawStyling =
    obj.styling && typeof obj.styling === "object"
      ? (obj.styling as Record<string, unknown>)
      : {};

  return {
    layoutVersion: Number(obj.layoutVersion ?? builtin.layoutVersion),
    title: String(obj.title ?? builtin.title),
    subtitle: String(obj.subtitle ?? builtin.subtitle),
    bodyText: String(obj.bodyText ?? builtin.bodyText),
    footerText: String(obj.footerText ?? builtin.footerText),
    visibility: { ...builtin.visibility, ...rawVisibility },
    signature: {
      personLabel:
        typeof rawSignature.personLabel === "string" &&
        rawSignature.personLabel.trim()
          ? rawSignature.personLabel.trim()
          : DEFAULT_SIGNATURE_PERSON_LABEL,
      positionLabel:
        typeof rawSignature.positionLabel === "string" &&
        rawSignature.positionLabel.trim()
          ? rawSignature.positionLabel.trim()
          : DEFAULT_SIGNATURE_POSITION_LABEL,
    },
    styling: {
      primaryColor:
        typeof rawStyling.primaryColor === "string" && rawStyling.primaryColor
          ? rawStyling.primaryColor
          : builtin.styling.primaryColor,
    },
  };
}

/** Entfernt Legacy-Signaturwerte vor dem Speichern in Revisionen. */
export function sanitizeDocumentTemplateConfigForStorage(
  config: DocumentTemplateConfig,
  documentType: DocumentType = "certificate"
): DocumentTemplateConfig {
  return normalizeDocumentTemplateConfig(config, documentType);
}

export function isDocumentType(value: string): value is DocumentType {
  return value === "certificate" || value === "proof";
}

export function isDocumentTemplateRevisionStatus(
  value: string
): value is import("./document-template-shared").DocumentTemplateRevisionStatus {
  return value === "draft" || value === "published" || value === "superseded";
}

/** document_type für Ausstellung: Nachweis nur bei reiner Proof-Pflicht ohne Zertifikat. */
export function resolveDocumentTypeFromCourseMeta(meta: {
  requiresCertificate: boolean;
  requiresProof: boolean;
}): DocumentType {
  if (meta.requiresProof && !meta.requiresCertificate) {
    return "proof";
  }
  return "certificate";
}

export type DocumentTemplateConfigPatch = Partial<
  Omit<DocumentTemplateConfig, "visibility" | "signature" | "styling">
> & {
  visibility?: Partial<DocumentTemplateConfigVisibility>;
  signature?: Partial<DocumentTemplateConfigSignature>;
  styling?: Partial<DocumentTemplateConfig["styling"]>;
};

export function mergeDocumentTemplateConfig(
  current: DocumentTemplateConfig,
  patch: DocumentTemplateConfigPatch
): DocumentTemplateConfig {
  return {
    layoutVersion: patch.layoutVersion ?? current.layoutVersion,
    title: patch.title ?? current.title,
    subtitle: patch.subtitle ?? current.subtitle,
    bodyText: patch.bodyText ?? current.bodyText,
    footerText: patch.footerText ?? current.footerText,
    visibility: { ...current.visibility, ...patch.visibility },
    signature: mergeSignature(current.signature, patch.signature),
    styling: { ...current.styling, ...patch.styling },
  };
}

export function documentTemplateApiError(
  message: string
): { status: number; error: string } | null {
  switch (message) {
    case "TEMPLATE_NOT_FOUND":
      return { status: 404, error: "Vorlage nicht gefunden." };
    case "DRAFT_ALREADY_EXISTS":
      return { status: 409, error: "Es existiert bereits ein Entwurf." };
    case "NO_DRAFT_REVISION":
      return { status: 400, error: "Kein Entwurf vorhanden." };
    case "NO_PUBLISHED_REVISION":
      return { status: 400, error: "Keine veröffentlichte Revision vorhanden." };
    case "NO_REVISION_FOR_PREVIEW":
      return { status: 400, error: "Keine Revision für die Vorschau vorhanden." };
    default:
      return null;
  }
}

export {
  createDraftFromPublished,
  createGlobalDocumentTemplateDraft,
  getDefaultPublishedDocumentTemplateRevision,
  getDocumentTemplateRevisionById,
  getGlobalDocumentTemplateDetail,
  listGlobalDocumentTemplates,
  publishDraftRevision,
  publishGlobalDocumentTemplateDraft,
  seedGlobalDocumentTemplates,
  updateGlobalDocumentTemplateDraftConfig,
} from "./document-template-db";
export { generateGlobalDocumentTemplatePreviewPdf } from "./document-template-preview";

/**
 * Client-sichere Typen und Konstanten für Dokumentvorlagen (ohne DB-Imports).
 */

export type DocumentType = "certificate" | "proof";

export type DocumentTemplateRevisionStatus =
  | "draft"
  | "published"
  | "superseded";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  certificate: "Zertifikat",
  proof: "Nachweis",
};

export const DEFAULT_SIGNATURE_PERSON_LABEL = "Verantwortliche Person";
export const DEFAULT_SIGNATURE_POSITION_LABEL = "Position / Funktion";

export interface DocumentTemplateConfigVisibility {
  companyLogo: boolean;
  certianoLogo: boolean;
  bavCode: boolean;
  validUntil: boolean;
  examScore: boolean;
  signatureBlock: boolean;
  qrCode: boolean;
}

export interface DocumentTemplateConfigSignature {
  personLabel: string;
  positionLabel: string;
}

export interface DocumentTemplateConfigStyling {
  primaryColor: string;
}

export interface DocumentTemplateConfig {
  layoutVersion: number;
  title: string;
  subtitle: string;
  bodyText: string;
  footerText: string;
  visibility: DocumentTemplateConfigVisibility;
  signature: DocumentTemplateConfigSignature;
  styling: DocumentTemplateConfigStyling;
}

export interface DocumentTemplate {
  id: number;
  companyId: number | null;
  documentType: DocumentType;
  name: string;
  description: string | null;
  isDefault: boolean;
  draftRevisionId: number | null;
  publishedRevisionId: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
}

export interface DocumentTemplateRevision {
  id: number;
  templateId: number;
  revisionNumber: number;
  status: DocumentTemplateRevisionStatus;
  config: DocumentTemplateConfig;
  configSchemaVersion: number;
  publishedAt: string | null;
  publishedBy: number | null;
  createdAt: string;
  supersededAt: string | null;
}

export type GlobalDocumentTemplateDetail = {
  template: DocumentTemplate;
  publishedRevision: DocumentTemplateRevision | null;
  draftRevision: DocumentTemplateRevision | null;
};

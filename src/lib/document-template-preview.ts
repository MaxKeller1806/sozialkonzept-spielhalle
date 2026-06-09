import { generateCertificatePdf } from "./pdf";
import type { Certificate, CourseData, User } from "./types";
import type { DocumentType } from "./document-template";
import { getGlobalDocumentTemplateDetail } from "./document-template-db";

function buildPreviewFixtures(documentType: DocumentType): {
  user: User;
  cert: Certificate;
  course: CourseData;
} {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const isProof = documentType === "proof";

  return {
    user: {
      id: 0,
      companyId: null,
      firstName: "Max",
      lastName: "Mustermann",
      email: "preview@example.local",
      birthDate: "1990-05-15",
      birthPlace: null,
      placeOfResidence: null,
      street: null,
      houseNumber: null,
      postalCode: null,
      city: null,
      role: "employee",
      location: "Beispiel-Spielhalle",
      locationId: null,
      adminScope: "company",
      adminLocationId: null,
      active: 1,
      mustChangePassword: 0,
      employeeCategoryId: null,
      joinedCompanyAt: null,
      leftCompanyAt: null,
      createdAt: now.toISOString(),
    },
    cert: {
      id: 0,
      certificateNumber: "SK-PREVIEW-000001",
      userId: 0,
      companyId: null,
      courseId: "preview-course",
      issuedAt: now.toISOString(),
      validUntil: validUntil.toISOString(),
      score: 92,
      verificationToken: "00000000-0000-4000-8000-000000000001",
      revoked: 0,
      templateRevisionId: null,
    },
    course: {
      courseId: "preview-course",
      courseName: isProof
        ? "Beispiel-Unterweisung Überfallprävention"
        : "Beispiel-Schulung Sozialkonzept",
      version: "2026.1",
      durationMinutes: 60,
      maxDurationMinutes: 90,
      recommendedMinutes: "60",
      passingScore: 80,
      minCorrectAnswers: 12,
      totalQuestions: 15,
      certificateValidityMonths: 12,
      certificateTitle: isProof ? "Nachweis Unterweisung" : "Schulungszertifikat",
      modules: [],
      exam: [],
    },
  };
}

export async function generateGlobalDocumentTemplatePreviewPdf(
  templateId: number,
  options?: { useDraft?: boolean }
): Promise<{ pdf: Buffer; filename: string }> {
  const detail = await getGlobalDocumentTemplateDetail(templateId);
  if (!detail) throw new Error("TEMPLATE_NOT_FOUND");

  const useDraft = options?.useDraft !== false;
  const revision =
    useDraft && detail.draftRevision
      ? detail.draftRevision
      : detail.publishedRevision ?? detail.draftRevision;
  if (!revision) throw new Error("NO_REVISION_FOR_PREVIEW");

  const { user, cert, course } = buildPreviewFixtures(detail.template.documentType);
  const pdf = await generateCertificatePdf(user, cert, course, {
    companyName: "Beispiel Spielhalle GmbH",
    branding: {
      primaryColor: revision.config.styling.primaryColor,
      secondaryColor: "#4040a0",
      backgroundColor: "#f8fafc",
      accentColor: "#2563eb",
      logoUrl: null,
      loginBackgroundUrl: null,
    },
    documentSignature: {
      responsiblePerson: "Beispiel Person",
      position: "Beispiel Funktion",
      customText: null,
    },
    instructionCode: "N7",
    instructionTitle: "Verhalten bei einem Überfall",
    templateConfig: revision.config,
  });

  return {
    pdf,
    filename: `preview-${detail.template.documentType}.pdf`,
  };
}

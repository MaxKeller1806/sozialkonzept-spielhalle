import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getAppUrl } from "./certificate";
import type { DocumentTemplateConfig } from "./document-template";
import type {
  Certificate,
  CompanyBranding,
  CompanyDocumentSignature,
  CourseData,
  User,
} from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type TemplatePlaceholderContext = {
  courseCertificateTitle: string;
  courseName: string;
  courseVersion: string;
  firstName: string;
  lastName: string;
  certificateNumber: string;
  issuedAt: string;
  validUntil: string;
  score: string;
  instructionCode: string;
  instructionTitle: string;
  companyName: string;
};

function applyTemplatePlaceholders(
  text: string,
  ctx: TemplatePlaceholderContext
): string {
  return text
    .replace(/\{\{courseCertificateTitle\}\}/g, ctx.courseCertificateTitle)
    .replace(/\{\{courseName\}\}/g, ctx.courseName)
    .replace(/\{\{courseVersion\}\}/g, ctx.courseVersion)
    .replace(/\{\{firstName\}\}/g, ctx.firstName)
    .replace(/\{\{lastName\}\}/g, ctx.lastName)
    .replace(/\{\{certificateNumber\}\}/g, ctx.certificateNumber)
    .replace(/\{\{issuedAt\}\}/g, ctx.issuedAt)
    .replace(/\{\{validUntil\}\}/g, ctx.validUntil)
    .replace(/\{\{score\}\}/g, ctx.score)
    .replace(/\{\{instructionCode\}\}/g, ctx.instructionCode)
    .replace(/\{\{instructionTitle\}\}/g, ctx.instructionTitle)
    .replace(/\{\{companyName\}\}/g, ctx.companyName);
}

export async function generateCertificatePdf(
  user: User,
  cert: Certificate,
  course: CourseData,
  opts?: {
    companyName?: string;
    branding?: CompanyBranding;
    documentSignature?: CompanyDocumentSignature;
    instructionCode?: string | null;
    instructionTitle?: string | null;
    templateConfig?: DocumentTemplateConfig;
  }
): Promise<Buffer> {
  const verifyUrl = `${getAppUrl()}/verify/${cert.verificationToken}`;
  const qrBuffer = opts?.templateConfig?.visibility.qrCode
    ? await QRCode.toBuffer(verifyUrl, { width: 140, margin: 1 })
    : null;

  if (opts?.templateConfig) {
    return generateCertificatePdfFromTemplate(
      user,
      cert,
      course,
      opts.templateConfig,
      opts,
      qrBuffer
    );
  }

  const qrLegacyBuffer =
    qrBuffer ?? (await QRCode.toBuffer(verifyUrl, { width: 140, margin: 1 }));
  const primary = opts?.branding?.primaryColor ?? "#000080";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.info.Title = course.certificateTitle;
    doc.info.Author = opts?.companyName ?? "Certiano Campus";
    doc.info.Subject = course.certificateTitle;

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (opts?.companyName) {
      doc.fontSize(11).fillColor("#666").text(opts.companyName, { align: "center" });
      doc.moveDown(0.5);
    }

    doc.fontSize(22).fillColor(primary).text(course.certificateTitle, { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .fillColor("#555")
      .text(`Kursversion ${course.version}`, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(12).fillColor("#000");
    const fields: [string, string][] = [
      ["Vorname", user.firstName],
      ["Nachname", user.lastName],
    ];

    if (opts?.instructionCode) {
      fields.push(["BAV-Code", opts.instructionCode]);
    }
    if (opts?.instructionTitle) {
      fields.push(["Unterweisung", opts.instructionTitle]);
    }

    fields.push(
      ["Geburtsdatum", user.birthDate ? formatDate(user.birthDate) : "—"],
      ["Spielhalle", user.location ?? "—"],
      ["Abschlussdatum", formatDate(cert.issuedAt)],
      ["Prüfungsergebnis", `${cert.score.toFixed(0)} %`],
      ["Gültig bis", cert.validUntil ? formatDate(cert.validUntil) : "Unbegrenzt gültig"],
      ["Zertifikatsnummer", cert.certificateNumber]
    );

    for (const [label, value] of fields) {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
      doc.moveDown(0.4);
    }

    doc.moveDown(1);
    doc
      .fontSize(9)
      .fillColor("#999")
      .text("Certiano Campus", { align: "center" });
    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `Hiermit wird bestätigt, dass die oben genannte Person die Schulung „${course.courseName}“ erfolgreich abgeschlossen hat.`,
        { align: "left" }
      );

    doc.image(qrLegacyBuffer, doc.page.width - 150, doc.page.height - 150, {
      width: 100,
    });
    doc
      .fontSize(8)
      .fillColor("#888")
      .text("QR-Code zur Online-Verifikation", doc.page.width - 155, doc.page.height - 45, {
        width: 110,
        align: "center",
      });

    doc.end();
  });
}

function renderSignatureBlock(
  doc: PDFKit.PDFDocument,
  templateConfig: DocumentTemplateConfig,
  opts: {
    companyName?: string;
    documentSignature?: CompanyDocumentSignature;
  }
) {
  const personLabel =
    templateConfig.signature.personLabel.trim() || "Verantwortliche Person";
  const positionLabel =
    templateConfig.signature.positionLabel.trim() || "Position / Funktion";
  const customText = opts.documentSignature?.customText?.trim() ?? "";
  const person = opts.documentSignature?.responsiblePerson?.trim() ?? "";
  const position = opts.documentSignature?.position?.trim() ?? "";
  const companyName = opts.companyName?.trim() ?? "";

  let rendered = false;

  if (customText) {
    doc.fontSize(10).font("Helvetica").fillColor("#333").text(customText);
    doc.moveDown(0.5);
    rendered = true;
  }

  if (person) {
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#666").text(personLabel);
    doc.moveDown(0.15);
    doc.fontSize(11).font("Helvetica").fillColor("#000").text(person);
    doc.moveDown(0.35);
    rendered = true;
  }

  if (position) {
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#666").text(positionLabel);
    doc.moveDown(0.15);
    doc.fontSize(11).font("Helvetica").fillColor("#000").text(position);
    doc.moveDown(0.35);
    rendered = true;
  }

  if (!rendered && companyName) {
    doc.fontSize(11).font("Helvetica").fillColor("#000").text(companyName);
  }
}

function generateCertificatePdfFromTemplate(
  user: User,
  cert: Certificate,
  course: CourseData,
  templateConfig: DocumentTemplateConfig,
  opts: {
    companyName?: string;
    branding?: CompanyBranding;
    documentSignature?: CompanyDocumentSignature;
    instructionCode?: string | null;
    instructionTitle?: string | null;
  },
  qrBuffer: Buffer | null
): Promise<Buffer> {
  const primary =
    templateConfig.styling.primaryColor ||
    opts.branding?.primaryColor ||
    "#000080";
  const ctx: TemplatePlaceholderContext = {
    courseCertificateTitle: course.certificateTitle,
    courseName: course.courseName,
    courseVersion: course.version,
    firstName: user.firstName,
    lastName: user.lastName,
    certificateNumber: cert.certificateNumber,
    issuedAt: formatDate(cert.issuedAt),
    validUntil: cert.validUntil ? formatDate(cert.validUntil) : "Unbegrenzt gültig",
    score: `${cert.score.toFixed(0)} %`,
    instructionCode: opts.instructionCode ?? "",
    instructionTitle: opts.instructionTitle ?? "",
    companyName: opts.companyName ?? "",
  };
  const title = applyTemplatePlaceholders(templateConfig.title, ctx);
  const subtitle = applyTemplatePlaceholders(templateConfig.subtitle, ctx);
  const bodyText = applyTemplatePlaceholders(templateConfig.bodyText, ctx);
  const footerText = applyTemplatePlaceholders(templateConfig.footerText, ctx);
  const { visibility } = templateConfig;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.info.Title = title;
    doc.info.Author = opts.companyName ?? "Certiano Campus";
    doc.info.Subject = title;

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (visibility.companyLogo && opts.companyName) {
      doc.fontSize(11).fillColor("#666").text(opts.companyName, { align: "center" });
      doc.moveDown(0.5);
    }

    doc.fontSize(22).fillColor(primary).text(title, { align: "center" });
    if (subtitle.trim()) {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#555").text(subtitle, { align: "center" });
    }
    doc.moveDown(2);

    doc.fontSize(12).fillColor("#000");
    const fields: [string, string][] = [
      ["Vorname", user.firstName],
      ["Nachname", user.lastName],
    ];

    if (visibility.bavCode && opts.instructionCode) {
      fields.push(["BAV-Code", opts.instructionCode]);
    }
    if (visibility.bavCode && opts.instructionTitle) {
      fields.push(["Unterweisung", opts.instructionTitle]);
    }

    fields.push(
      ["Geburtsdatum", user.birthDate ? formatDate(user.birthDate) : "—"],
      ["Spielhalle", user.location ?? "—"],
      ["Abschlussdatum", formatDate(cert.issuedAt)]
    );

    if (visibility.examScore) {
      fields.push(["Prüfungsergebnis", `${cert.score.toFixed(0)} %`]);
    }
    if (visibility.validUntil) {
      fields.push([
        "Gültig bis",
        cert.validUntil ? formatDate(cert.validUntil) : "Unbegrenzt gültig",
      ]);
    }

    fields.push(["Zertifikatsnummer", cert.certificateNumber]);

    for (const [label, value] of fields) {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
      doc.moveDown(0.4);
    }

    if (visibility.signatureBlock) {
      doc.moveDown(1);
      renderSignatureBlock(doc, templateConfig, {
        companyName: opts.companyName,
        documentSignature: opts.documentSignature,
      });
    }

    doc.moveDown(1);
    if (visibility.certianoLogo && footerText.trim()) {
      doc.fontSize(9).fillColor("#999").text(footerText, { align: "center" });
      doc.moveDown(0.5);
    }

    if (bodyText.trim()) {
      doc.fontSize(10).fillColor("#666").text(bodyText, { align: "left" });
    }

    if (visibility.qrCode && qrBuffer) {
      doc.image(qrBuffer, doc.page.width - 150, doc.page.height - 150, {
        width: 100,
      });
      doc
        .fontSize(8)
        .fillColor("#888")
        .text(
          "QR-Code zur Online-Verifikation",
          doc.page.width - 155,
          doc.page.height - 45,
          { width: 110, align: "center" }
        );
    }

    doc.end();
  });
}

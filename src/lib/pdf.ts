import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getCourse } from "./course";
import { getAppUrl } from "./certificate";
import type { Certificate, User } from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function generateCertificatePdf(
  user: User,
  cert: Certificate
): Promise<Buffer> {
  const course = getCourse();
  const verifyUrl = `${getAppUrl()}/verify/${cert.verificationToken}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 140, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.info.Title = course.certificateTitle;
    doc.info.Author = "Sozialkonzept Schulungsplattform";
    doc.info.Subject = "Schulungszertifikat Spielerschutz und Sozialkonzept";
    doc.info.Keywords = "Zertifikat, Schulung, Sozialkonzept, Spielerschutz";

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(22)
      .fillColor("#000080")
      .text(course.certificateTitle, { align: "center" });
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
      ["Geburtsdatum", user.birthDate ? formatDate(user.birthDate) : "—"],
      ["Spielhalle", user.location ?? "—"],
      ["Abschlussdatum", formatDate(cert.issuedAt)],
      ["Prüfungsergebnis", `${cert.score.toFixed(0)} %`],
      ["Gültig bis", formatDate(cert.validUntil)],
      ["Zertifikatsnummer", cert.certificateNumber],
    ];

    for (const [label, value] of fields) {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
      doc.moveDown(0.4);
    }

    doc.moveDown(1);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        "Hiermit wird bestätigt, dass die oben genannte Person die Schulung „Spielerschutz und Sozialkonzept“ erfolgreich abgeschlossen hat.",
        { align: "left" }
      );

    doc.image(qrBuffer, doc.page.width - 150, doc.page.height - 150, {
      width: 100,
    });
    doc
      .fontSize(8)
      .fillColor("#888")
      .text("QR-Code zur Online-Verifikation", doc.page.width - 155, doc.page.height - 45, {
        width: 110,
        align: "center",
      });
    doc
      .fontSize(8)
      .fillColor("#666")
      .text(`Verifikations-URL: ${verifyUrl}`, 50, doc.page.height - 60, {
        width: doc.page.width - 200,
        align: "left",
      });

    doc.end();
  });
}

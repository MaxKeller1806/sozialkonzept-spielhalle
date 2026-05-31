import PDFDocument from "pdfkit";
import type { CompanyBranding, CourseData, ExamQuestion } from "./types";

function createPdfBuffer(
  build: (doc: InstanceType<typeof PDFDocument>) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function formatCorrectAnswer(q: ExamQuestion): string {
  if (q.type === "boolean") {
    return q.correct ? "Richtig (wahr)" : "Falsch";
  }
  if (q.type === "single" && q.answers) {
    const idx = q.correct as number;
    return q.answers[idx] ?? "—";
  }
  if (q.type === "multiple" && q.answers) {
    const indices = q.correct as number[];
    return indices.map((i) => q.answers![i]).join("; ");
  }
  return "—";
}

export async function generateLearningContentPdf(
  course: CourseData,
  opts?: { companyName?: string; branding?: CompanyBranding }
): Promise<Buffer> {
  const exportedAt = new Date().toLocaleString("de-DE");
  const primary = opts?.branding?.primaryColor ?? "#000080";

  return createPdfBuffer((doc) => {
    if (opts?.companyName) {
      doc.fontSize(11).fillColor("#666").text(opts.companyName, { align: "center" });
      doc.moveDown(0.3);
    }
    doc
      .fontSize(20)
      .fillColor(primary)
      .text(`Lerninhalte – ${course.courseName}`, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Version ${course.version} · Export: ${exportedAt}`, { align: "center" });
    doc.moveDown(1.5);

    doc
      .fontSize(9)
      .fillColor("#888")
      .text(
        "Dokumentation der Schulungsinhalte zur Vorlage gegenüber Behörden.",
        { align: "left" }
      );
    doc.moveDown(1);

    for (let i = 0; i < course.modules.length; i++) {
      const mod = course.modules[i];
      if (i > 0) doc.addPage();
      doc.fontSize(16).fillColor(primary).text(`Modul ${mod.id}: ${mod.title}`);
      doc
        .fontSize(10)
        .fillColor("#666")
        .text(`Geplante Dauer: ca. ${mod.duration} Minuten`);
      doc.moveDown(0.8);

      for (const lesson of mod.lessons) {
        doc.fontSize(12).fillColor("#000").font("Helvetica-Bold").text(lesson.title);
        doc.moveDown(0.3);
        doc.font("Helvetica").fontSize(11).fillColor("#333").text(lesson.content, {
          align: "left",
          lineGap: 4,
        });
        doc.moveDown(0.8);
      }
    }
  });
}

export async function generateExamDocumentationPdf(
  course: CourseData,
  opts?: { companyName?: string; branding?: CompanyBranding }
): Promise<Buffer> {
  const exportedAt = new Date().toLocaleString("de-DE");
  const primary = opts?.branding?.primaryColor ?? "#000080";

  return createPdfBuffer((doc) => {
    if (opts?.companyName) {
      doc.fontSize(11).fillColor("#666").text(opts.companyName, { align: "center" });
      doc.moveDown(0.3);
    }
    doc.fontSize(20).fillColor(primary).text("Abschlusstest – Fragenkatalog", {
      align: "center",
    });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `${course.courseName} · Version ${course.version} · Bestehen: ${course.passingScore} % (${course.minCorrectAnswers}/${course.totalQuestions})`,
        { align: "center" }
      );
    doc.text(`Export: ${exportedAt}`, { align: "center" });
    doc.moveDown(1);

    doc
      .fontSize(9)
      .fillColor("#b45309")
      .text(
        "VERTRAULICH – Enthält Musterlösungen. Nur für interne Aufbewahrung und Behördennachweis.",
        { align: "left" }
      );
    doc.moveDown(1);

    let qNum = 0;
    for (const mod of course.modules) {
      const questions = course.exam
        .filter((q) => q.moduleId === mod.id)
        .sort((a, b) => a.id - b.id);

      if (questions.length === 0) continue;

      doc.fontSize(14).fillColor(primary).text(`Modul ${mod.id}: ${mod.title}`);
      doc.moveDown(0.5);

      for (const q of questions) {
        qNum += 1;
        doc.fontSize(11).fillColor("#000").font("Helvetica-Bold");
        doc.text(`Frage ${qNum} (${q.type})`);
        doc.font("Helvetica").text(q.question);
        doc.moveDown(0.3);

        if (q.type !== "boolean" && q.answers) {
          q.answers.forEach((ans, i) => {
            const marker =
              q.type === "single" && q.correct === i
                ? " ✓"
                : q.type === "multiple" &&
                    Array.isArray(q.correct) &&
                    (q.correct as number[]).includes(i)
                  ? " ✓"
                  : "";
            doc.fontSize(10).text(`  • ${ans}${marker}`);
          });
        }

        doc
          .fontSize(10)
          .fillColor(primary)
          .font("Helvetica-Bold")
          .text(`Richtige Antwort: ${formatCorrectAnswer(q)}`);
        doc.font("Helvetica").fillColor("#000");
        doc.moveDown(0.6);

        if (doc.y > doc.page.height - 120) {
          doc.addPage();
        }
      }
      doc.moveDown(0.5);
    }
  });
}

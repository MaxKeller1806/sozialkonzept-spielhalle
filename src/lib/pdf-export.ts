import PDFDocument from "pdfkit";
import { blockToPlainText } from "./lesson-text";
import {
  buildPoolQuestionNumberMap,
  getQuestionTypeLabel,
  sortExamQuestionsForDisplay,
} from "./exam-pool-display";
import type { CompanyBranding, ContentBlock, CourseData, ExamQuestion } from "./types";

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

function writeBlockToPdf(
  doc: InstanceType<typeof PDFDocument>,
  block: ContentBlock,
  primary: string
) {
  const append = (text: string, opts?: { bold?: boolean; size?: number; color?: string }) => {
    if (!text.trim()) return;
    doc
      .font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(opts?.size ?? 11)
      .fillColor(opts?.color ?? "#333")
      .text(text, { align: "left", lineGap: 3 });
    doc.moveDown(0.3);
  };

  switch (block.type) {
    case "heading":
      append(block.title || block.body || "", { bold: true, size: 13, color: primary });
      break;
    case "text":
      append(block.body ?? "");
      break;
    case "info":
      append([block.title, block.body].filter(Boolean).join("\n"), {
        bold: !!block.title,
        color: primary,
      });
      break;
    case "merksatz":
      append(`Merksatz: ${block.body ?? ""}`, { bold: true, color: primary });
      break;
    case "hinweis":
      append(`${block.title ?? "Hinweis"}\n${block.body ?? ""}`, { color: "#92400e" });
      break;
    case "fehler":
      append(`${block.title ?? "Typischer Fehler"}\n${block.body ?? ""}`, { color: "#991b1b" });
      break;
    case "praxis":
      append(
        [block.title ?? "Praxisfall", block.body, block.solution ? `Empfohlene Reaktion: ${block.solution}` : ""]
          .filter(Boolean)
          .join("\n")
      );
      break;
    case "dialog":
      append(
        [
          block.title,
          ...(block.lines?.map((l) => `${l.speaker}: ${l.text}`) ?? []),
        ]
          .filter(Boolean)
          .join("\n")
      );
      break;
    case "summary":
      if (block.title) append(block.title, { bold: true });
      block.items?.forEach((item) => append(`• ${item}`));
      break;
    case "quiz":
      append(
        [
          "Wissensfrage",
          block.question,
          ...(block.answers?.map((a, i) => `${i + 1}. ${a}`) ?? []),
        ]
          .filter(Boolean)
          .join("\n")
      );
      break;
    default:
      append(blockToPlainText(block));
  }
}

function writeLessonToPdf(
  doc: InstanceType<typeof PDFDocument>,
  lesson: CourseData["modules"][0]["lessons"][0],
  primary: string
) {
  doc.fontSize(12).fillColor("#000").font("Helvetica-Bold").text(lesson.title);
  doc.moveDown(0.3);

  if (lesson.blocks?.length) {
    doc.font("Helvetica");
    for (const block of lesson.blocks) {
      writeBlockToPdf(doc, block, primary);
    }
  } else if (lesson.content) {
    doc.font("Helvetica").fontSize(11).fillColor("#333").text(lesson.content, {
      align: "left",
      lineGap: 4,
    });
  }
  doc.moveDown(0.8);
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
        writeLessonToPdf(doc, lesson, primary);
      }
    }
  });
}

export async function generateExamDocumentationPdf(
  course: CourseData,
  opts?: {
    companyName?: string;
    branding?: CompanyBranding;
    showCorrectAnswers?: boolean;
  }
): Promise<Buffer> {
  const exportedAt = new Date().toLocaleString("de-DE");
  const primary = opts?.branding?.primaryColor ?? "#000080";
  const showCorrectAnswers = opts?.showCorrectAnswers === true;

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

    if (showCorrectAnswers) {
      doc
        .fontSize(9)
        .fillColor("#b45309")
        .text(
          "VERTRAULICH – Enthält Musterlösungen. Nur für interne Aufbewahrung und Behördennachweis.",
          { align: "left" }
        );
      doc.moveDown(1);
    }

    const activeQuestions = sortExamQuestionsForDisplay(
      course.exam.filter((q) => q.active !== false)
    );
    const poolNumberMap = buildPoolQuestionNumberMap(activeQuestions);

    const questionsByModule = course.modules.flatMap((mod) => {
      const questions = activeQuestions.filter((q) => q.moduleId === mod.id);
      return questions.length > 0 ? [{ mod, questions }] : [];
    });

    const unassigned = activeQuestions.filter(
      (q) => !q.moduleId || !course.modules.some((m) => m.id === q.moduleId)
    );

    const sections =
      questionsByModule.length > 0
        ? questionsByModule
        : unassigned.length > 0
          ? [{ mod: null as null, questions: unassigned }]
          : [{ mod: null as null, questions: activeQuestions }];

    for (const { mod, questions } of sections) {
      if (questions.length === 0) continue;

      if (mod) {
        doc.fontSize(14).fillColor(primary).text(`Modul ${mod.id}: ${mod.title}`);
      } else {
        doc.fontSize(14).fillColor(primary).text("Fragenpool – Abschlusstest");
      }
      doc.moveDown(0.5);

      for (const q of questions) {
        const poolNum = poolNumberMap.get(q.id) ?? 0;
        doc.fontSize(11).fillColor("#000").font("Helvetica-Bold");
        doc.text(
          `Frage ${poolNum} (${getQuestionTypeLabel(q.poolQuestionType ?? q.type)})`
        );
        doc.font("Helvetica").text(q.question);
        doc.moveDown(0.3);

        if (q.type !== "boolean" && q.answers) {
          q.answers.forEach((ans, i) => {
            const marker =
              showCorrectAnswers &&
              (q.type === "single" && q.correct === i
                ? " ✓"
                : q.type === "multiple" &&
                    Array.isArray(q.correct) &&
                    (q.correct as number[]).includes(i)
                  ? " ✓"
                  : "");
            doc.fontSize(10).text(`  • ${ans}${marker}`);
          });
        }

        if (showCorrectAnswers) {
          doc
            .fontSize(10)
            .fillColor(primary)
            .font("Helvetica-Bold")
            .text(`Richtige Antwort: ${formatCorrectAnswer(q)}`);
          doc.font("Helvetica").fillColor("#000");
        }
        doc.moveDown(0.6);

        if (doc.y > doc.page.height - 120) {
          doc.addPage();
        }
      }
      doc.moveDown(0.5);
    }
  });
}

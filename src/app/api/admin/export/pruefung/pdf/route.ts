import { NextResponse } from "next/server";
import {
  buildSeminarPdfFilename,
  pdfAttachmentContentDisposition,
} from "@/lib/export-pdf-filename";
import { resolveFilteredCourseForPdfExport } from "@/lib/export-pdf-context";
import { generateExamDocumentationPdf } from "@/lib/pdf-export";
import { getCompanyById } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const includeTimestamp =
      new URL(request.url).searchParams.get("timestamp") === "1";
    const { course, meta, companyId } = await resolveFilteredCourseForPdfExport(request);
    const company = companyId != null ? await getCompanyById(companyId) : null;
    const pdf = await generateExamDocumentationPdf(course, {
      companyName: company?.name,
      branding: company?.branding,
    });

    const filename = buildSeminarPdfFilename({
      instructionCode: meta.instructionCode,
      instructionTitle: meta.instructionTitle,
      courseName: course.courseName,
      version: course.version,
      documentType: "test",
      includeTimestamp,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": pdfAttachmentContentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "PDF-Fehler." }, { status: 500 });
  }
}

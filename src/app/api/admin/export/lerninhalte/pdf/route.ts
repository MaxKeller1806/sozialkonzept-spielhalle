import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/course";
import { generateLearningContentPdf } from "@/lib/pdf-export";

export async function GET() {
  try {
    await requireUser("admin");
    const course = getCourse();
    const pdf = await generateLearningContentPdf();

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lerninhalte-${course.version}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "PDF-Fehler." }, { status: 500 });
  }
}

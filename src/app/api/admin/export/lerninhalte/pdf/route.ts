import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateLearningContentPdf } from "@/lib/pdf-export";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import { getCompanyById } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    const { course } = await resolveAdminCourse(user, courseIdFromRequest(request));
    const company = await getCompanyById(user.companyId!);
    const pdf = await generateLearningContentPdf(course, {
      companyName: company?.name,
      branding: company?.branding,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lerninhalte-${course.version}.pdf"`,
        "Cache-Control": "no-store",
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

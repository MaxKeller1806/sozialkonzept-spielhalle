import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCertificateById,
  getCertificateForUser,
  getUserForCertificate,
} from "@/lib/certificate";
import { getCourseForContext } from "@/lib/course";
import { getCompanyById } from "@/lib/tenant";
import { generateCertificatePdf } from "@/lib/pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { id } = await params;
    const certId = Number(id);

    let cert;
    if (user.role === "admin") {
      cert = await getCertificateById(certId);
      if (cert && cert.companyId !== user.companyId) {
        cert = undefined;
      }
    } else {
      cert = await getCertificateForUser(user.id, certId);
    }

    const certUser = cert ? await getUserForCertificate(cert) : undefined;

    if (!cert || cert.revoked || !certUser || !cert.companyId) {
      return NextResponse.json({ error: "Zertifikat nicht gefunden." }, { status: 404 });
    }

    const course = await getCourseForContext(cert.companyId, cert.courseId);
    const company = await getCompanyById(cert.companyId);
    const pdf = await generateCertificatePdf(certUser, cert, course, {
      companyName: company?.name,
      branding: company?.branding,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cert.certificateNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF-Fehler." }, { status: 500 });
  }
}

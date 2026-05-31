import { NextResponse } from "next/server";
import {
  getCertificateByToken,
  getUserForCertificate,
} from "@/lib/certificate";
import { getCourseForContext } from "@/lib/course";
import { getCompanyById } from "@/lib/tenant";
import { verificationStatus } from "@/lib/status";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const cert = await getCertificateByToken(token);

  if (!cert) {
    return NextResponse.json({
      valid: false,
      status: "ungültig" as const,
      message: "Zertifikat nicht gefunden.",
    });
  }

  const user = await getUserForCertificate(cert);
  const company = cert.companyId ? await getCompanyById(cert.companyId) : undefined;
  let courseName = "Schulung";
  if (cert.companyId) {
    try {
      const course = await getCourseForContext(cert.companyId, cert.courseId);
      courseName = course.courseName;
    } catch {
      /* ignore */
    }
  }
  const status = verificationStatus(cert);

  return NextResponse.json({
    valid: status === "gültig",
    status,
    certificateNumber: cert.certificateNumber,
    name: user ? `${user.firstName} ${user.lastName}` : "—",
    courseName,
    companyName: company?.name ?? null,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    revoked: !!cert.revoked,
  });
}

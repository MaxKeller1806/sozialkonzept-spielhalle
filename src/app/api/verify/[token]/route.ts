import { NextResponse } from "next/server";
import {
  getCertificateByToken,
  getUserForCertificate,
} from "@/lib/certificate";
import { getCourse } from "@/lib/course";
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
  const course = getCourse();
  const status = verificationStatus(cert);

  return NextResponse.json({
    valid: status === "gültig",
    status,
    certificateNumber: cert.certificateNumber,
    name: user ? `${user.firstName} ${user.lastName}` : "—",
    courseName: course.courseName,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    revoked: !!cert.revoked,
  });
}

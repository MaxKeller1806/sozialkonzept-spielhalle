import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCertificateById,
  getCertificateForUser,
  getUserForCertificate,
} from "@/lib/certificate";
import { ensureSeeded, getSql } from "@/lib/db";
import { mapUser } from "@/lib/db/row-mappers";
import { generateCertificatePdf } from "@/lib/pdf";
import type { User } from "@/lib/types";

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
    let certUser: User | undefined;

    if (user.role === "admin") {
      cert = await getCertificateById(certId);
      if (cert) certUser = await getUserForCertificate(cert);
    } else {
      cert = await getCertificateForUser(user.id, certId);
      if (cert) {
        await ensureSeeded();
        const sql = getSql();
        const rows = await sql`
          SELECT id, first_name, last_name, email, birth_date, role, location, active, created_at
          FROM users WHERE id = ${user.id} LIMIT 1
        `;
        certUser = rows[0]
          ? mapUser(rows[0] as Record<string, unknown>)
          : undefined;
      }
    }

    if (!cert || cert.revoked || !certUser) {
      return NextResponse.json({ error: "Zertifikat nicht gefunden." }, { status: 404 });
    }

    const pdf = await generateCertificatePdf(certUser, cert);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cert.certificateNumber}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF-Fehler." }, { status: 500 });
  }
}

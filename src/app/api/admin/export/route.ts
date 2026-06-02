import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { mapUser } from "@/lib/db/row-mappers";
import { getLatestCertificate } from "@/lib/certificate";
import { getCertificateStatus, statusLabel } from "@/lib/status";

export async function GET() {
  try {
    const admin = await requireAdmin();
    await ensureSeeded();
    const sql = getSql();

    const rows = await sql`
      SELECT id, first_name, last_name, email, birth_date, birth_place,
             place_of_residence, street, house_number, postal_code, city,
             location, active
      FROM users
      WHERE company_id = ${admin.companyId} AND role = 'employee'
    `;

    const header = [
      "Vorname",
      "Nachname",
      "E-Mail",
      "Geburtsdatum",
      "Geburtsort",
      "Straße",
      "Hausnummer",
      "PLZ",
      "Ort",
      "Spielhalle",
      "Aktiv",
      "Status",
      "Zertifikatsnummer",
      "Abschlussdatum",
      "Gültig bis",
      "Ergebnis %",
    ];

    const lines = [header.join(";")];

    for (const row of rows) {
      const u = mapUser(row as Record<string, unknown>);
      const cert = await getLatestCertificate(u.id);
      const status = getCertificateStatus(cert);
      lines.push(
        [
          u.firstName,
          u.lastName,
          u.email,
          u.birthDate ?? "",
          u.birthPlace ?? "",
          u.street ?? "",
          u.houseNumber ?? "",
          u.postalCode ?? "",
          u.city ?? u.placeOfResidence ?? "",
          u.location ?? "",
          u.active ? "Ja" : "Nein",
          statusLabel(status),
          cert?.certificateNumber ?? "",
          cert ? new Date(cert.issuedAt).toLocaleDateString("de-DE") : "",
          cert ? (cert.validUntil ? new Date(cert.validUntil).toLocaleDateString("de-DE") : "Unbegrenzt gültig") : "",
          cert ? String(cert.score) : "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(";")
      );
    }

    const csv = "\uFEFF" + lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="schulungen-export.csv"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

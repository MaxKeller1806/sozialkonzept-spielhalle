import { NextResponse } from "next/server";
import { hashPassword, requireUser } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { mapUser } from "@/lib/db/row-mappers";
import { getLatestCertificate } from "@/lib/certificate";
import { getCertificateStatus, statusLabel } from "@/lib/status";
import type { User } from "@/lib/types";

async function mapUserRow(row: User) {
  const cert = await getLatestCertificate(row.id);
  const status = getCertificateStatus(cert);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    birthDate: row.birthDate,
    role: row.role as "admin" | "employee",
    location: row.location,
    active: !!row.active,
    createdAt: row.createdAt,
    status,
    statusLabel: statusLabel(status),
    certificate: cert
      ? {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          validUntil: cert.validUntil,
          score: cert.score,
        }
      : null,
  };
}

export async function GET() {
  try {
    await requireUser("admin");
    await ensureSeeded();
    const sql = getSql();
    const rows = await sql`
      SELECT id, first_name, last_name, email, birth_date, role, location, active, created_at
      FROM users ORDER BY last_name, first_name
    `;
    const users = rows.map((row) => mapUser(row as Record<string, unknown>));
    const mapped = await Promise.all(users.map(mapUserRow));

    return NextResponse.json({ users: mapped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      birthDate,
      location,
      role = "employee",
    } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen." },
        { status: 400 }
      );
    }

    await ensureSeeded();
    const sql = getSql();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "E-Mail bereits vergeben." },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO users (
        first_name, last_name, email, password_hash, birth_date, role, location, active
      )
      VALUES (
        ${firstName}, ${lastName}, ${normalizedEmail}, ${hashPassword(password)},
        ${birthDate || null},
        ${role === "admin" ? "admin" : "employee"},
        ${location || null},
        TRUE
      )
      RETURNING id, first_name, last_name, email, birth_date, role, location, active, created_at
    `;

    const user = mapUser(rows[0] as Record<string, unknown>);
    return NextResponse.json({ user: await mapUserRow(user) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

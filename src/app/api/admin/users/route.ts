import { NextResponse } from "next/server";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { mapUser } from "@/lib/db/row-mappers";
import { getLatestCertificate } from "@/lib/certificate";
import { getCertificateStatus, statusLabel } from "@/lib/status";
import { assignUserToCourse, setUserCourseAssignments } from "@/lib/course-db";
import { getUserPrivacyStatus } from "@/lib/privacy";
import type { User } from "@/lib/types";

async function mapUserRow(row: User, companyId: number) {
  const cert = await getLatestCertificate(row.id);
  const status = getCertificateStatus(cert);
  const privacy = await getUserPrivacyStatus(row.id);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    birthDate: row.birthDate,
    birthPlace: row.birthPlace,
    placeOfResidence: row.placeOfResidence,
    role: row.role as "admin" | "employee",
    location: row.location,
    active: !!row.active,
    mustChangePassword: !!row.mustChangePassword,
    createdAt: row.createdAt,
    status,
    statusLabel: statusLabel(status),
    privacyAccepted: privacy.accepted,
    privacyVersion: privacy.currentVersion,
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
    const admin = await requireAdmin();
    const sql = getSql();
    const rows = await sql`
      SELECT id, first_name, last_name, email, birth_date, birth_place,
             place_of_residence, role, location, active, must_change_password, created_at
      FROM users
      WHERE company_id = ${admin.companyId} AND role = 'employee'
      ORDER BY last_name, first_name
    `;
    const users = rows.map((row) => mapUser(row as Record<string, unknown>));
    const mapped = await Promise.all(
      users.map((u) => mapUserRow(u, admin.companyId!))
    );

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
    const admin = await requireAdmin();
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      birthDate,
      birthPlace,
      placeOfResidence,
      location,
      courseIds,
    } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen." },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Erstpasswort muss mindestens 8 Zeichen haben." },
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
        first_name, last_name, email, password_hash, birth_date, birth_place,
        place_of_residence, role, company_id, location, active, must_change_password
      )
      VALUES (
        ${firstName}, ${lastName}, ${normalizedEmail}, ${hashPassword(password)},
        ${birthDate || null},
        ${birthPlace || null},
        ${placeOfResidence || null},
        'employee',
        ${admin.companyId},
        ${location || null},
        TRUE,
        TRUE
      )
      RETURNING *
    `;

    const user = mapUser(rows[0] as Record<string, unknown>);

    if (Array.isArray(courseIds) && courseIds.length > 0) {
      await setUserCourseAssignments(user.id, courseIds);
    } else {
      const companyCourses = await sql`
        SELECT id FROM courses WHERE company_id = ${admin.companyId} AND active = TRUE
      `;
      for (const c of companyCourses) {
        await assignUserToCourse(user.id, String(c.id));
      }
    }

    return NextResponse.json(
      { user: await mapUserRow(user, admin.companyId!) },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

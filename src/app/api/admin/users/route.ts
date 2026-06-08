import { NextResponse } from "next/server";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { getSql, resetSql } from "@/lib/db";
import { mapUser } from "@/lib/db/row-mappers";
import { getLatestCertificate } from "@/lib/certificate";
import { getCertificateStatus, statusLabel } from "@/lib/status";
import { assignUserToCourse, setUserCourseAssignments } from "@/lib/course-db";
import { assertEmployeeCategoryBelongsToCompany } from "@/lib/employee-categories";
import {
  assertCompanyEmploymentDatesValid,
  parseJoinedCompanyAtForAdmin,
  parseLeftCompanyAtForAdmin,
  syncCityFields,
} from "@/lib/user-profile";
import {
  listAdminEmployees,
  parseAdminEmployeeListQuery,
  ADMIN_EMPLOYEE_SORT_ALLOWLIST,
} from "@/lib/admin-users-list";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function mapUserRow(row: User) {
  const cert = await getLatestCertificate(row.id);
  const status = getCertificateStatus(cert);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    birthDate: row.birthDate,
    birthPlace: row.birthPlace,
    street: row.street,
    houseNumber: row.houseNumber,
    postalCode: row.postalCode,
    city: row.city ?? row.placeOfResidence,
    role: row.role as "admin" | "employee",
    location: row.location,
    active: !!row.active,
    mustChangePassword: !!row.mustChangePassword,
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

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const query = parseAdminEmployeeListQuery(params);
    const result = await listAdminEmployees(admin.companyId!, query);
    return NextResponse.json({
      users: result.users,
      meta: result.meta,
      sortFields: Object.keys(ADMIN_EMPLOYEE_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error("[admin/users] GET Fehler:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
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
      street,
      houseNumber,
      postalCode,
      city,
      location,
      courseIds,
      employeeCategoryId,
      joinedCompanyAt,
      leftCompanyAt,
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

    const { city: syncedCity, placeOfResidence } = syncCityFields(city);

    let categoryId: number | null = null;
    if (employeeCategoryId != null && employeeCategoryId !== "") {
      await assertEmployeeCategoryBelongsToCompany(
        admin.companyId!,
        Number(employeeCategoryId)
      );
      categoryId = Number(employeeCategoryId);
    }

    let parsedJoinedCompanyAt: string | null = null;
    if (joinedCompanyAt != null && joinedCompanyAt !== "") {
      try {
        parsedJoinedCompanyAt = parseJoinedCompanyAtForAdmin(joinedCompanyAt);
      } catch {
        return NextResponse.json(
          { error: "Ungültiges Eintrittsdatum." },
          { status: 400 }
        );
      }
    }

    let parsedLeftCompanyAt: string | null = null;
    if (leftCompanyAt != null && leftCompanyAt !== "") {
      try {
        parsedLeftCompanyAt = parseLeftCompanyAtForAdmin(leftCompanyAt);
      } catch {
        return NextResponse.json(
          { error: "Ungültiges Austrittsdatum." },
          { status: 400 }
        );
      }
    }

    try {
      assertCompanyEmploymentDatesValid(
        parsedJoinedCompanyAt,
        parsedLeftCompanyAt
      );
    } catch (e) {
      if (e instanceof Error && e.message === "LEFT_BEFORE_JOINED") {
        return NextResponse.json(
          {
            error: "Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.",
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const rows = await sql`
      INSERT INTO users (
        first_name, last_name, email, password_hash, birth_date, birth_place,
        place_of_residence, street, house_number, postal_code, city,
        role, company_id, location, active, must_change_password,
        employee_category_id, joined_company_at, left_company_at
      )
      VALUES (
        ${firstName}, ${lastName}, ${normalizedEmail}, ${hashPassword(password)},
        ${birthDate || null},
        ${birthPlace || null},
        ${placeOfResidence},
        ${street || null},
        ${houseNumber || null},
        ${postalCode || null},
        ${syncedCity},
        'employee',
        ${admin.companyId},
        ${location || null},
        TRUE,
        TRUE,
        ${categoryId},
        ${parsedJoinedCompanyAt},
        ${parsedLeftCompanyAt}
      )
      RETURNING *
    `;

    const user = mapUser(rows[0] as Record<string, unknown>);

    if ("courseIds" in body && Array.isArray(courseIds)) {
      await setUserCourseAssignments(
        user.id,
        admin.companyId!,
        courseIds.map(String)
      );
    } else if (Array.isArray(courseIds) && courseIds.length > 0) {
      await setUserCourseAssignments(user.id, admin.companyId!, courseIds);
    } else {
      const companyCourses = await sql`
        SELECT id FROM courses WHERE company_id = ${admin.companyId} AND active = TRUE
      `;
      for (const c of companyCourses) {
        await assignUserToCourse(user.id, String(c.id));
      }
    }

    return NextResponse.json(
      { user: await mapUserRow(user) },
      { status: 201 }
    );
  } catch (e) {
    console.error("[admin/users] POST Fehler:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

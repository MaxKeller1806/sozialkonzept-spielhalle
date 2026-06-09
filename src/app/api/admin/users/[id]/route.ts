import { NextResponse } from "next/server";
import { hashPassword, requireAdmin, validatePassword } from "@/lib/auth";
import { assertEmployeeInAdminScope, adminAccessFromSession } from "@/lib/admin-access";
import { ensureSeeded, getSql } from "@/lib/db";
import { mapUser } from "@/lib/db/row-mappers";
import {
  getUserAssignedCourseIds,
  setUserCourseAssignments,
} from "@/lib/course-db";
import {
  assertEmployeeCategoryBelongsToCompany,
} from "@/lib/employee-categories";
import {
  assertCompanyEmploymentDatesValid,
  parseJoinedCompanyAtForAdmin,
  parseLeftCompanyAtForAdmin,
  syncCityFields,
} from "@/lib/user-profile";
import { formatCompanyLocationLabel } from "@/lib/company-locations";
import {
  getUserLocationAssignments,
  setUserLocationAssignments,
} from "@/lib/user-locations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    const { id } = await params;
    const userId = Number(id);

    await assertEmployeeInAdminScope(access, userId);

    await ensureSeeded();
    const sql = getSql();

    const rows = await sql`
      SELECT u.*, cl.name AS location_name, cl.city AS location_city
      FROM users u
      LEFT JOIN company_locations cl ON cl.id = u.location_id
      WHERE u.id = ${userId} AND u.company_id = ${admin.companyId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const user = mapUser(rows[0] as Record<string, unknown>);
    const row = rows[0] as Record<string, unknown>;
    const assignedCourseIds = await getUserAssignedCourseIds(
      userId,
      admin.companyId!
    );
    const locationAssignments = await getUserLocationAssignments(userId);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        birthDate: user.birthDate,
        birthPlace: user.birthPlace,
        street: user.street,
        houseNumber: user.houseNumber,
        postalCode: user.postalCode,
        city: user.city ?? user.placeOfResidence,
        location: user.location,
        locationId: user.locationId,
        primaryLocationId: user.locationId,
        locationIds: locationAssignments.map((a) => a.locationId),
        locations: locationAssignments,
        locationLabel:
          row.location_name != null
            ? formatCompanyLocationLabel({
                name: String(row.location_name),
                city:
                  row.location_city != null ? String(row.location_city) : null,
              })
            : null,
        active: !!user.active,
        employeeCategoryId: user.employeeCategoryId,
        joinedCompanyAt: user.joinedCompanyAt,
        leftCompanyAt: user.leftCompanyAt,
      },
      assignedCourseIds,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    const { id } = await params;
    const userId = Number(id);
    const body = await request.json();

    await assertEmployeeInAdminScope(access, userId);

    await ensureSeeded();
    const sql = getSql();

    const existing = await sql`
      SELECT id, role, joined_company_at, left_company_at FROM users
      WHERE id = ${userId} AND company_id = ${admin.companyId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const targetRole = String(existing[0].role);

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
      locationId,
      locationIds,
      primaryLocationId,
      role,
      active,
      courseIds,
      employeeCategoryId,
      joinedCompanyAt,
      leftCompanyAt,
    } = body;

    const existingJoined =
      existing[0].joined_company_at != null
        ? new Date(String(existing[0].joined_company_at)).toISOString().slice(0, 10)
        : null;
    const existingLeft =
      existing[0].left_company_at != null
        ? new Date(String(existing[0].left_company_at)).toISOString().slice(0, 10)
        : null;

    const patch: Record<string, string | boolean | null | number> = {};
    if (firstName !== undefined) patch.first_name = firstName;
    if (lastName !== undefined) patch.last_name = lastName;
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (birthDate !== undefined) patch.birth_date = birthDate || null;
    if (birthPlace !== undefined) patch.birth_place = birthPlace || null;
    if (street !== undefined) patch.street = street || null;
    if (houseNumber !== undefined) patch.house_number = houseNumber || null;
    if (postalCode !== undefined) patch.postal_code = postalCode || null;
    if (city !== undefined) {
      const synced = syncCityFields(city);
      patch.city = synced.city;
      patch.place_of_residence = synced.placeOfResidence;
    }
    if (location !== undefined) patch.location = location || null;

    const hasLocationUpdate =
      locationIds !== undefined ||
      primaryLocationId !== undefined ||
      locationId !== undefined;

    if (hasLocationUpdate) {
      try {
        await setUserLocationAssignments(
          userId,
          admin.companyId!,
          {
            locationIds: Array.isArray(locationIds) ? locationIds : undefined,
            primaryLocationId,
            locationId,
          },
          access
        );
      } catch (e) {
        const locMsg = e instanceof Error ? e.message : "";
        if (locMsg === "FORBIDDEN") {
          return NextResponse.json(
            { error: "Standortzuordnung nicht erlaubt." },
            { status: 403 }
          );
        }
        if (locMsg === "PRIMARY_LOCATION_INVALID") {
          return NextResponse.json(
            { error: "Hauptstandort muss einer der zugewiesenen Standorte sein." },
            { status: 400 }
          );
        }
        throw e;
      }
    }
    if (joinedCompanyAt !== undefined) {
      if (targetRole !== "employee") {
        return NextResponse.json(
          { error: "Eintrittsdatum kann nur für Mitarbeiter gesetzt werden." },
          { status: 400 }
        );
      }
      try {
        patch.joined_company_at = parseJoinedCompanyAtForAdmin(joinedCompanyAt);
      } catch {
        return NextResponse.json(
          { error: "Ungültiges Eintrittsdatum." },
          { status: 400 }
        );
      }
    }
    if (leftCompanyAt !== undefined) {
      if (targetRole !== "employee") {
        return NextResponse.json(
          { error: "Austrittsdatum kann nur für Mitarbeiter gesetzt werden." },
          { status: 400 }
        );
      }
      try {
        patch.left_company_at = parseLeftCompanyAtForAdmin(leftCompanyAt);
      } catch {
        return NextResponse.json(
          { error: "Ungültiges Austrittsdatum." },
          { status: 400 }
        );
      }
    }
    if (role !== undefined) patch.role = role === "admin" ? "admin" : "employee";
    if (active !== undefined) patch.active = Boolean(active);
    if (employeeCategoryId !== undefined) {
      if (employeeCategoryId == null || employeeCategoryId === "") {
        patch.employee_category_id = null;
      } else {
        await assertEmployeeCategoryBelongsToCompany(
          admin.companyId!,
          Number(employeeCategoryId)
        );
        patch.employee_category_id = Number(employeeCategoryId);
      }
    }
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) {
        return NextResponse.json({ error: pwError }, { status: 400 });
      }
      patch.password_hash = hashPassword(password);
      patch.must_change_password = true;
    }

    let courseIdsUpdated = false;
    if (courseIds !== undefined) {
      if (!Array.isArray(courseIds)) {
        return NextResponse.json(
          { error: "courseIds muss ein Array sein." },
          { status: 400 }
        );
      }
      await setUserCourseAssignments(
        userId,
        admin.companyId!,
        courseIds.map(String)
      );
      courseIdsUpdated = true;
    }

    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0 && !courseIdsUpdated && !hasLocationUpdate) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    if (keys.length > 0) {
      const finalJoined =
        patch.joined_company_at !== undefined
          ? (patch.joined_company_at as string | null)
          : existingJoined;
      const finalLeft =
        patch.left_company_at !== undefined
          ? (patch.left_company_at as string | null)
          : existingLeft;
      try {
        assertCompanyEmploymentDatesValid(finalJoined, finalLeft);
      } catch (e) {
        if (e instanceof Error && e.message === "LEFT_BEFORE_JOINED") {
          return NextResponse.json(
            {
              error:
                "Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.",
            },
            { status: 400 }
          );
        }
        throw e;
      }

      await sql`
        UPDATE users SET ${sql(patch, ...keys)}
        WHERE id = ${userId} AND company_id = ${admin.companyId}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    return NextResponse.json(
      {
        error:
          "Endgültiges Löschen ist für Admins nicht erlaubt. Bitte Benutzer archivieren (deaktivieren).",
      },
      { status: 403 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

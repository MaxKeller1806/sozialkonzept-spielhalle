import { NextResponse } from "next/server";
import { hashPassword, requireAdmin, validatePassword } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const userId = Number(id);
    const body = await request.json();

    await ensureSeeded();
    const sql = getSql();

    const existing = await sql`
      SELECT id FROM users
      WHERE id = ${userId} AND company_id = ${admin.companyId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      birthDate,
      birthPlace,
      placeOfResidence,
      location,
      role,
      active,
    } = body;

    const patch: Record<string, string | boolean | null> = {};
    if (firstName !== undefined) patch.first_name = firstName;
    if (lastName !== undefined) patch.last_name = lastName;
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (birthDate !== undefined) patch.birth_date = birthDate || null;
    if (birthPlace !== undefined) patch.birth_place = birthPlace || null;
    if (placeOfResidence !== undefined) patch.place_of_residence = placeOfResidence || null;
    if (location !== undefined) patch.location = location || null;
    if (role !== undefined) patch.role = role === "admin" ? "admin" : "employee";
    if (active !== undefined) patch.active = Boolean(active);
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) {
        return NextResponse.json({ error: pwError }, { status: 400 });
      }
      patch.password_hash = hashPassword(password);
      patch.must_change_password = true;
    }

    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    await sql`
      UPDATE users SET ${sql(patch, ...keys)}
      WHERE id = ${userId} AND company_id = ${admin.companyId}
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

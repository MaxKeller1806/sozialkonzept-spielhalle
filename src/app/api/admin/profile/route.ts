import { NextResponse } from "next/server";
import {
  getSession,
  getUserByEmail,
  hashPassword,
  requireAdmin,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";
import { getSql } from "@/lib/db";
import { mapUserWithPassword } from "@/lib/db/row-mappers";
import { bodyIncludesJoinedCompanyAt, bodyIncludesLeftCompanyAt } from "@/lib/user-profile";

export async function GET() {
  try {
    const sessionUser = await requireAdmin();
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM users WHERE id = ${sessionUser.id} LIMIT 1
    `;
    if (!rows[0]) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    const user = mapUserWithPassword(rows[0] as Record<string, unknown>);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireAdmin();
    const body = await request.json();

    if (bodyIncludesJoinedCompanyAt(body as Record<string, unknown>)) {
      return NextResponse.json(
        { error: "Eintrittsdatum wird nur in der Mitarbeiterverwaltung gepflegt." },
        { status: 403 }
      );
    }

    if (bodyIncludesLeftCompanyAt(body as Record<string, unknown>)) {
      return NextResponse.json(
        { error: "Austrittsdatum wird nur in der Mitarbeiterverwaltung gepflegt." },
        { status: 403 }
      );
    }

    const { email, password, currentPassword } = body;

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Aktuelles Passwort ist erforderlich." },
        { status: 400 }
      );
    }

    if (!email && !password) {
      return NextResponse.json(
        { error: "E-Mail oder neues Passwort angeben." },
        { status: 400 }
      );
    }

    const sql = getSql();
    const rows = await sql`
      SELECT * FROM users WHERE id = ${sessionUser.id} LIMIT 1
    `;
    if (!rows[0]) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const user = mapUserWithPassword(rows[0] as Record<string, unknown>);
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Aktuelles Passwort ist falsch." },
        { status: 401 }
      );
    }

    const patch: Record<string, string> = {};
    if (email) {
      const normalized = String(email).trim().toLowerCase();
      const taken = await sql`
        SELECT id FROM users WHERE LOWER(email) = ${normalized} AND id != ${sessionUser.id} LIMIT 1
      `;
      if (taken.length > 0) {
        return NextResponse.json(
          { error: "E-Mail bereits vergeben." },
          { status: 409 }
        );
      }
      patch.email = normalized;
    }
    if (password) {
      if (String(password).length < 6) {
        return NextResponse.json(
          { error: "Neues Passwort muss mindestens 6 Zeichen haben." },
          { status: 400 }
        );
      }
      patch.password_hash = hashPassword(password);
    }

    const keys = Object.keys(patch);
    await sql`
      UPDATE users SET ${sql(patch, ...keys)}
      WHERE id = ${sessionUser.id}
    `;

    const updated = await getUserByEmail(patch.email ?? user.email);
    if (updated) {
      const session = await getSession();
      session.user = toSessionUser(updated);
      await session.save();
    }

    return NextResponse.json({
      ok: true,
      email: patch.email ?? user.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

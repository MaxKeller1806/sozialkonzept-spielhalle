import { NextResponse } from "next/server";
import {
  getSession,
  getUserById,
  requireSuperuser,
  toSessionUser,
} from "@/lib/auth";
import { ensureSeeded, getSql, resetSql } from "@/lib/db";

export const dynamic = "force-dynamic";

function profilePayload(user: Awaited<ReturnType<typeof getUserById>>) {
  if (!user) return null;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Bitte anmelden." }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET() {
  try {
    const sessionUser = await requireSuperuser();
    const user = await getUserById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ profile: profilePayload(user) });
  } catch (e) {
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json(
      { error: "Profil konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireSuperuser();
    const body = await request.json();
    const { firstName, lastName } = body;

    const patch: Record<string, string> = {};
    if (firstName !== undefined) {
      const value = String(firstName).trim();
      if (!value) {
        return NextResponse.json(
          { error: "Bitte Vornamen eingeben." },
          { status: 400 }
        );
      }
      patch.first_name = value;
    }
    if (lastName !== undefined) {
      const value = String(lastName).trim();
      if (!value) {
        return NextResponse.json(
          { error: "Bitte Nachnamen eingeben." },
          { status: 400 }
        );
      }
      patch.last_name = value;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    await ensureSeeded();
    const sql = getSql();
    await sql`
      UPDATE users SET ${sql(patch, ...Object.keys(patch))}
      WHERE id = ${sessionUser.id} AND role = 'superuser'
    `;

    const updated = await getUserById(sessionUser.id);
    if (!updated) {
      return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
    }

    const session = await getSession();
    session.user = toSessionUser(updated);
    await session.save();

    return NextResponse.json({ profile: profilePayload(updated) });
  } catch (e) {
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

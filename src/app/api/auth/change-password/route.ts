import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getSession,
  getUserById,
  hashPassword,
  validatePassword,
  verifyPassword,
  toSessionUser,
  getAuthState,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { password, passwordConfirm, currentPassword } = await request.json();

    if (!password || !passwordConfirm) {
      return NextResponse.json(
        { error: "Bitte neues Passwort zweimal eingeben." },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Die Passwörter stimmen nicht überein." },
        { status: 400 }
      );
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 });
    }

    const dbUser = await getUserById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }

    if (!user.mustChangePassword) {
      if (!currentPassword || !verifyPassword(currentPassword, dbUser.passwordHash)) {
        return NextResponse.json(
          { error: "Aktuelles Passwort ist falsch." },
          { status: 401 }
        );
      }
    }

    const { ensureSeeded, getSql } = await import("@/lib/db");
    await ensureSeeded();
    const sql = getSql();
    await sql`
      UPDATE users SET
        password_hash = ${hashPassword(password)},
        must_change_password = FALSE
      WHERE id = ${user.id}
    `;

    const updated = await getUserById(user.id);
    let sessionUser = user;
    if (updated) {
      const session = await getSession();
      session.user = toSessionUser(updated);
      sessionUser = session.user;
      await session.save();
    }

    const authState = await getAuthState(sessionUser);

    return NextResponse.json({
      ok: true,
      redirect: authState.redirect,
    });
  } catch {
    return NextResponse.json({ error: "Passwortänderung fehlgeschlagen." }, { status: 500 });
  }
}

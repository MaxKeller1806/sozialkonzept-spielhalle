import { NextResponse } from "next/server";
import {
  getSession,
  getUserByEmail,
  toSessionUser,
  verifyPassword,
  getAuthState,
  defaultRedirectForRole,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-Mail und Passwort erforderlich." },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user || !user.active) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    const sessionUser = toSessionUser(user);
    const session = await getSession();
    session.user = sessionUser;
    await session.save();

    const authState = await getAuthState(sessionUser);

    return NextResponse.json({
      user: sessionUser,
      authState,
      redirect: authState.redirect ?? defaultRedirectForRole(user.role),
    });
  } catch {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 500 });
  }
}

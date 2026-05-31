import { NextResponse } from "next/server";
import {
  getSession,
  getUserByEmail,
  toSessionUser,
  verifyPassword,
  getAuthState,
  defaultRedirectForRole,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const t = (step: string) => {
    try {
      console.timeEnd(`login:${step}`);
    } catch {
      /* timer missing */
    }
  };

  try {
    console.time("login:1-read-request");
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      t("1-read-request");
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }
    const { email, password } = body;
    t("1-read-request");

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-Mail und Passwort erforderlich." },
        { status: 400 }
      );
    }

    console.time("login:2-find-user");
    const user = await getUserByEmail(email);
    t("2-find-user");

    if (!user || !user.active) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    console.time("login:3-verify-password");
    const passwordOk = verifyPassword(password, user.passwordHash);
    t("3-verify-password");

    if (!passwordOk) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    const sessionUser = toSessionUser(user);

    console.time("login:5-set-session");
    const session = await getSession();
    session.user = sessionUser;
    await session.save();
    t("5-set-session");

    console.time("login:4-company-auth-state");
    const authState = await getAuthState(sessionUser);
    t("4-company-auth-state");

    console.time("login:6-response");
    const response = NextResponse.json({
      user: sessionUser,
      authState,
      redirect: authState.redirect ?? defaultRedirectForRole(user.role),
    });
    t("6-response");

    return response;
  } catch (err) {
    console.error("[login] Fehler:", err);
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen. Bitte später erneut versuchen." },
      { status: 500 }
    );
  }
}

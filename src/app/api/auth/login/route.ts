import { NextResponse } from "next/server";
import { getSession, getUserByEmail, toSessionUser, verifyPassword } from "@/lib/auth";

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

    const session = await getSession();
    session.user = toSessionUser(user);
    await session.save();

    return NextResponse.json({
      user: session.user,
      redirect: user.role === "admin" ? "/dashboard" : "/schulung",
    });
  } catch {
    return NextResponse.json({ error: "Anmeldung fehlgeschlagen." }, { status: 500 });
  }
}

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
    let body: {
      email?: string;
      password?: string;
      portal?: string;
      companyCode?: string;
      companyId?: number;
    };
    try {
      body = await request.json();
    } catch {
      t("1-read-request");
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }
    const { email, password, portal, companyCode, companyId } = body;
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

    if (portal === "certiano") {
      if (sessionUser.role !== "superuser") {
        return NextResponse.json(
          { error: "Nur Certiano-Betreiber können sich hier anmelden. Bitte /login nutzen." },
          { status: 403 }
        );
      }
    } else if (sessionUser.role === "superuser") {
      return NextResponse.json(
        { error: "Superuser melden sich unter /certiano/login an." },
        { status: 403 }
      );
    }

    const { resolveLoginCompanyId, getTenantCompanyByCode } = await import(
      "@/lib/tenant-resolve"
    );

    if (portal !== "certiano") {
      const hasCompanyCode = Boolean(companyCode?.trim());

      if (hasCompanyCode) {
        const company = await getTenantCompanyByCode(companyCode!);
        if (!company) {
          return NextResponse.json(
            {
              error:
                "Firma nicht gefunden. Bitte prüfen Sie die Firmenkennung.",
            },
            { status: 404 }
          );
        }
      }

      const expectedCompanyId = await resolveLoginCompanyId({
        companyCode: companyCode ?? null,
        companyId: companyId ?? null,
      });

      if (expectedCompanyId == null) {
        return NextResponse.json(
          {
            error:
              "Bitte Firmenkennung angeben oder die firmenspezifische Login-Adresse nutzen.",
          },
          { status: 400 }
        );
      }

      if (sessionUser.companyId !== expectedCompanyId) {
        return NextResponse.json(
          { error: "Ungültige Anmeldedaten." },
          { status: 401 }
        );
      }
    }

    if (sessionUser.role !== "superuser" && !sessionUser.companyId) {
      console.error("[login] Keine company_id für Rolle:", sessionUser.role);
      return NextResponse.json(
        {
          error:
            "Kein Mandant zugeordnet. Bitte wenden Sie sich an Ihren Administrator.",
        },
        { status: 403 }
      );
    }

    console.time("login:5-set-session");
    const session = await getSession();
    session.user = sessionUser;
    await session.save();
    t("5-set-session");

    const { touchLastLogin } = await import("@/lib/tenant");
    await touchLastLogin(sessionUser.id);

    console.time("login:4-company-auth-state");
    const authState = await getAuthState(sessionUser);
    t("4-company-auth-state");

    const redirect =
      authState.redirect ?? defaultRedirectForRole(user.role);
    console.log(
      "[login] rolle:",
      sessionUser.role,
      "company_id:",
      sessionUser.companyId,
      "must_change_password:",
      sessionUser.mustChangePassword,
      "privacy_accepted:",
      authState.privacyAccepted,
      "redirect target:",
      redirect
    );

    console.time("login:6-response");
    const response = NextResponse.json({
      user: sessionUser,
      authState,
      redirect,
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

import { NextResponse } from "next/server";
import {
  getCurrentUser,
  defaultRedirectForRole,
} from "@/lib/auth";
import {
  getActivePrivacyPolicy,
  hasAcceptedCurrentPolicy,
  recordPrivacyAcceptance,
} from "@/lib/privacy";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    console.log("[privacy] Datenschutzseite geladen");

    const user = await getCurrentUser();
    console.log("[privacy] User gefunden:", user ? "ja" : "nein");
    if (user) {
      console.log("[privacy] Rolle:", user.role, "company_id:", user.companyId);
    }

    if (user?.role === "superuser") {
      const redirect = "/certiano";
      console.log("[privacy] Redirect-Ziel:", redirect);
      return NextResponse.json({
        policy: null,
        accepted: true,
        redirect,
        skipPrivacy: true,
      });
    }

    if (user && !user.companyId) {
      console.error("[privacy] Keine company_id für Rolle:", user.role);
      return NextResponse.json(
        {
          error:
            "Kein Mandant zugeordnet. Bitte wenden Sie sich an Ihren Administrator.",
        },
        { status: 400 }
      );
    }

    const policy = await getActivePrivacyPolicy();
    console.log("[privacy] aktuelle Policy gefunden:", policy ? "ja" : "nein");

    if (!policy) {
      return NextResponse.json(
        {
          error:
            "Datenschutzerklärung konnte nicht geladen werden. Bitte Administrator kontaktieren.",
          policy: null,
          accepted: false,
        },
        { status: 503 }
      );
    }

    const accepted = user ? await hasAcceptedCurrentPolicy(user.id) : false;

    let redirect: string | undefined;
    if (user && accepted) {
      redirect = defaultRedirectForRole(user.role);
      console.log("[privacy] Redirect-Ziel:", redirect);
    }

    return NextResponse.json({
      policy,
      accepted,
      redirect,
      pendingConfirmation: !!user && !accepted,
    });
  } catch (err) {
    console.error("[privacy] GET Fehler:", err);
    return NextResponse.json(
      { error: "Datenschutzdaten konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("[privacy] Bestätigung angefordert (POST)");

    const user = await getCurrentUser();
    console.log("[privacy] User gefunden:", user ? "ja" : "nein");
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    console.log("[privacy] Rolle:", user.role, "company_id:", user.companyId);

    if (user.role === "superuser") {
      const redirect = "/certiano";
      console.log("[privacy] Redirect-Ziel:", redirect);
      return NextResponse.json({ ok: true, redirect });
    }

    if (user.mustChangePassword) {
      const redirect = "/passwort-aendern";
      console.log("[privacy] Redirect-Ziel:", redirect);
      return NextResponse.json(
        {
          ok: false,
          error: "Bitte zuerst Ihr Passwort ändern.",
          redirect,
        },
        { status: 400 }
      );
    }

    if (!user.companyId) {
      console.error("[privacy] Keine company_id für Rolle:", user.role);
      return NextResponse.json(
        {
          error:
            "Kein Mandant zugeordnet. Bitte wenden Sie sich an Ihren Administrator.",
        },
        { status: 400 }
      );
    }

    const policy = await getActivePrivacyPolicy();
    console.log("[privacy] aktuelle Policy gefunden:", policy ? "ja" : "nein");

    if (!policy) {
      const redirect =
        defaultRedirectForRole(user.role);
      console.log("[privacy] Redirect-Ziel:", redirect);
      return NextResponse.json({ ok: true, redirect });
    }

    const already = await hasAcceptedCurrentPolicy(user.id);
    if (already) {
      const redirect = defaultRedirectForRole(user.role);
      console.log("[privacy] Zustimmung gespeichert: bereits ja, Redirect-Ziel:", redirect);
      return NextResponse.json({ ok: true, redirect });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const saved = await recordPrivacyAcceptance(
      user.id,
      user.companyId,
      policy.id,
      { ipAddress: ip, userAgent }
    );
    console.log("[privacy] Zustimmung gespeichert:", saved ? "ja" : "nein");

    if (!saved) {
      return NextResponse.json(
        { error: "Bestätigung konnte nicht gespeichert werden." },
        { status: 500 }
      );
    }

    const redirect = defaultRedirectForRole(user.role);
    console.log("[privacy] Redirect-Ziel:", redirect);

    return NextResponse.json({ ok: true, redirect });
  } catch (err) {
    console.error("[privacy] POST Fehler:", err);
    return NextResponse.json(
      { error: "Bestätigung fehlgeschlagen. Bitte erneut versuchen." },
      { status: 500 }
    );
  }
}

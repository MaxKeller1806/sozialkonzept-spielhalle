import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getActivePrivacyPolicy,
  hasAcceptedCurrentPolicy,
  recordPrivacyAcceptance,
} from "@/lib/privacy";

export async function GET() {
  try {
    const policy = await getActivePrivacyPolicy();
    const user = await getCurrentUser();
    const accepted = user ? await hasAcceptedCurrentPolicy(user.id) : false;
    return NextResponse.json({ policy, accepted });
  } catch {
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const policy = await getActivePrivacyPolicy();
    if (!policy) {
      return NextResponse.json({ ok: true, redirect: user.role === "admin" ? "/dashboard" : "/schulung" });
    }

    const already = await hasAcceptedCurrentPolicy(user.id);
    if (already) {
      return NextResponse.json({ ok: true });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    await recordPrivacyAcceptance(user.id, user.companyId, policy.id, {
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      redirect: user.role === "admin" ? "/dashboard" : "/schulung",
    });
  } catch {
    return NextResponse.json({ error: "Bestätigung fehlgeschlagen." }, { status: 500 });
  }
}

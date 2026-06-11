import { NextResponse } from "next/server";
import { createOrRefreshPasswordResetRequest } from "@/lib/password-reset-requests";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    let body: { companyCode?: string; email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const companyCode = body.companyCode?.trim() ?? "";
    const email = body.email?.trim() ?? "";

    if (!companyCode || !email) {
      return NextResponse.json(
        { error: "Firmenkennung und E-Mail sind erforderlich." },
        { status: 400 }
      );
    }

    const result = await createOrRefreshPasswordResetRequest({
      companyCode,
      email,
    });

    return NextResponse.json({ ok: true, message: result.message });
  } catch {
    return NextResponse.json(
      {
        ok: true,
        message:
          "Falls die Angaben korrekt sind, wurde die Anfrage an Ihren Administrator übermittelt.",
      },
      { status: 200 }
    );
  }
}

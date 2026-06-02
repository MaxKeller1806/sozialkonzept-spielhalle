import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeBranding } from "@/lib/branding-theme";
import { getCompanyById } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (user.role === "superuser" || !user.companyId) {
      return NextResponse.json({ error: "Kein Firmenbranding." }, { status: 403 });
    }

    const company = await getCompanyById(user.companyId);
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({
      companyName: company.name,
      branding: normalizeBranding(company.branding),
    });
  } catch {
    return NextResponse.json(
      { error: "Branding konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

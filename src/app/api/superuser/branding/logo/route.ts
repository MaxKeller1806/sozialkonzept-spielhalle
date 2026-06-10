import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { saveBrandingLogoFile } from "@/lib/branding-upload";

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const formData = await request.formData();
    const file = formData.get("file");
    const companyId = formData.get("companyId");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Keine Datei ausgewählt." }, { status: 400 });
    }

    const scope =
      typeof companyId === "string" && companyId.trim()
        ? `company-${companyId.trim()}`
        : "operator";

    const logoUrl = await saveBrandingLogoFile(file, scope);
    return NextResponse.json({ logoUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("Logo") || msg.includes("PNG") || msg.includes("MB")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload fehlgeschlagen." }, { status: 500 });
  }
}

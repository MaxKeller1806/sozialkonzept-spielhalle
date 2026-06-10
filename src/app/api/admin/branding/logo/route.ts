import { NextResponse } from "next/server";
import { persistBrandingLogoUrl } from "@/lib/branding-logo-persist";
import {
  BrandingUploadError,
  saveBrandingLogoFile,
} from "@/lib/branding-upload";
import { requireAdmin } from "@/lib/auth";
import { getStorageConfigStatus } from "@/lib/supabase-storage";

export async function POST(request: Request) {
  let fileMeta: Record<string, unknown> = {};

  try {
    const user = await requireAdmin();
    const companyId = user.companyId!;

    const storageStatus = getStorageConfigStatus();
    if (!storageStatus.configured) {
      return NextResponse.json(
        { error: "Storage nicht konfiguriert.", code: "STORAGE_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Keine Datei ausgewählt." }, { status: 400 });
    }

    const scope = `company-${companyId}`;
    fileMeta = {
      fileType: file.type,
      fileSize: file.size,
      scope,
      companyId,
    };

    const logoUrl = await saveBrandingLogoFile(file, scope);
    await persistBrandingLogoUrl(logoUrl, { scope, companyId });

    return NextResponse.json({ ok: true, logoUrl });
  } catch (error) {
    console.error("[admin-branding-upload] fatal", error);

    const msg = error instanceof Error ? error.message : "";

    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }

    if (error instanceof BrandingUploadError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Logo konnte nicht hochgeladen werden.", code: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}

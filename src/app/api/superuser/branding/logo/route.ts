import { NextResponse } from "next/server";
import {
  persistBrandingLogoUrl,
  resolveBrandingLogoTarget,
} from "@/lib/branding-logo-persist";
import {
  BrandingUploadError,
  saveBrandingLogoFile,
} from "@/lib/branding-upload";
import { requireSuperuser } from "@/lib/auth";
import { getStorageConfigStatus } from "@/lib/supabase-storage";

export async function POST(request: Request) {
  console.log("[branding-upload] POST entered");
  console.log("[branding-upload] env", {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? null,
  });

  let fileMeta: Record<string, unknown> = {};

  try {
    await requireSuperuser();
    console.log("[branding-upload] auth ok");

    const storageStatus = getStorageConfigStatus();
    if (!storageStatus.configured) {
      console.log("[branding-upload] return", {
        reason: "storage not configured",
        storageStatus,
      });
      return NextResponse.json(
        { error: "Storage nicht konfiguriert.", code: "STORAGE_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const companyIdField = formData.get("companyId");

    console.log("[branding-upload] file parsed", {
      hasFile: file instanceof File,
      fileSize: file instanceof File ? file.size : null,
      companyIdRaw: companyIdField,
    });

    if (!(file instanceof File) || file.size === 0) {
      console.log("[branding-upload] return", { reason: "no valid file" });
      return NextResponse.json({ error: "Keine Datei ausgewählt." }, { status: 400 });
    }

    const target = await resolveBrandingLogoTarget(companyIdField);
    fileMeta = {
      fileType: file.type,
      fileSize: file.size,
      scope: target.scope,
      companyId: target.companyId,
    };

    console.log("[branding-upload] before storage upload", fileMeta);
    const logoUrl = await saveBrandingLogoFile(file, target.scope);
    console.log("[branding-upload] storage upload success");

    await persistBrandingLogoUrl(logoUrl, target);

    console.log("[branding-upload] return", { reason: "success", logoUrlPrefix: logoUrl.slice(0, 80) });
    return NextResponse.json({ ok: true, logoUrl });
  } catch (error) {
    console.error("[branding-upload] fatal", error);

    const msg = error instanceof Error ? error.message : "";

    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      console.log("[branding-upload] return", { reason: "auth denied", msg });
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }

    if (error instanceof BrandingUploadError) {
      console.log("[branding-upload] return", {
        reason: "branding upload error",
        code: error.code,
        message: error.message,
        fileMeta,
      });
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.log("[branding-upload] return", { reason: "unhandled error", fileMeta });
    return NextResponse.json(
      { error: "Logo konnte nicht hochgeladen werden.", code: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}

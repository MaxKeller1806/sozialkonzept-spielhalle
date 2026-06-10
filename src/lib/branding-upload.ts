import {
  getStorageBucketName,
  getSupabaseStorageClient,
  StorageNotConfiguredError,
} from "@/lib/supabase-storage";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

export class BrandingUploadError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BrandingUploadError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function assertSafeSvg(buffer: Buffer): void {
  const text = buffer.toString("utf8");
  if (
    /<script[\s>]/i.test(text) ||
    /javascript:/i.test(text) ||
    /\son[a-z]+\s*=/i.test(text)
  ) {
    throw new BrandingUploadError("Dateityp nicht erlaubt.", "INVALID_FILE_TYPE");
  }
}

function buildObjectPath(scope: string, ext: string): string {
  const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `logo-${Date.now()}.${ext}`;

  if (safeScope === "operator") {
    return `operator/${filename}`;
  }

  if (safeScope.startsWith("company-")) {
    return `companies/${safeScope}/${filename}`;
  }

  return `companies/${safeScope}/${filename}`;
}

export async function saveBrandingLogoFile(
  file: File,
  scope: string
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new BrandingUploadError("Dateityp nicht erlaubt.", "INVALID_FILE_TYPE");
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new BrandingUploadError("Datei ist zu groß.", "FILE_TOO_LARGE");
  }

  const ext = EXT_BY_MIME[file.type] ?? "png";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/svg+xml") {
    assertSafeSvg(buffer);
  }

  let supabase;
  try {
    supabase = getSupabaseStorageClient();
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      throw new BrandingUploadError(
        "Storage nicht konfiguriert.",
        "STORAGE_NOT_CONFIGURED",
        500
      );
    }
    throw e;
  }

  const bucket = getStorageBucketName();
  const objectPath = buildObjectPath(scope, ext);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new BrandingUploadError(
      "Logo konnte nicht hochgeladen werden.",
      "UPLOAD_FAILED",
      500,
      {
        storageMessage: uploadError.message,
        storageCode: uploadError.name,
        bucket,
        objectPath,
        fileType: file.type,
        fileSize: file.size,
      }
    );
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  if (!publicUrlData.publicUrl) {
    throw new BrandingUploadError(
      "Logo konnte nicht hochgeladen werden.",
      "PUBLIC_URL_FAILED",
      500,
      { bucket, objectPath }
    );
  }

  return publicUrlData.publicUrl;
}

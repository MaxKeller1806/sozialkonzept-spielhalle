import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function saveBrandingLogoFile(
  file: File,
  scope: string
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Nur PNG, JPG, WebP oder SVG erlaubt.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo darf maximal 2 MB groß sein.");
  }

  const ext = EXT_BY_MIME[file.type] ?? "png";
  const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${safeScope}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public/uploads/branding");
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/branding/${filename}`;
}

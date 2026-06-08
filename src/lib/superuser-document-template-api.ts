import { NextResponse } from "next/server";
import { resetSqlOnFailure } from "@/lib/db";
import { documentTemplateApiError } from "@/lib/document-template";

export function handleSuperuserDocumentTemplateError(
  e: unknown,
  label: string
): NextResponse {
  console.error(label, e);
  void resetSqlOnFailure(e);
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const mapped = documentTemplateApiError(msg);
  if (mapped) {
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json({ error: "Fehler." }, { status: 500 });
}

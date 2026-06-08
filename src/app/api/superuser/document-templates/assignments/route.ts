import { NextResponse } from "next/server";
import { withDbQuery } from "@/lib/db";
import { requireSuperuser } from "@/lib/auth";
import { listDocumentTemplateAssignmentsPreview } from "@/lib/document-template-assignments";
import { handleSuperuserDocumentTemplateError } from "@/lib/superuser-document-template-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperuser();
    const preview = await withDbQuery(() =>
      listDocumentTemplateAssignmentsPreview()
    );
    return NextResponse.json(preview);
  } catch (e) {
    return handleSuperuserDocumentTemplateError(
      e,
      "[superuser/document-templates/assignments] GET"
    );
  }
}

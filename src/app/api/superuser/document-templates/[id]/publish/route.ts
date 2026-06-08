import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { publishGlobalDocumentTemplateDraft } from "@/lib/document-template";
import { handleSuperuserDocumentTemplateError } from "@/lib/superuser-document-template-api";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperuser();
    const { id } = await params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId) || templateId < 1) {
      return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
    }

    const detail = await publishGlobalDocumentTemplateDraft(templateId, user.id);
    return NextResponse.json(detail);
  } catch (e) {
    return handleSuperuserDocumentTemplateError(
      e,
      "[superuser/document-templates/[id]/publish] POST"
    );
  }
}

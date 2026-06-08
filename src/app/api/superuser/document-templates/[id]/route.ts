import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { getGlobalDocumentTemplateDetail } from "@/lib/document-template";
import { handleSuperuserDocumentTemplateError } from "@/lib/superuser-document-template-api";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId) || templateId < 1) {
      return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
    }

    const detail = await getGlobalDocumentTemplateDetail(templateId);
    if (!detail) {
      return NextResponse.json({ error: "Vorlage nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (e) {
    return handleSuperuserDocumentTemplateError(
      e,
      "[superuser/document-templates/[id]] GET"
    );
  }
}

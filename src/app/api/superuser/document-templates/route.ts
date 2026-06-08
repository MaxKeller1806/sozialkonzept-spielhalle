import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  DOCUMENT_TYPE_LABELS,
  listGlobalDocumentTemplates,
} from "@/lib/document-template";
import { handleSuperuserDocumentTemplateError } from "@/lib/superuser-document-template-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperuser();
    const templates = await listGlobalDocumentTemplates();
    return NextResponse.json({
      templates: templates.map((template) => ({
        id: template.id,
        documentType: template.documentType,
        documentTypeLabel: DOCUMENT_TYPE_LABELS[template.documentType],
        name: template.name,
        description: template.description,
        isDefault: template.isDefault,
        draftRevisionId: template.draftRevisionId,
        publishedRevisionId: template.publishedRevisionId,
        updatedAt: template.updatedAt,
      })),
    });
  } catch (e) {
    return handleSuperuserDocumentTemplateError(e, "[superuser/document-templates] GET");
  }
}

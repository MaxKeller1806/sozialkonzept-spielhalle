import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { generateGlobalDocumentTemplatePreviewPdf } from "@/lib/document-template";
import { handleSuperuserDocumentTemplateError } from "@/lib/superuser-document-template-api";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const templateId = Number(id);
    if (!Number.isFinite(templateId) || templateId < 1) {
      return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
    }

    let useDraft = true;
    try {
      const body = await request.json();
      if (body && typeof body === "object" && "useDraft" in body) {
        useDraft = Boolean(body.useDraft);
      }
    } catch {
      /* leerer Body → Draft bevorzugen */
    }

    const { pdf, filename } = await generateGlobalDocumentTemplatePreviewPdf(
      templateId,
      { useDraft }
    );

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleSuperuserDocumentTemplateError(
      e,
      "[superuser/document-templates/[id]/preview] POST"
    );
  }
}

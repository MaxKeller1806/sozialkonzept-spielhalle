import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  createGlobalDocumentTemplateDraft,
  type DocumentTemplateConfigPatch,
  getGlobalDocumentTemplateDetail,
  updateGlobalDocumentTemplateDraftConfig,
} from "@/lib/document-template";
import { handleSuperuserDocumentTemplateError } from "@/lib/superuser-document-template-api";

export const dynamic = "force-dynamic";

function parseTemplateId(id: string): number | null {
  const templateId = Number(id);
  if (!Number.isFinite(templateId) || templateId < 1) return null;
  return templateId;
}

function parseConfigPatch(body: unknown): DocumentTemplateConfigPatch | null {
  if (!body || typeof body !== "object") return null;
  const config = (body as { config?: unknown }).config;
  if (!config || typeof config !== "object") return null;
  return config as DocumentTemplateConfigPatch;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperuser();
    const { id } = await params;
    const templateId = parseTemplateId(id);
    if (templateId == null) {
      return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
    }

    const detail = await createGlobalDocumentTemplateDraft(templateId, user.id);
    return NextResponse.json(detail, { status: 201 });
  } catch (e) {
    return handleSuperuserDocumentTemplateError(
      e,
      "[superuser/document-templates/[id]/draft] POST"
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const templateId = parseTemplateId(id);
    if (templateId == null) {
      return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
    }

    const patch = parseConfigPatch(await request.json());
    if (!patch) {
      return NextResponse.json(
        { error: "config-Objekt erforderlich." },
        { status: 400 }
      );
    }

    const draftRevision = await updateGlobalDocumentTemplateDraftConfig(
      templateId,
      patch
    );
    const detail = await getGlobalDocumentTemplateDetail(templateId);
    return NextResponse.json({ draftRevision, detail });
  } catch (e) {
    return handleSuperuserDocumentTemplateError(
      e,
      "[superuser/document-templates/[id]/draft] PATCH"
    );
  }
}

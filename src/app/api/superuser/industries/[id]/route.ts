import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { getIndustryById, updateIndustry } from "@/lib/industries";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const industryId = Number(id);
    const body = await request.json();

    const existing = await getIndustryById(industryId);
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const industry = await updateIndustry(industryId, {
      name: body.name !== undefined ? String(body.name) : undefined,
      slug: body.slug !== undefined ? String(body.slug) : undefined,
      description:
        body.description !== undefined
          ? body.description == null
            ? null
            : String(body.description)
          : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    });

    return NextResponse.json({ industry });
  } catch (e) {
    console.error("[superuser/industries] PATCH:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Kurzname bereits vergeben." }, { status: 409 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

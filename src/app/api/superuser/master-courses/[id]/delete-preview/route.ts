import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { getMasterCourseDeletePreview } from "@/lib/master-course-delete";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const preview = await getMasterCourseDeletePreview(id);
    return NextResponse.json({ preview });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Masterkurs nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Vorschau konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

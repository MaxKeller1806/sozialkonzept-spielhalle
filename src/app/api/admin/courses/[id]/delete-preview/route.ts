import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCourseDeletePreview } from "@/lib/course-delete";
import { getCourseProvision, provisionPermissions } from "@/lib/course-provisions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const companyId = user.companyId!;

    const provision = await getCourseProvision(companyId, courseId);
    const perms = provisionPermissions(provision);
    if (!perms.canArchive && !perms.canReactivate) {
      return NextResponse.json(
        { error: "Entfernen ist für dieses Seminar nicht erlaubt." },
        { status: 403 }
      );
    }

    const preview = await getCourseDeletePreview(companyId, courseId);
    return NextResponse.json({ preview });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
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

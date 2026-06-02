import { NextResponse } from "next/server";
import { requireSuperuser, getCurrentUser } from "@/lib/auth";
import { assignMasterToAllCompanies } from "@/lib/course-provisions";
import {
  deleteMasterCourse,
  getMasterCourseDetail,
  getMasterCourseMeta,
  importCompanyCourseIntoMaster,
  updateMasterCourseSettings,
} from "@/lib/master-course-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const detail = await getMasterCourseDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({
      meta: detail.meta,
      course: detail.course,
      importHint: detail.importHint,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const body = await request.json();

    const course = await updateMasterCourseSettings(id, {
      passingScore: body.passingScore,
      status: body.status,
      title: body.title,
      description: body.description,
      validityType: body.validityType,
      validityIntervalValue: body.validityIntervalValue,
      validityIntervalUnit: body.validityIntervalUnit,
    });

    const meta = await getMasterCourseMeta(id);
    return NextResponse.json({ meta, course });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superuser = await requireSuperuser();
    const { id } = await params;
    const body = await request.json();

    if (body.action === "assignAll") {
      const count = await assignMasterToAllCompanies(id, superuser.id, {
        canEditContent: body.canEditContent === true,
        canEditTests: body.canEditTests === true,
        canAddModules: body.canAddModules === true,
        canDeactivate: body.canDeactivate === true,
      });
      return NextResponse.json({ ok: true, assignedCount: count });
    }

    if (body.action === "importFromCompanyCourse") {
      const result = await importCompanyCourseIntoMaster(id);
      if (!result.ok) {
        const messages: Record<string, string> = {
          NOT_FOUND: "Master-Kurs nicht gefunden.",
          ALREADY_HAS_CONTENT: "Dieser Master-Kurs enthält bereits Inhalte.",
          NO_SOURCE: "Kein Firmenkurs mit Inhalten für diesen Slug gefunden.",
        };
        return NextResponse.json(
          { error: messages[result.reason] ?? "Import fehlgeschlagen." },
          { status: result.reason === "NOT_FOUND" ? 404 : 409 }
        );
      }
      const detail = await getMasterCourseDetail(id);
      return NextResponse.json({
        ok: true,
        imported: result,
        meta: detail?.meta,
        course: detail?.course,
        importHint: detail?.importHint,
      });
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MASTER_NOT_FOUND") {
      return NextResponse.json({ error: "Master-Kurs nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const ok = await deleteMasterCourse(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Löschen nicht möglich (noch Firmen zugewiesen?)." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

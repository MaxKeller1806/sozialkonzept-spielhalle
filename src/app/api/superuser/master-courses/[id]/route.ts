import { NextResponse } from "next/server";
import { requireSuperuser, getCurrentUser } from "@/lib/auth";
import { assignMasterToAllCompanies } from "@/lib/course-provisions";
import {
  getMasterCourseDetail,
  getMasterCourseMeta,
  importCompanyCourseIntoMaster,
  setMasterCourseActive,
  updateMasterCourseSettings,
  updateMasterCourseTopicId,
} from "@/lib/master-course-db";
import { executePermanentMasterCourseDelete } from "@/lib/master-course-delete";

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

    if (body.active === true) {
      const ok = await setMasterCourseActive(id, true);
      if (!ok) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      const meta = await getMasterCourseMeta(id);
      return NextResponse.json({ meta, message: "Masterkurs reaktiviert." });
    }

    if (body.active === false) {
      const ok = await setMasterCourseActive(id, false);
      if (!ok) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      const meta = await getMasterCourseMeta(id);
      return NextResponse.json({
        meta,
        message: "Masterkurs deaktiviert.",
      });
    }

    if (body.topicId !== undefined) {
      let parsedTopicId: number | null = null;
      if (body.topicId != null && body.topicId !== "") {
        parsedTopicId = Number(body.topicId);
        if (!Number.isFinite(parsedTopicId)) {
          return NextResponse.json(
            { error: "Ungültiges Hauptthema." },
            { status: 400 }
          );
        }
      }
      await updateMasterCourseTopicId(id, parsedTopicId);
    }

    const hasSettings =
      body.passingScore != null ||
      body.status != null ||
      body.title != null ||
      body.description !== undefined ||
      body.validityType != null ||
      body.validityIntervalValue != null ||
      body.validityIntervalUnit != null;

    if (!hasSettings && body.topicId === undefined) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    let course;
    if (hasSettings) {
      course = await updateMasterCourseSettings(id, {
        passingScore: body.passingScore,
        status: body.status,
        title: body.title,
        description: body.description,
        validityType: body.validityType,
        validityIntervalValue: body.validityIntervalValue,
        validityIntervalUnit: body.validityIntervalUnit,
      });
    }

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
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "permanent" ? "permanent" : body.mode === "archive" ? "archive" : null;

    if (!mode) {
      return NextResponse.json(
        { error: "Bitte mode „archive“ oder „permanent“ angeben." },
        { status: 400 }
      );
    }

    if (mode === "archive") {
      const ok = await setMasterCourseActive(id, false);
      if (!ok) {
        return NextResponse.json({ error: "Masterkurs nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        mode: "archived",
        message:
          "Masterkurs deaktiviert. Bereits provisionierte Firmenkurse und bestehende Nachweise bleiben erhalten.",
      });
    }

    const confirmTitle =
      typeof body.confirmTitle === "string" ? body.confirmTitle : "";
    if (!confirmTitle.trim()) {
      return NextResponse.json(
        { error: "Zur Bestätigung muss der exakte Masterkurs-Titel eingegeben werden." },
        { status: 400 }
      );
    }

    const result = await executePermanentMasterCourseDelete(id, confirmTitle);
    return NextResponse.json({
      ok: true,
      mode: "deleted",
      hadDependencies: result.hadDependencies,
      message: result.hadDependencies
        ? "Masterkurs wurde endgültig gelöscht. Bestehende Firmenkurse bleiben ohne Master-Verknüpfung erhalten."
        : "Masterkurs wurde endgültig gelöscht.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Masterkurs nicht gefunden." }, { status: 404 });
    }
    if (msg === "CONFIRM_TITLE_MISMATCH") {
      return NextResponse.json(
        { error: "Der eingegebene Titel stimmt nicht überein." },
        { status: 400 }
      );
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Löschen fehlgeschlagen." }, { status: 500 });
  }
}

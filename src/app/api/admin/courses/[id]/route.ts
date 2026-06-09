import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getCourseMetaWithTopics,
  setCompanyCourseActive,
  updateCourseSettings,
} from "@/lib/course-db";
import { executePermanentCourseDelete } from "@/lib/course-delete";
import { getCourseEvidenceSummary } from "@/lib/course-evidence";
import {
  assertCourseSettingsEditable,
  getCourseProvision,
  provisionPermissions,
} from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import { normalizeValidityType, normalizeIntervalUnit } from "@/lib/course-validity";
import {
  assertTopicIdsAssignableToCompany,
  setCourseTopicAssignments,
} from "@/lib/course-topics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const meta = await getCourseMetaWithTopics(user.companyId!, courseId);
    if (!meta) {
      return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
    }
    const provision = await getCourseProvision(user.companyId!, courseId);
    const evidence = await getCourseEvidenceSummary(courseId);
    return NextResponse.json({
      course: meta,
      permissions: provisionPermissions(provision),
      evidence,
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
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const companyId = user.companyId!;
    const body = await request.json();

    let topicIdsUpdated = false;

    if (body.topicIds !== undefined) {
      const topicIds = Array.isArray(body.topicIds)
        ? body.topicIds.map(Number).filter((id: number) => Number.isFinite(id) && id > 0)
        : [];
      try {
        await assertTopicIdsAssignableToCompany(companyId, topicIds);
        await setCourseTopicAssignments(companyId, courseId, topicIds);
        topicIdsUpdated = true;
      } catch (e) {
        const locMsg = e instanceof Error ? e.message : "";
        if (locMsg === "TOPIC_INVALID") {
          return NextResponse.json(
            { error: "Hauptthema nicht verfügbar." },
            { status: 400 }
          );
        }
        throw e;
      }
    } else if (body.topicId !== undefined) {
      let parsed: number[] = [];
      if (body.topicId != null && body.topicId !== "") {
        parsed = [Number(body.topicId)];
      }
      try {
        await setCourseTopicAssignments(companyId, courseId, parsed);
        topicIdsUpdated = true;
      } catch (e) {
        const locMsg = e instanceof Error ? e.message : "";
        if (locMsg === "TOPIC_INVALID") {
          return NextResponse.json(
            { error: "Hauptthema nicht verfügbar." },
            { status: 400 }
          );
        }
        throw e;
      }
    }

    if (typeof body.active === "boolean") {
      const provision = await getCourseProvision(companyId, courseId);
      const perms = provisionPermissions(provision);

      if (body.active) {
        if (provision?.disabledBySuperuser) {
          return NextResponse.json(
            { error: "Reaktivieren ist für dieses Seminar nicht erlaubt." },
            { status: 403 }
          );
        }
      } else if (!perms.canArchive) {
        return NextResponse.json(
          { error: "Archivieren ist für dieses Seminar nicht erlaubt." },
          { status: 403 }
        );
      }

      const ok = await setCompanyCourseActive(companyId, courseId, body.active);
      if (!ok) {
        return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
      }
      const meta = await getCourseMetaWithTopics(companyId, courseId);
      return NextResponse.json({
        course: meta,
        message: body.active
          ? "Seminar wurde reaktiviert."
          : "Seminar wurde archiviert.",
      });
    }

    const hasSettings =
      body.passingScore != null ||
      body.validityType != null ||
      body.validityIntervalValue != null ||
      body.validityIntervalUnit != null;

    let course;
    if (hasSettings) {
      await assertCourseSettingsEditable(companyId, courseId);
      course = await updateCourseSettings(companyId, courseId, {
        passingScore:
          body.passingScore != null ? Number(body.passingScore) : undefined,
        validityType:
          body.validityType != null
            ? normalizeValidityType(body.validityType)
            : undefined,
        validityIntervalValue:
          body.validityIntervalValue != null
            ? Number(body.validityIntervalValue)
            : undefined,
        validityIntervalUnit:
          body.validityIntervalUnit != null
            ? normalizeIntervalUnit(body.validityIntervalUnit) ?? undefined
            : undefined,
      });
    }

    if (
      body.topicIds === undefined &&
      body.topicId === undefined &&
      typeof body.active !== "boolean" &&
      !hasSettings
    ) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    const meta = await getCourseMetaWithTopics(companyId, courseId);
    return NextResponse.json({ course: meta, courseData: course, topicIdsUpdated });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id: courseId } = await params;
    const companyId = user.companyId!;
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "permanent" ? "permanent" : body.mode === "archive" ? "archive" : null;

    if (!mode) {
      return NextResponse.json(
        { error: "Bitte mode „archive“ oder „permanent“ angeben." },
        { status: 400 }
      );
    }

    const provision = await getCourseProvision(companyId, courseId);
    const perms = provisionPermissions(provision);
    if (!perms.canArchive && !perms.canReactivate) {
      return NextResponse.json(
        { error: "Entfernen ist für dieses Seminar nicht erlaubt." },
        { status: 403 }
      );
    }

    if (mode === "archive") {
      if (!perms.canArchive) {
        return NextResponse.json(
          { error: "Archivieren ist für dieses Seminar nicht erlaubt." },
          { status: 403 }
        );
      }
      const ok = await setCompanyCourseActive(companyId, courseId, false);
      if (!ok) {
        return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        mode: "archived",
        message:
          "Seminar wurde archiviert. Bestehende Nachweise und Zuweisungen bleiben erhalten.",
      });
    }

    const confirmTitle =
      typeof body.confirmTitle === "string" ? body.confirmTitle : "";
    if (!confirmTitle.trim()) {
      return NextResponse.json(
        { error: "Zur Bestätigung muss der exakte Seminartitel eingegeben werden." },
        { status: 400 }
      );
    }

    const result = await executePermanentCourseDelete(
      companyId,
      courseId,
      confirmTitle
    );
    return NextResponse.json({
      ok: true,
      mode: "deleted",
      hadDependencies: result.hadDependencies,
      message: result.hadDependencies
        ? "Seminar und zugehörige Nachweisdaten wurden endgültig gelöscht."
        : "Seminar wurde endgültig gelöscht.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Seminar nicht gefunden." }, { status: 404 });
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

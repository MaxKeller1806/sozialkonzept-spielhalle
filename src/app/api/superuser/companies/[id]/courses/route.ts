import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { loadCompanyCoursesPageData } from "@/lib/course-assignment-options";
import { getCourseData } from "@/lib/course-db";
import {
  buildContentStateMap,
  setContentActive,
} from "@/lib/content-provisions";
import {
  assignMasterToCompany,
  getCourseProvision,
  updateProvision,
} from "@/lib/course-provisions";
import { resetSql, resetSqlOnFailure } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function stepLog(requestId: string, label: string, startMs: number): void {
  console.log(
    `[superuser/company-courses] ${requestId} ${label} ${Math.round(performance.now() - startMs)}ms`
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const totalStart = performance.now();
  const { id } = await params;
  const companyId = Number(id);
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  const detail = url.searchParams.get("detail") === "1";

  try {
    let step = performance.now();
    await requireSuperuser();
    stepLog(requestId, "auth", step);

    if (courseId && detail) {
      step = performance.now();
      const course = await getCourseData(companyId, courseId);
      stepLog(requestId, "course-detail-load", step);
      if (!course) {
        return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
      }

      step = performance.now();
      const provision = await getCourseProvision(companyId, courseId);
      stepLog(requestId, "provision-detail-load", step);

      step = performance.now();
      const contentStates = await buildContentStateMap(companyId, courseId, course);
      stepLog(requestId, "content-states", step);

      stepLog(requestId, "total", totalStart);
      return NextResponse.json({
        provision,
        course: {
          modules: course.modules.map((m) => ({
            id: m.id,
            title: m.title,
            lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })),
          })),
          exam: course.exam.map((q) => ({
            id: q.id,
            question: q.question,
            moduleId: q.moduleId,
          })),
        },
        contentStates,
      });
    }

    step = performance.now();
    const data = await loadCompanyCoursesPageData(companyId);
    stepLog(requestId, "bundle-load", step);
    stepLog(requestId, "total", totalStart);

    return NextResponse.json(data);
  } catch (e) {
    console.error(`[superuser/company-courses] ${requestId} GET:`, e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }
    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Migration fehlt: npm run db:migrate" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: msg || "Kurse konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const superuser = await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    const body = await request.json();

    if (!body.masterCourseId) {
      return NextResponse.json(
        { error: "masterCourseId erforderlich." },
        { status: 400 }
      );
    }

    const provision = await assignMasterToCompany(
      String(body.masterCourseId),
      companyId,
      superuser.id,
      {
        canEditContent: body.canEditContent === true,
        canEditTests: body.canEditTests === true,
        canAddModules: body.canAddModules === true,
        canDeactivate: body.canDeactivate === true,
      }
    );

    return NextResponse.json({ provision }, { status: 201 });
  } catch (e) {
    console.error("[superuser/courses] POST:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "MASTER_NOT_FOUND") {
      return NextResponse.json({ error: "Master-Kurs nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg || "Zuweisung fehlgeschlagen." },
      { status: 500 }
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
    const companyId = Number(id);
    const body = await request.json();

    if (!body.courseId) {
      return NextResponse.json({ error: "courseId erforderlich." }, { status: 400 });
    }

    const courseId = String(body.courseId);

    if (body.content) {
      const c = body.content as {
        contentType: "module" | "lesson" | "question";
        contentId: number;
        parentModuleId?: number;
        isActive: boolean;
      };
      await setContentActive(companyId, courseId, {
        contentType: c.contentType,
        contentId: Number(c.contentId),
        parentModuleId: c.parentModuleId,
        isActive: c.isActive,
      });
      const course = await getCourseData(companyId, courseId);
      if (!course) {
        return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
      }
      const contentStates = await buildContentStateMap(companyId, courseId, course);
      return NextResponse.json({ ok: true, contentStates });
    }

    const status =
      body.status === "locked" ? "disabled" : body.status;

    const provision = await updateProvision(companyId, courseId, {
      status,
      canEditContent: body.canEditContent,
      canEditTests: body.canEditTests,
      canAddModules: body.canAddModules,
      canDeactivate: body.canDeactivate,
    });

    if (!provision && status) {
      const { getSql } = await import("@/lib/db");
      const sql = getSql();
      await sql`
        UPDATE courses SET active = ${status === "active"}
        WHERE id = ${courseId} AND company_id = ${companyId}
      `;
      const fallback = await getCourseProvision(companyId, courseId);
      if (fallback) {
        return NextResponse.json({ provision: fallback });
      }
    }

    if (!provision) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ provision });
  } catch (e) {
    console.error("[superuser/courses] PATCH:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg || "Aktualisierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}

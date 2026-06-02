import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { getCourseData } from "@/lib/course-db";
import {
  buildContentStateMap,
  setContentActive,
} from "@/lib/content-provisions";
import {
  assignMasterToCompany,
  getCourseProvision,
  loadCompanyProvisionsOverview,
  updateProvision,
} from "@/lib/course-provisions";
import { listMasterCoursesOverview } from "@/lib/master-course-db";
import { getCompanyById } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const companyId = Number(id);
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  const detail = url.searchParams.get("detail") === "1";

  try {
    console.time("auth");
    await requireSuperuser();
    console.timeEnd("auth");

    if (courseId && detail) {
      const course = await getCourseData(companyId, courseId);
      if (!course) {
        return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
      }
      console.time("provisions-load");
      const provision = await getCourseProvision(companyId, courseId);
      console.timeEnd("provisions-load");
      const contentStates = await buildContentStateMap(companyId, courseId, course);
      console.time("response");
      const body = {
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
      };
      console.timeEnd("response");
      return NextResponse.json(body);
    }

    console.time("company-load");
    const company = await getCompanyById(companyId);
    console.timeEnd("company-load");
    if (!company) {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }

    console.time("provisions-load");
    const { provisions, migrationRequired } =
      await loadCompanyProvisionsOverview(companyId);
    console.timeEnd("provisions-load");

    console.time("master-courses-load");
    const masters = await listMasterCoursesOverview();
    console.timeEnd("master-courses-load");

    console.time("response");
    const body = {
      provisions,
      masters,
      ...(migrationRequired
        ? { migrationHint: "Migration fehlt: npm run db:migrate" }
        : {}),
    };
    console.timeEnd("response");
    return NextResponse.json(body);
  } catch (e) {
    console.error("[superuser/courses] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Migration fehlt: npm run db:migrate", provisions: [], masters: [] },
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

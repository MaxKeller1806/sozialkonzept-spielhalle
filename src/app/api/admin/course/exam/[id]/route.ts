import { NextResponse } from "next/server";
import { validateExamQuestion } from "@/lib/course-validation";
import { parseExamQuestionBody } from "@/lib/exam-question-body";
import {
  deleteExamQuestion as deleteCompanyExamQuestion,
  getCourseData as getCompanyCourseData,
  getExamQuestion as getCompanyExamQuestion,
  saveExamQuestion as saveCompanyExamQuestion,
} from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import {
  deleteExamQuestion as deleteMasterExamQuestion,
  getExamQuestion as getMasterExamQuestion,
  getMasterCourseData,
  saveExamQuestion as saveMasterExamQuestion,
} from "@/lib/master-course-db";
import { setPoolQuestionActive } from "@/lib/question-pool-db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const qid = Number(id);

    const question = isMasterEditor(ctx)
      ? await getMasterExamQuestion(ctx.masterId, qid)
      : await getCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);

    if (!question) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const qid = Number(id);
    const body = await request.json();
    const parsed = parseExamQuestionBody({ ...body, id: qid });

    if (isMasterEditor(ctx)) {
      const course = await getMasterCourseData(ctx.masterId);
      if (!course) {
        return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
      }
      const error = validateExamQuestion(
        parsed,
        course.modules.map((m) => m.id)
      );
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      if (!(await getMasterExamQuestion(ctx.masterId, qid))) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      const question = await saveMasterExamQuestion(ctx.masterId, parsed);
      return NextResponse.json({ question });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
    const existing = await getCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    if (existing.sourceType === "master") {
      return NextResponse.json(
        { error: "Master-Fragen können nicht bearbeitet werden." },
        { status: 403 }
      );
    }

    const course = await getCompanyCourseData(ctx.companyId, ctx.courseId);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }
    const error = validateExamQuestion(
      parsed,
      course.modules.map((m) => m.id)
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    const question = await saveCompanyExamQuestion(ctx.companyId, ctx.courseId, parsed);
    return NextResponse.json({ question });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
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
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const qid = Number(id);
    const body = await request.json();

    if (body.active === undefined) {
      return NextResponse.json({ error: "Keine Änderung angegeben." }, { status: 400 });
    }

    const existing = isMasterEditor(ctx)
      ? await getMasterExamQuestion(ctx.masterId, qid)
      : await getCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);

    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    if (!isMasterEditor(ctx)) {
      await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
      if (existing.sourceType === "master") {
        return NextResponse.json(
          { error: "Master-Fragen können nur durch Certiano verwaltet werden." },
          { status: 403 }
        );
      }
    }

    const updated = await setPoolQuestionActive(qid, Boolean(body.active));
    if (!updated) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const question = isMasterEditor(ctx)
      ? await getMasterExamQuestion(ctx.masterId, qid)
      : await getCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);

    return NextResponse.json({ question });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const qid = Number(id);

    const existing = isMasterEditor(ctx)
      ? await getMasterExamQuestion(ctx.masterId, qid)
      : await getCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);

    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    if (!isMasterEditor(ctx)) {
      await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
      if (existing.sourceType === "master") {
        return NextResponse.json(
          { error: "Master-Fragen können nicht gelöscht werden." },
          { status: 403 }
        );
      }
    }

    const ok = isMasterEditor(ctx)
      ? await deleteMasterExamQuestion(ctx.masterId, qid)
      : await deleteCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);

    if (!ok) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "COURSE_NOT_FOUND") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

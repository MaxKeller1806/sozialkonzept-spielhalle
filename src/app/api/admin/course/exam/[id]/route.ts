import { NextResponse } from "next/server";
import { validateExamQuestion } from "@/lib/course-validation";
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
import type { ExamQuestion } from "@/lib/types";

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

    if (isMasterEditor(ctx)) {
      const course = await getMasterCourseData(ctx.masterId);
      if (!course) {
        return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
      }
      const question: ExamQuestion = {
        id: qid,
        moduleId: Number(body.moduleId),
        question: String(body.question ?? "").trim(),
        type: body.type,
        answers: body.type === "boolean" ? undefined : body.answers,
        correct: body.correct,
      };
      const error = validateExamQuestion(
        question,
        course.modules.map((m) => m.id)
      );
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      if (!(await getMasterExamQuestion(ctx.masterId, qid))) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      await saveMasterExamQuestion(ctx.masterId, question);
      return NextResponse.json({ question });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
    const course = await getCompanyCourseData(ctx.companyId, ctx.courseId);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }
    const question: ExamQuestion = {
      id: qid,
      moduleId: Number(body.moduleId),
      question: String(body.question ?? "").trim(),
      type: body.type,
      answers: body.type === "boolean" ? undefined : body.answers,
      correct: body.correct,
    };
    const error = validateExamQuestion(
      question,
      course.modules.map((m) => m.id)
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    if (!(await getCompanyExamQuestion(ctx.companyId, ctx.courseId, qid))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    await saveCompanyExamQuestion(ctx.companyId, ctx.courseId, question);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const { id } = await params;
    const qid = Number(id);

    if (isMasterEditor(ctx)) {
      const ok = await deleteMasterExamQuestion(ctx.masterId, qid);
      if (!ok) {
        return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
    const ok = await deleteCompanyExamQuestion(ctx.companyId, ctx.courseId, qid);
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

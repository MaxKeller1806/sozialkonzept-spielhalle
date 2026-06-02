import { NextResponse } from "next/server";
import { validateExamQuestion } from "@/lib/course-validation";
import {
  getCourseData as getCompanyCourseData,
  nextExamId as nextCompanyExamId,
  saveExamQuestion as saveCompanyExamQuestion,
} from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import {
  getMasterCourseData,
  nextExamId as nextMasterExamId,
  saveExamQuestion as saveMasterExamQuestion,
} from "@/lib/master-course-db";
import type { ExamQuestion } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const body = await request.json();

    if (isMasterEditor(ctx)) {
      const course = await getMasterCourseData(ctx.masterId);
      if (!course) {
        return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
      }
      const question: ExamQuestion = {
        id: body.id ?? (await nextMasterExamId(ctx.masterId)),
        moduleId: Number(body.moduleId),
        question: String(body.question ?? "").trim(),
        type: body.type,
        answers: body.answers,
        correct: body.correct,
      };
      const error = validateExamQuestion(
        question,
        course.modules.map((m) => m.id)
      );
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      await saveMasterExamQuestion(ctx.masterId, question);
      return NextResponse.json({ question }, { status: 201 });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
    const course = await getCompanyCourseData(ctx.companyId, ctx.courseId);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }
    const question: ExamQuestion = {
      id: body.id ?? (await nextCompanyExamId(ctx.companyId, ctx.courseId)),
      moduleId: Number(body.moduleId),
      question: String(body.question ?? "").trim(),
      type: body.type,
      answers: body.answers,
      correct: body.correct,
    };
    const error = validateExamQuestion(
      question,
      course.modules.map((m) => m.id)
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    await saveCompanyExamQuestion(ctx.companyId, ctx.courseId, question);
    return NextResponse.json({ question }, { status: 201 });
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

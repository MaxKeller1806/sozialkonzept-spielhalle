import { NextResponse } from "next/server";
import { validateExamQuestion } from "@/lib/course-validation";
import { parseExamQuestionBody } from "@/lib/exam-question-body";
import {
  getCourseData as getCompanyCourseData,
  saveExamQuestion as saveCompanyExamQuestion,
} from "@/lib/course-db";
import { courseIdFromRequest } from "@/lib/course-context";
import { isMasterEditor, resolveCourseEditor } from "@/lib/course-editor-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import {
  getMasterCourseData,
  saveExamQuestion as saveMasterExamQuestion,
} from "@/lib/master-course-db";

export async function POST(request: Request) {
  try {
    const ctx = await resolveCourseEditor(courseIdFromRequest(request));
    const body = await request.json();
    const parsed = parseExamQuestionBody(body);

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
      const question = await saveMasterExamQuestion(ctx.masterId, parsed);
      return NextResponse.json({ question }, { status: 201 });
    }

    await assertCourseEditable(ctx.companyId, ctx.courseId, "tests");
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

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import { getCourseData, nextExamId, saveExamQuestion } from "@/lib/course-db";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import { assertCourseEditable } from "@/lib/course-provisions";
import { coursePermissionErrorResponse } from "@/lib/course-permissions-api";
import type { ExamQuestion } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    await assertCourseEditable(companyId, courseId, "tests");
    const body = await request.json();
    const course = await getCourseData(companyId, courseId);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }

    const question: ExamQuestion = {
      id: body.id ?? (await nextExamId(companyId, courseId)),
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

    await saveExamQuestion(companyId, courseId, question);
    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    const perm = coursePermissionErrorResponse(e);
    if (perm) return perm;
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

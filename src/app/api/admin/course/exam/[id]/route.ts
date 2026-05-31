import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import {
  deleteExamQuestion,
  getCourseData,
  getExamQuestion,
  saveExamQuestion,
} from "@/lib/course-db";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";
import type { ExamQuestion } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id } = await params;
    const question = await getExamQuestion(companyId, courseId, Number(id));
    if (!question) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
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
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id } = await params;
    const body = await request.json();
    const course = await getCourseData(companyId, courseId);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }

    const question: ExamQuestion = {
      id: Number(id),
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

    if (!(await getExamQuestion(companyId, courseId, question.id))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    await saveExamQuestion(companyId, courseId, question);
    return NextResponse.json({ question });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
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
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
    const { id } = await params;
    const ok = await deleteExamQuestion(companyId, courseId, Number(id));
    if (!ok) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
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

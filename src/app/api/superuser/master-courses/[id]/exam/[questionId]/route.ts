import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import {
  deleteExamQuestion,
  getExamQuestion,
  getMasterCourseData,
  saveExamQuestion,
} from "@/lib/master-course-db";
import type { ExamQuestion } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, questionId } = await params;
    const question = await getExamQuestion(id, Number(questionId));
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
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, questionId } = await params;
    const body = await request.json();
    const course = await getMasterCourseData(id);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }

    const question: ExamQuestion = {
      id: Number(questionId),
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

    if (!(await getExamQuestion(id, question.id))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    await saveExamQuestion(id, question);
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
  _request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, questionId } = await params;
    const ok = await deleteExamQuestion(id, Number(questionId));
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

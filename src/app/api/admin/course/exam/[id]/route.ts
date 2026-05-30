import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import {
  deleteExamQuestion,
  getCourseData,
  getExamQuestion,
  saveExamQuestion,
} from "@/lib/course-store";
import type { ExamQuestion } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("admin");
    const { id } = await params;
    const question = getExamQuestion(Number(id));
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
    await requireUser("admin");
    const { id } = await params;
    const body = await request.json();
    const course = getCourseData();
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

    if (!getExamQuestion(question.id)) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    saveExamQuestion(question);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("admin");
    const { id } = await params;
    const ok = deleteExamQuestion(Number(id));
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

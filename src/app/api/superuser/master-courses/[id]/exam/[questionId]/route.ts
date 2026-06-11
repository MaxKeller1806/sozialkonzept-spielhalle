import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import { parseExamQuestionBody } from "@/lib/exam-question-body";
import {
  deleteExamQuestion,
  getExamQuestion,
  getMasterCourseData,
  saveExamQuestion,
} from "@/lib/master-course-db";
import { setPoolQuestionActive } from "@/lib/question-pool-db";

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

    const parsed = parseExamQuestionBody({ ...body, id: Number(questionId) });
    const error = validateExamQuestion(
      parsed,
      course.modules.map((m) => m.id)
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!(await getExamQuestion(id, parsed.id))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const question = await saveExamQuestion(id, parsed);
    return NextResponse.json({ question });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, questionId } = await params;
    const body = await request.json();

    if (body.active === undefined) {
      return NextResponse.json({ error: "Keine Änderung angegeben." }, { status: 400 });
    }

    if (!(await getExamQuestion(id, Number(questionId)))) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    await setPoolQuestionActive(Number(questionId), Boolean(body.active));
    const question = await getExamQuestion(id, Number(questionId));
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

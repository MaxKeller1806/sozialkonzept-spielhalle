import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import {
  getMasterCourseData,
  nextExamId,
  saveExamQuestion,
} from "@/lib/master-course-db";
import type { ExamQuestion } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const body = await request.json();
    const course = await getMasterCourseData(id);
    if (!course) {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }

    const question: ExamQuestion = {
      id: body.id ?? (await nextExamId(id)),
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

    await saveExamQuestion(id, question);
    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

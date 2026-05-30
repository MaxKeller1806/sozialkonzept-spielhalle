import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateExamQuestion } from "@/lib/course-validation";
import { getCourseData, nextExamId, saveExamQuestion } from "@/lib/course-store";
import type { ExamQuestion } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json();
    const course = getCourseData();
    const question: ExamQuestion = {
      id: body.id ?? nextExamId(),
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

    saveExamQuestion(question);
    return NextResponse.json({ question }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

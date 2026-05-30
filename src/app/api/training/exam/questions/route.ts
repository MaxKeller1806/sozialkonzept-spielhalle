import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/course";
import { questionsByIds, selectExamQuestions } from "@/lib/exam-select";
import {
  allLessonsComplete,
  getActiveAttempt,
  getEffectiveLessonProgress,
  getExamQuestionIds,
  setExamQuestionIds,
} from "@/lib/training";

export async function GET() {
  try {
    const user = await requireUser();
    const course = getCourse();
    const attempt = await getActiveAttempt(user.id);

    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const progress = getEffectiveLessonProgress(attempt);
    if (!allLessonsComplete(progress)) {
      return NextResponse.json(
        { error: "Module noch nicht abgeschlossen." },
        { status: 400 }
      );
    }

    let ids = getExamQuestionIds(attempt);
    const perTest = course.examQuestionsPerTest ?? 15;

    if (ids.length !== perTest) {
      const selected = selectExamQuestions(course.exam, perTest);
      ids = selected.map((q) => q.id);
      await setExamQuestionIds(attempt.id, ids);
    }

    const selectedQuestions = questionsByIds(course.exam, ids);

    const sections = course.modules
      .map((mod) => ({
        moduleId: mod.id,
        moduleTitle: mod.title,
        questions: selectedQuestions
          .filter((q) => q.moduleId === mod.id)
          .map(({ id, question, type, answers }) => ({
            id,
            question,
            type,
            answers,
          })),
      }))
      .filter((s) => s.questions.length > 0);

    const questions = sections.flatMap((s) => s.questions);

    return NextResponse.json({
      questions,
      sections,
      total: questions.length,
      poolSize: course.exam.length,
      passingScore: course.passingScore,
      minCorrect: course.minCorrectAnswers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

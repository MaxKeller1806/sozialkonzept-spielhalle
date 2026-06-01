import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { questionsByIds, selectExamQuestions } from "@/lib/exam-select";
import {
  allLessonsComplete,
  getActiveAttempt,
  getEffectiveLessonProgress,
  getExamQuestionIds,
  setExamQuestionIds,
  assertUserCourseAccess,
} from "@/lib/training";
import { resolveEmployeeCourse } from "@/lib/course-context";

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    if (!user.companyId) {
      return NextResponse.json({ error: "Kein Mandant." }, { status: 403 });
    }

    const courseId = new URL(request.url).searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "Kurs-ID fehlt." }, { status: 400 });
    }

    await assertUserCourseAccess(user.id, user.companyId, courseId);
    const { course } = await resolveEmployeeCourse(user, courseId);
    const attempt = await getActiveAttempt(user.id, courseId);

    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const progress = getEffectiveLessonProgress(course, attempt);
    if (!allLessonsComplete(course, progress)) {
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
      courseId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

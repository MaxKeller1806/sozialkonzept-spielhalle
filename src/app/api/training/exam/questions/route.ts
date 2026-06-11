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

    const activePool = course.exam.filter((q) => q.active !== false);
    if (activePool.length === 0) {
      return NextResponse.json(
        { error: "Kein Fragenpool für dieses Seminar verfügbar." },
        { status: 400 }
      );
    }

    let ids = getExamQuestionIds(attempt);
    const perTest = Math.min(course.examQuestionsPerTest ?? 15, activePool.length);

    if (ids.length !== perTest) {
      const selected = selectExamQuestions(activePool, perTest);
      ids = selected.map((q) => q.id);
      await setExamQuestionIds(attempt.id, ids);
    }

    const selectedQuestions = questionsByIds(activePool, ids);

    const clientQuestions = selectedQuestions.map(({ id, question, type, answers }) => ({
      id,
      question,
      type,
      answers,
    }));

    const sections = [
      {
        moduleId: 0,
        moduleTitle: "Abschlusstest",
        questions: clientQuestions,
      },
    ];

    const minCorrect = Math.ceil((perTest * course.passingScore) / 100);

    return NextResponse.json({
      questions: clientQuestions,
      sections,
      total: clientQuestions.length,
      poolSize: activePool.length,
      passingScore: course.passingScore,
      minCorrect,
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

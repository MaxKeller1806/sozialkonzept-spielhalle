import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/course";
import { getLatestCertificate } from "@/lib/certificate";
import { getCertificateStatus } from "@/lib/status";
import {
  getNextLesson,
  lessonPath,
  totalLessonCount,
} from "@/lib/course-nav";
import {
  allLessonsComplete,
  getActiveAttempt,
  getEffectiveLessonProgress,
  startAttempt,
} from "@/lib/training";

export async function GET() {
  try {
    const user = await requireUser();
    const course = getCourse();
    const attempt =
      (await getActiveAttempt(user.id)) ?? (await startAttempt(user.id));
    const lessonProgress = getEffectiveLessonProgress(attempt);
    const totalLessons = totalLessonCount(course);
    const completedLessons = lessonProgress.length;
    const lessonsComplete = allLessonsComplete(lessonProgress);
    const next = getNextLesson(course, lessonProgress);
    const cert = await getLatestCertificate(user.id);

    return NextResponse.json({
      course: {
        id: course.courseId,
        name: course.courseName,
        version: course.version,
        modules: course.modules,
        passingScore: course.passingScore,
        minCorrectAnswers: course.minCorrectAnswers,
        examQuestionsPerTest: course.examQuestionsPerTest,
        maxDurationMinutes: course.maxDurationMinutes,
      },
      attempt: {
        id: attempt.id,
        startedAt: attempt.startedAt,
        lessonProgress,
        completedLessons,
        totalLessons,
        lessonsComplete,
        allModulesComplete: lessonsComplete,
        examAvailable: lessonsComplete,
        nextLessonUrl: next ? lessonPath(next.moduleId, next.lessonId) : null,
        hasStarted: completedLessons > 0,
      },
      certificate: cert
        ? {
            id: cert.id,
            certificateNumber: cert.certificateNumber,
            validUntil: cert.validUntil,
            score: cert.score,
            status: getCertificateStatus(cert),
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

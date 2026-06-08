import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { getLatestCertificate } from "@/lib/certificate";
import { getCertificateStatus } from "@/lib/status";
import {
  formatEmployeeSeminarStatus,
  getEmployeeSeminarStatus,
} from "@/lib/course-validity";
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
  assertUserCourseAccess,
} from "@/lib/training";
import { getUserAssignedCourses } from "@/lib/course-db";
import { MAIN_CATEGORIES } from "@/lib/course-hierarchy";
import { resolveEmployeeCourse } from "@/lib/course-context";
import { isDbConnectionError, resetSql, withDbRetry } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const courseIdParam = new URL(request.url).searchParams.get("courseId");

    return await withDbRetry(async () => {
      if (!courseIdParam) {
        const courses = await getUserAssignedCourses(user.id, user.companyId);
        const enriched = [];
        for (const c of courses) {
          const cert = await getLatestCertificate(user.id, c.id);
          const attempt = await getActiveAttempt(user.id, c.id);
          const seminarStatus = getEmployeeSeminarStatus(cert);
          enriched.push({
            id: c.id,
            title: c.title,
            fullTitle: c.title,
            code: c.instructionCode,
            instructionTitle: c.instructionTitle,
            mainCategory: c.mainCategory,
            seminar: c.seminar,
            sortOrder: c.sortOrder,
            requiresCertificate: c.requiresCertificate,
            requiresProof: c.requiresProof,
            slug: c.slug,
            estimatedDurationMinutes: c.estimatedDurationMinutes,
            certificate: cert
              ? {
                  id: cert.id,
                  validUntil: cert.validUntil,
                  status: getCertificateStatus(cert),
                }
              : null,
            seminarStatus,
            seminarStatusLabel: formatEmployeeSeminarStatus(
              seminarStatus,
              cert?.validUntil ?? null
            ),
            inProgress: !!attempt,
          });
        }
        return NextResponse.json({
          courses: enriched,
          mainCategories: Object.values(MAIN_CATEGORIES),
        });
      }

      await assertUserCourseAccess(user.id, user.companyId, courseIdParam);
      const { courseId, course } = await resolveEmployeeCourse(user, courseIdParam);

      const attempt =
        (await getActiveAttempt(user.id, courseId)) ??
        (await startAttempt(user.id, user.companyId, courseId));

      const lessonProgress = getEffectiveLessonProgress(course, attempt);
      const totalLessons = totalLessonCount(course);
      const completedLessons = lessonProgress.length;
      const lessonsComplete = allLessonsComplete(course, lessonProgress);
      const next = getNextLesson(course, lessonProgress);
      const cert = await getLatestCertificate(user.id, courseId);

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
          nextLessonUrl: next
            ? `${lessonPath(next.moduleId, next.lessonId)}?courseId=${encodeURIComponent(courseId)}`
            : null,
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
    });
  } catch (e) {
    console.error("[training] GET Fehler:", e);
    if (isDbConnectionError(e)) {
      await resetSql();
      return NextResponse.json(
        {
          error:
            "Die Schulung konnte gerade nicht geladen werden. Bitte Seite neu laden.",
        },
        { status: 503 }
      );
    }
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Dieser Kurs ist Ihnen nicht zugewiesen oder wurde deaktiviert." },
        { status: 403 }
      );
    }
    if (msg === "COURSE_NOT_FOUND" || msg === "NO_COURSE") {
      return NextResponse.json({ error: "Kurs nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Fehler beim Laden der Schulung." },
      { status: 500 }
    );
  }
}

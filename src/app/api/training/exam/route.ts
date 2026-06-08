import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { createCertificate, getLatestCertificate } from "@/lib/certificate";
import { getCourseMeta } from "@/lib/course-db";
import { getCertificateStatus } from "@/lib/status";
import {
  scoreExam,
  buildExamReview,
  getIncorrectReview,
  type AnswerValue,
} from "@/lib/exam";
import { ensureSeeded, getSql } from "@/lib/db";
import { questionsByIds } from "@/lib/exam-select";
import {
  allLessonsComplete,
  getActiveAttempt,
  getEffectiveLessonProgress,
  getExamQuestionIds,
  loadCourseForUser,
  assertUserCourseAccess,
} from "@/lib/training";
import { resolveEmployeeCourse } from "@/lib/course-context";

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    if (!user.companyId) {
      return NextResponse.json({ error: "Kein Mandant." }, { status: 403 });
    }

    const { answers, courseId } = (await request.json()) as {
      answers: Record<string, AnswerValue>;
      courseId: string;
    };

    if (!courseId) {
      return NextResponse.json({ error: "Kurs-ID fehlt." }, { status: 400 });
    }

    await assertUserCourseAccess(user.id, user.companyId, courseId);

    const existingCert = await getLatestCertificate(user.id, courseId);
    if (existingCert && getCertificateStatus(existingCert) !== "red") {
      return NextResponse.json(
        { error: "Sie haben bereits ein gültiges Zertifikat." },
        { status: 400 }
      );
    }

    const { course } = await resolveEmployeeCourse(user, courseId);
    const attempt = await getActiveAttempt(user.id, courseId);
    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const progress = getEffectiveLessonProgress(course, attempt);
    if (!allLessonsComplete(course, progress)) {
      return NextResponse.json(
        { error: "Bitte zuerst alle Module abschließen." },
        { status: 400 }
      );
    }

    const parsedAnswers: Record<number, AnswerValue> = {};
    for (const [key, val] of Object.entries(answers ?? {})) {
      parsedAnswers[Number(key)] = val;
    }

    const examIds = getExamQuestionIds(attempt);
    const perTest = course.examQuestionsPerTest ?? 15;
    if (examIds.length !== perTest) {
      return NextResponse.json(
        { error: "Prüfung ungültig. Bitte Test erneut starten." },
        { status: 400 }
      );
    }

    const examQuestions = questionsByIds(course.exam, examIds);
    const result = scoreExam(examQuestions, parsedAnswers, course.passingScore);
    const incorrectReview = getIncorrectReview(
      buildExamReview(examQuestions, parsedAnswers)
    );

    await ensureSeeded();
    const sql = getSql();
    await sql`
      UPDATE training_attempts
      SET
        completed_at = ${new Date().toISOString()},
        score = ${result.scorePercent},
        passed = ${result.passed},
        answers_json = ${JSON.stringify(parsedAnswers)}::jsonb
      WHERE id = ${attempt.id}
    `;

    let certificate = null;
    if (result.passed) {
      const meta = await getCourseMeta(user.companyId, courseId);
      if (meta?.requiresCertificate !== false) {
        certificate = await createCertificate(
          user.id,
          user.companyId,
          courseId,
          result.scorePercent
        );
      }
    }

    return NextResponse.json({
      ...result,
      minRequired: course.minCorrectAnswers,
      incorrectReview,
      certificate: certificate
        ? {
            id: certificate.id,
            certificateNumber: certificate.certificateNumber,
            validUntil: certificate.validUntil,
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler bei der Prüfung." }, { status: 500 });
  }
}

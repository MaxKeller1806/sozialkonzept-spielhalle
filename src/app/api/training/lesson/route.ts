import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import {
  getActiveAttempt,
  completeLesson,
  loadCourseForUser,
  assertUserCourseAccess,
} from "@/lib/training";

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    if (!user.companyId) {
      return NextResponse.json({ error: "Kein Mandant." }, { status: 403 });
    }

    const { moduleId, lessonId, courseId } = await request.json();

    if (!moduleId || !lessonId || !courseId) {
      return NextResponse.json(
        { error: "Modul-, Lektions- und Kurs-ID erforderlich." },
        { status: 400 }
      );
    }

    await assertUserCourseAccess(user.id, user.companyId, courseId);
    const course = await loadCourseForUser(user.companyId, courseId);
    const attempt = await getActiveAttempt(user.id, courseId);
    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const result = await completeLesson(
      course,
      attempt.id,
      Number(moduleId),
      Number(lessonId)
    );

    return NextResponse.json(result);
  } catch (e) {
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
    return NextResponse.json({ error: msg || "Fehler beim Speichern." }, { status: 500 });
  }
}

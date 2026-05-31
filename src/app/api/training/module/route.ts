import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getActiveAttempt,
  completeModule,
  loadCourseForUser,
  assertUserCourseAccess,
} from "@/lib/training";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user.companyId) {
      return NextResponse.json({ error: "Kein Mandant." }, { status: 403 });
    }

    const { moduleId, courseId } = await request.json();

    if (!moduleId || !courseId) {
      return NextResponse.json({ error: "Modul- und Kurs-ID fehlen." }, { status: 400 });
    }

    await assertUserCourseAccess(user.id, user.companyId, courseId);
    const course = await loadCourseForUser(user.companyId, courseId);
    const attempt = await getActiveAttempt(user.id, courseId);
    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const progress = await completeModule(course, attempt.id, Number(moduleId));
    return NextResponse.json({ moduleProgress: progress });
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

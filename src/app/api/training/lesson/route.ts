import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getActiveAttempt, completeLesson } from "@/lib/training";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { moduleId, lessonId } = await request.json();

    if (!moduleId || !lessonId) {
      return NextResponse.json(
        { error: "Modul- und Lektions-ID erforderlich." },
        { status: 400 }
      );
    }

    const attempt = await getActiveAttempt(user.id);
    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const result = await completeLesson(
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
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getActiveAttempt, completeModule } from "@/lib/training";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json({ error: "Modul-ID fehlt." }, { status: 400 });
    }

    const attempt = await getActiveAttempt(user.id);
    if (!attempt) {
      return NextResponse.json({ error: "Keine aktive Schulung." }, { status: 400 });
    }

    const progress = await completeModule(attempt.id, Number(moduleId));
    return NextResponse.json({ moduleProgress: progress });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

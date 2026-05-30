import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createFeedback } from "@/lib/feedback";
import type { FeedbackCategory } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const user = await requireUser("employee");
    const body = await request.json();
    const { category, message } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine Nachricht ein." },
        { status: 400 }
      );
    }

    const cat: FeedbackCategory =
      category === "anregung" ? "anregung" : "frage";

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: "Bitte mindestens 10 Zeichen eingeben." },
        { status: 400 }
      );
    }

    await createFeedback(user.id, cat, message);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Nur für Mitarbeitende." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Fehler beim Senden." }, { status: 500 });
  }
}

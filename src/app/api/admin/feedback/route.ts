import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listFeedback } from "@/lib/feedback";

export async function GET() {
  try {
    await requireUser("admin");
    return NextResponse.json({ feedback: await listFeedback() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

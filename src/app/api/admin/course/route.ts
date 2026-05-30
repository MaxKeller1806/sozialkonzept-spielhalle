import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCourseData, updateCourseSettings } from "@/lib/course-store";

export async function GET() {
  try {
    await requireUser("admin");
    const course = getCourseData();
    return NextResponse.json({ course });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json();
    const { passingScore } = body;

    if (passingScore === undefined || passingScore === null) {
      return NextResponse.json(
        { error: "Bestehensgrenze fehlt." },
        { status: 400 }
      );
    }

    const score = Number(passingScore);
    if (Number.isNaN(score) || score < 50 || score > 100) {
      return NextResponse.json(
        { error: "Bestehensgrenze muss zwischen 50 und 100 % liegen." },
        { status: 400 }
      );
    }

    const course = updateCourseSettings({ passingScore: score });
    return NextResponse.json({ course });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

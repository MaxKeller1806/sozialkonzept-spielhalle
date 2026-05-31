import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateCourseSettings } from "@/lib/course-db";
import { resolveAdminCourse, courseIdFromRequest } from "@/lib/course-context";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    const { course } = await resolveAdminCourse(user, courseIdFromRequest(request));
    return NextResponse.json({ course });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN" || msg === "NO_COURSE") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const { companyId, courseId } = await resolveAdminCourse(
      user,
      courseIdFromRequest(request)
    );
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

    const course = await updateCourseSettings(companyId, courseId, {
      passingScore: score,
    });
    return NextResponse.json({ course });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

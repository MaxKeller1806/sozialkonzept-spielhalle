import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateModule } from "@/lib/course-validation";
import { nextModuleId, saveModule } from "@/lib/course-store";
import type { CourseModule } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json();
    const module: CourseModule = {
      id: body.id ?? nextModuleId(),
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: [],
    };

    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    saveModule(module);
    return NextResponse.json({ module }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateModule } from "@/lib/course-validation";
import { nextModuleId, saveModule } from "@/lib/master-course-db";
import type { CourseModule } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const body = await request.json();
    const module: CourseModule = {
      id: body.id ?? (await nextModuleId(id)),
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: [],
    };

    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    await saveModule(id, module);
    return NextResponse.json({ module }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

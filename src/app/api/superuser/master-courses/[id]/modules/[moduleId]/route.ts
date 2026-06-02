import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { validateModule } from "@/lib/course-validation";
import { deleteModule, getModule, saveModule } from "@/lib/master-course-db";
import type { CourseModule } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId } = await params;
    const module = await getModule(id, Number(moduleId));
    if (!module) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ module });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId } = await params;
    const body = await request.json();
    const existing = await getModule(id, Number(moduleId));
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const module: CourseModule = {
      id: Number(moduleId),
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: existing.lessons,
    };

    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    await saveModule(id, module);
    return NextResponse.json({ module });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    await requireSuperuser();
    const { id, moduleId } = await params;
    const ok = await deleteModule(id, Number(moduleId));
    if (!ok) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

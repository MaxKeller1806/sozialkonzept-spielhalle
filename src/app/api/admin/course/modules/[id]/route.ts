import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateModule } from "@/lib/course-validation";
import { deleteModule, getModule, saveModule } from "@/lib/course-store";
import type { CourseModule } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("admin");
    const { id } = await params;
    const module = getModule(Number(id));
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("admin");
    const { id } = await params;
    const body = await request.json();
    const existing = getModule(Number(id));
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    const module: CourseModule = {
      id: Number(id),
      title: String(body.title ?? "").trim(),
      duration: Number(body.duration) || 0,
      lessons: existing.lessons,
    };

    const error = validateModule(module);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    saveModule(module);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("admin");
    const { id } = await params;
    const ok = deleteModule(Number(id));
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

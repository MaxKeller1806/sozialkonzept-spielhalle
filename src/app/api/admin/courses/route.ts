import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  listCompanyCourses,
  createCompanyCourse,
} from "@/lib/course-db";
import {
  listCompanyProvisions,
  provisionPermissions,
} from "@/lib/course-provisions";

export async function GET() {
  try {
    const user = await requireAdmin();
    const courses = await listCompanyCourses(user.companyId!);
    const provisions = await listCompanyProvisions(user.companyId!);
    const byCourse = new Map(provisions.map((p) => [p.courseId, p]));
    return NextResponse.json({
      courses: courses.map((c) => ({
        ...c,
        permissions: provisionPermissions(byCourse.get(c.id)),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { title, slug, description, withTemplate } = await request.json();

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Titel und Kurzname erforderlich." },
        { status: 400 }
      );
    }

    const course = await createCompanyCourse(user.companyId!, {
      title: String(title).trim(),
      slug: String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      description: description ? String(description) : undefined,
      withTemplate: withTemplate !== false,
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

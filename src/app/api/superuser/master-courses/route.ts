import { NextResponse } from "next/server";
import { requireSuperuser, getCurrentUser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { assignMasterToAllCompanies } from "@/lib/course-provisions";
import {
  createMasterCourse,
  importExistingCoursesAsMasters,
  listMasterCoursesMetadata,
} from "@/lib/master-course-db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    await requireSuperuser();
    const courses = await listMasterCoursesMetadata();
    return NextResponse.json({ courses });
  } catch (e) {
    console.error("[superuser/master-courses] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg.includes("master_courses") ? "Migration fehlt: npm run db:migrate" : msg || "Fehler." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();

    if (body.action === "importExisting") {
      const imported = await importExistingCoursesAsMasters();
      const courses = await listMasterCoursesMetadata();
      return NextResponse.json({ imported, courses });
    }

    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: "Titel und Kurzname erforderlich." },
        { status: 400 }
      );
    }

    const course = await createMasterCourse({
      title: String(body.title).trim(),
      slug: String(body.slug).trim(),
      description: body.description ? String(body.description) : undefined,
    });

    if (body.assignToAll === true) {
      const superuser = await getCurrentUser();
      await assignMasterToAllCompanies(course.id, superuser?.id ?? null, {
        canEditContent: body.canEditContent === true,
        canEditTests: body.canEditTests === true,
        canAddModules: body.canAddModules === true,
        canDeactivate: body.canDeactivate === true,
      });
    }

    return NextResponse.json({ course }, { status: 201 });
  } catch (e) {
    console.error("[superuser/master-courses] POST:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg.includes("master_courses") ? "Migration fehlt: npm run db:migrate" : msg || "Anlegen fehlgeschlagen." },
      { status: 500 }
    );
  }
}

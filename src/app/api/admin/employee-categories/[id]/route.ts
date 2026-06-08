import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  formatDurationSummary,
  sumEstimatedDurationMinutes,
} from "@/lib/course-duration";
import {
  getEmployeeCategory,
  getEmployeeCategoryCourseIds,
  setEmployeeCategoryCourseAssignments,
  updateEmployeeCategory,
} from "@/lib/employee-categories";
import { listCompanyCourses } from "@/lib/course-db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const categoryId = Number(id);
    const category = await getEmployeeCategory(admin.companyId!, categoryId);
    if (!category) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    const courseIds = await getEmployeeCategoryCourseIds(
      categoryId,
      admin.companyId!
    );
    return NextResponse.json({
      category: {
        ...category,
        durationLabel: formatDurationSummary(category.totalDurationMinutes),
      },
      courseIds,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const categoryId = Number(id);
    const body = await request.json();
    const { name, description, active, courseIds } = body;

    let category = await getEmployeeCategory(admin.companyId!, categoryId);
    if (!category) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    let coursesUpdated = false;
    if (courseIds !== undefined) {
      if (!Array.isArray(courseIds)) {
        return NextResponse.json(
          { error: "courseIds muss ein Array sein." },
          { status: 400 }
        );
      }
      await setEmployeeCategoryCourseAssignments(
        admin.companyId!,
        categoryId,
        courseIds.map(String)
      );
      coursesUpdated = true;
    }

    if (name !== undefined || description !== undefined || active !== undefined) {
      category =
        (await updateEmployeeCategory(admin.companyId!, categoryId, {
          name: name !== undefined ? String(name) : undefined,
          description:
            description !== undefined
              ? description == null
                ? null
                : String(description)
              : undefined,
          active: active !== undefined ? Boolean(active) : undefined,
        })) ?? category;
    }

    if (coursesUpdated) {
      category = (await getEmployeeCategory(admin.companyId!, categoryId)) ?? category;
    }

    const assignedIds = await getEmployeeCategoryCourseIds(
      categoryId,
      admin.companyId!
    );
    const activeCourses = await listCompanyCourses(admin.companyId!, "active");
    const byId = new Map(activeCourses.map((c) => [c.id, c]));
    const totalDurationMinutes = sumEstimatedDurationMinutes(
      assignedIds.map((cid) => byId.get(cid)).filter(Boolean) as {
        estimatedDurationMinutes: number | null;
      }[]
    );

    return NextResponse.json({
      category: category
        ? {
            ...category,
            courseCount: assignedIds.length,
            totalDurationMinutes,
            durationLabel: formatDurationSummary(totalDurationMinutes),
          }
        : null,
      courseIds: assignedIds,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

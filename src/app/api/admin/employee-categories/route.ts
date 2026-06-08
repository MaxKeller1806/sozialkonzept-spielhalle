import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  createEmployeeCategory,
  listEmployeeCategories,
  listEmployeeCategoriesPaginated,
  EMPLOYEE_CATEGORY_SORT_ALLOWLIST,
} from "@/lib/employee-categories";
import { formatDurationSummary } from "@/lib/course-duration";
import { parseListQueryFromUrl } from "@/lib/list-query";

export const dynamic = "force-dynamic";

function parseFilter(value: string | null): "active" | "archived" | "all" {
  if (value === "archived" || value === "all") return value;
  return "active";
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const params = new URL(request.url).searchParams;

    if (
      params.has("filter") &&
      !params.has("page") &&
      !params.has("search") &&
      !params.has("sortBy")
    ) {
      const filter = parseFilter(params.get("filter"));
      const categories = await listEmployeeCategories(admin.companyId!, filter);
      return NextResponse.json({
        categories: categories.map((c) => ({
          ...c,
          durationLabel: formatDurationSummary(c.totalDurationMinutes),
        })),
        filter,
      });
    }

    const query = parseListQueryFromUrl(params, {
      sortBy: "name",
      sortDirection: "asc",
      status: "active",
    });
    const result = await listEmployeeCategoriesPaginated(
      admin.companyId!,
      query
    );
    return NextResponse.json({
      categories: result.categories.map((c) => ({
        ...c,
        durationLabel: formatDurationSummary(c.totalDurationMinutes),
      })),
      meta: result.meta,
      sortFields: Object.keys(EMPLOYEE_CATEGORY_SORT_ALLOWLIST),
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
    const admin = await requireAdmin();
    const { name, description } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    }
    const category = await createEmployeeCategory(admin.companyId!, {
      name: String(name),
      description: description != null ? String(description) : null,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "Kategorie existiert bereits." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

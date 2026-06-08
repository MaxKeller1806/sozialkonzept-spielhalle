import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  listAssignableEmployees,
  listCompanyResponsibilities,
  listCompanyResponsibilitiesPaginated,
  updateCompanyResponsibilities,
  COMPANY_RESPONSIBILITY_SORT_ALLOWLIST,
} from "@/lib/company-responsibilities";
import { parseListQueryFromUrl } from "@/lib/list-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const params = new URL(request.url).searchParams;

    if (
      !params.has("page") &&
      !params.has("search") &&
      !params.has("sortBy") &&
      !params.has("status")
    ) {
      const [assignments, employees] = await Promise.all([
        listCompanyResponsibilities(companyId),
        listAssignableEmployees(companyId),
      ]);
      return NextResponse.json({
        assignments,
        employees,
      });
    }

    const query = parseListQueryFromUrl(params, {
      sortBy: "sortOrder",
      sortDirection: "asc",
      status: "all",
    });
    const [result, employees] = await Promise.all([
      listCompanyResponsibilitiesPaginated(companyId, query),
      listAssignableEmployees(companyId),
    ]);

    return NextResponse.json({
      assignments: result.assignments,
      employees,
      meta: result.meta,
      sortFields: Object.keys(COMPANY_RESPONSIBILITY_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error("[admin/responsibilities] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Migration fehlt: npm run db:migrate", assignments: [] },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const companyId = admin.companyId!;
    const body = await request.json();

    const raw = body.assignments ?? body.items;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "assignments-Array erforderlich." },
        { status: 400 }
      );
    }

    const assignments = raw.map(
      (item: { responsibilityTypeId: unknown; userId: unknown }) => ({
        responsibilityTypeId: Number(item.responsibilityTypeId),
        userId:
          item.userId == null || item.userId === ""
            ? null
            : Number(item.userId),
      })
    );

    await updateCompanyResponsibilities(companyId, assignments);
    return NextResponse.json({
      ok: true,
      message: "Verantwortlichkeiten gespeichert.",
    });
  } catch (e) {
    console.error("[admin/responsibilities] PATCH:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "INVALID_USER") {
      return NextResponse.json(
        { error: "Ungültiger Mitarbeiter für diese Firma." },
        { status: 400 }
      );
    }
    if (msg === "TYPE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Verantwortungstyp nicht gefunden oder inaktiv." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

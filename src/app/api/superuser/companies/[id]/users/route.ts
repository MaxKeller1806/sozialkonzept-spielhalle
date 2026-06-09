import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { isDbConnectionError, isQueryTimeoutError, resetSqlOnFailure, withDbQuery } from "@/lib/db";
import {
  countCompanyUsersStatus,
  listCompanyUsersMinimal,
  type UserListFilter,
} from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseFilter(value: string | null): UserListFilter {
  if (value === "active" || value === "archived") return value;
  return "all";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: "Ungültige Firmen-ID." }, { status: 400 });
    }

    const filter = parseFilter(new URL(request.url).searchParams.get("filter"));

    const users = await withDbQuery(() => listCompanyUsersMinimal(companyId, filter));
    const counts = await withDbQuery(() => countCompanyUsersStatus(companyId));

    return NextResponse.json({
      users,
      adminCount: counts.adminCount,
      employeeCount: counts.employeeCount,
      activeCount: counts.active,
      archivedCount: counts.archived,
      filter,
    });
  } catch (e) {
    console.error("[superuser/company-users] GET:", e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Bitte als Certiano-Superuser anmelden." },
        { status: 401 }
      );
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Bitte als Certiano-Superuser anmelden." },
        { status: 403 }
      );
    }
    if (isQueryTimeoutError(e)) {
      return NextResponse.json(
        { error: "Abfrage hat zu lange gedauert. Bitte erneut versuchen." },
        { status: 504 }
      );
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: msg || "Benutzer konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

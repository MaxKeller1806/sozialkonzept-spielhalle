import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { listCompanyUsersMinimal, type UserListFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parseFilter(value: string | null): UserListFilter {
  if (value === "archived" || value === "all") return value;
  return "active";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperuser();
    const { id } = await params;
    const companyId = Number(id);
    const filter = parseFilter(new URL(request.url).searchParams.get("filter"));

    const users = await listCompanyUsersMinimal(companyId, filter);
    const adminCount = users.filter((u) => u.role === "admin").length;
    const employeeCount = users.filter((u) => u.role === "employee").length;

    const allUsers = filter === "all"
      ? users
      : await listCompanyUsersMinimal(companyId, "all");
    const activeCount = allUsers.filter((u) => u.active).length;
    const archivedCount = allUsers.filter((u) => !u.active).length;

    return NextResponse.json({
      users,
      adminCount,
      employeeCount,
      activeCount,
      archivedCount,
      filter,
    });
  } catch (e) {
    console.error("[superuser/users] GET:", e);
    await resetSql();
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
    return NextResponse.json(
      { error: msg || "Benutzer konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

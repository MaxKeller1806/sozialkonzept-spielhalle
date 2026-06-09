import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  isDbConnectionError,
  isQueryTimeoutError,
  resetSqlOnFailure,
  withDbQuery,
} from "@/lib/db";
import { fetchSuperuserUsersList } from "@/lib/superuser-users-list";
import type { UserListFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function parseFilter(value: string | null): UserListFilter {
  if (value === "active" || value === "archived") return value;
  return "all";
}

function parseRole(value: string | null): "admin" | "employee" | null {
  if (value === "admin" || value === "employee") return value;
  return null;
}

function superuserErrorResponse(e: unknown) {
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
  return null;
}

export async function GET(request: Request) {
  const tag = `[superuser/users] ${Date.now()}`;
  try {
    console.time(`${tag} auth`);
    await requireSuperuser();
    console.timeEnd(`${tag} auth`);

    const url = new URL(request.url);
    const companyIdRaw = url.searchParams.get("companyId");
    const companyId =
      companyIdRaw && companyIdRaw !== "all" ? Number(companyIdRaw) : null;
    const filter = parseFilter(url.searchParams.get("filter"));
    const role = parseRole(url.searchParams.get("role"));
    const search = url.searchParams.get("q");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSizeRaw = parseInt(url.searchParams.get("pageSize") ?? "50", 10);
    const pageSize = Number.isFinite(pageSizeRaw) ? pageSizeRaw : 50;

    console.time(`${tag} query`);
    const data = await withDbQuery(
      () =>
        fetchSuperuserUsersList({
          filter,
          companyId: companyId && Number.isFinite(companyId) ? companyId : null,
          role,
          search,
          page,
          pageSize,
        }),
      8000
    );
    console.timeEnd(`${tag} query`);
    console.info(`${tag} result users=${data.users.length} total=${data.total}`);

    return NextResponse.json({
      users: data.users,
      companies: data.companies,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      limit: data.limit,
      truncated: data.total > data.page * data.pageSize,
      filter,
    });
  } catch (e) {
    console.error("[superuser/users] GET:", e);
    await resetSqlOnFailure(e);
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
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
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { error: msg || "Benutzer konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

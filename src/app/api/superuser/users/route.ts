import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  isDbConnectionError,
  isQueryTimeoutError,
  resetSql,
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

    console.time(`${tag} query`);
    const data = await withDbQuery(() =>
      fetchSuperuserUsersList({
        filter,
        companyId: companyId && Number.isFinite(companyId) ? companyId : null,
        role,
        search,
      })
    );
    console.timeEnd(`${tag} query`);

    console.time(`${tag} response`);
    const body = NextResponse.json({
      users: data.users,
      companies: data.companies,
      total: data.total,
      limit: data.limit,
      truncated: data.total > data.users.length,
      filter,
    });
    console.timeEnd(`${tag} response`);
    return body;
  } catch (e) {
    console.error("[superuser/users] GET:", e);
    await resetSql();
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

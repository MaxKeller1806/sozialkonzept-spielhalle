import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  isDbConnectionError,
  isQueryTimeoutError,
  logDbOperation,
  resetSqlOnFailure,
  withDbQuery,
} from "@/lib/db";
import {
  createIndustry,
  INDUSTRY_SORT_ALLOWLIST,
  listIndustriesPaginated,
  listIndustriesWithBusinessTypesForSelect,
} from "@/lib/industries";
import { parseListQueryFromUrl } from "@/lib/list-query";

export const dynamic = "force-dynamic";

function parseFilter(value: string | null): "active" | "archived" | "all" {
  if (value === "archived" || value === "all") return value;
  return "active";
}

export async function GET(request: Request) {
  const tag = "[superuser/industries]";
  try {
    await requireSuperuser();
    const params = new URL(request.url).searchParams;

    if (
      params.has("filter") &&
      !params.has("page") &&
      !params.has("search") &&
      !params.has("sortBy")
    ) {
      const filter = parseFilter(params.get("filter"));
      const industries = await withDbQuery(
        () =>
          logDbOperation(tag, "listForSelect", () =>
            listIndustriesWithBusinessTypesForSelect(filter)
          ),
        3000
      );
      return NextResponse.json({
        industries,
        filter,
        count: industries.length,
      });
    }

    const query = parseListQueryFromUrl(params, {
      sortBy: "sortOrder",
      sortDirection: "asc",
    });
    const result = await withDbQuery(
      () =>
        logDbOperation(tag, "listPaginated", () => listIndustriesPaginated(query)),
      5000
    );
    return NextResponse.json({
      industries: result.industries,
      meta: result.meta,
      sortFields: Object.keys(INDUSTRY_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error(`${tag} GET:`, e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
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
    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Migration fehlt: npm run db:migrate", industries: [] },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    }
    const industry = await createIndustry({
      name: String(body.name),
      slug: body.slug ? String(body.slug) : undefined,
      description: body.description != null ? String(body.description) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
    });
    return NextResponse.json({ industry }, { status: 201 });
  } catch (e) {
    console.error("[superuser/industries] POST:", e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Kurzname bereits vergeben." }, { status: 409 });
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

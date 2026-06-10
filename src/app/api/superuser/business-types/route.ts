import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import {
  BUSINESS_TYPE_SORT_ALLOWLIST,
  createBusinessType,
  listBusinessTypes,
  listBusinessTypesPaginated,
} from "@/lib/industries";
import { parseListQueryFromUrl } from "@/lib/list-query";

export const dynamic = "force-dynamic";

function parseFilter(value: string | null): "active" | "archived" | "all" {
  if (value === "archived" || value === "all") return value;
  return "active";
}

export async function GET(request: Request) {
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
      const industryIdParam = params.get("industryId");
      const industryId =
        industryIdParam != null && industryIdParam !== ""
          ? Number(industryIdParam)
          : undefined;
      const businessTypes = await listBusinessTypes({
        industryId:
          industryId != null && Number.isFinite(industryId) ? industryId : undefined,
        filter,
      });
      return NextResponse.json({ businessTypes, filter });
    }

    const query = parseListQueryFromUrl(params, {
      sortBy: "sortOrder",
      sortDirection: "asc",
    });
    const result = await listBusinessTypesPaginated(query);
    return NextResponse.json({
      businessTypes: result.businessTypes,
      meta: result.meta,
      sortFields: Object.keys(BUSINESS_TYPE_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error("[superuser/business-types] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperuser();
    const body = await request.json();
    if (!body.name?.trim() || body.industryId == null) {
      return NextResponse.json(
        { error: "Branche und Name erforderlich." },
        { status: 400 }
      );
    }
    const businessType = await createBusinessType({
      industryId: Number(body.industryId),
      name: String(body.name),
      slug: body.slug ? String(body.slug) : undefined,
      description: body.description != null ? String(body.description) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
    });
    return NextResponse.json({ businessType }, { status: 201 });
  } catch (e) {
    console.error("[superuser/business-types] POST:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "INDUSTRY_NOT_FOUND") {
      return NextResponse.json({ error: "Branche nicht gefunden." }, { status: 404 });
    }
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "Kurzname in dieser Branche bereits vergeben." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

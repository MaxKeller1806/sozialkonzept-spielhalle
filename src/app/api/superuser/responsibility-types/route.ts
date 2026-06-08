import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { resetSql } from "@/lib/db";
import { parseListQueryFromUrl } from "@/lib/list-query";
import {
  createResponsibilityType,
  listResponsibilityTypesPaginated,
  RESPONSIBILITY_TYPE_SORT_ALLOWLIST,
} from "@/lib/responsibility-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSuperuser();
    const params = new URL(request.url).searchParams;
    const query = parseListQueryFromUrl(params, {
      sortBy: "sortOrder",
      sortDirection: "asc",
    });
    const result = await listResponsibilityTypesPaginated(query);
    return NextResponse.json({
      responsibilityTypes: result.responsibilityTypes,
      meta: result.meta,
      sortFields: Object.keys(RESPONSIBILITY_TYPE_SORT_ALLOWLIST),
    });
  } catch (e) {
    console.error("[superuser/responsibility-types] GET:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "Migration fehlt: npm run db:migrate", responsibilityTypes: [] },
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
    const responsibilityType = await createResponsibilityType({
      name: String(body.name),
      slug: body.slug ? String(body.slug) : undefined,
      description: body.description != null ? String(body.description) : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
    });
    return NextResponse.json({ responsibilityType }, { status: 201 });
  } catch (e) {
    console.error("[superuser/responsibility-types] POST:", e);
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "Slug bereits vergeben." }, { status: 409 });
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

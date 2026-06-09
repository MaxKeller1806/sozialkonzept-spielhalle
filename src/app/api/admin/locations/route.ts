import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminAccessFromSession, assertCompanyWideAdmin } from "@/lib/admin-access";
import {
  createCompanyLocation,
  listActiveCompanyLocations,
  listCompanyLocationsPaginated,
  parseCompanyLocationListQuery,
  COMPANY_LOCATION_SORT_ALLOWLIST,
} from "@/lib/company-locations";
import { formatCompanyLocationLabel } from "@/lib/company-locations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    const params = new URL(request.url).searchParams;

    if (
      params.get("filter") === "active" &&
      !params.has("page") &&
      !params.has("search")
    ) {
      const locations = await listActiveCompanyLocations(
        admin.companyId,
        access
      );
      return NextResponse.json({
        locations: locations.map((loc) => ({
          id: loc.id,
          name: loc.name,
          city: loc.city,
          label: formatCompanyLocationLabel(loc),
          active: loc.active,
        })),
        adminScope: access.adminScope,
      });
    }

    const query = parseCompanyLocationListQuery(params);
    const result = await listCompanyLocationsPaginated(
      admin.companyId,
      query,
      access
    );
    return NextResponse.json({
      locations: result.locations.map((loc) => ({
        ...loc,
        label: formatCompanyLocationLabel(loc),
      })),
      meta: result.meta,
      sortFields: Object.keys(COMPANY_LOCATION_SORT_ALLOWLIST),
      adminScope: access.adminScope,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    assertCompanyWideAdmin(access);

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    }

    const location = await createCompanyLocation(admin.companyId, {
      name: String(body.name),
      addressLine1: body.addressLine1 ?? null,
      addressLine2: body.addressLine2 ?? null,
      postalCode: body.postalCode ?? null,
      city: body.city ?? null,
      country: body.country ?? "DE",
      sortOrder:
        body.sortOrder != null ? Number(body.sortOrder) : undefined,
    });

    return NextResponse.json(
      {
        location: {
          ...location,
          label: formatCompanyLocationLabel(location),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json({ error: "Anlegen fehlgeschlagen." }, { status: 500 });
  }
}

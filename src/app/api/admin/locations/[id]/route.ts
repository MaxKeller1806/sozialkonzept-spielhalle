import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminAccessFromSession, assertCompanyWideAdmin } from "@/lib/admin-access";
import {
  deactivateCompanyLocationIfAllowed,
  formatCompanyLocationLabel,
  updateCompanyLocation,
} from "@/lib/company-locations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    assertCompanyWideAdmin(access);

    const { id } = await params;
    const locationId = Number(id);
    if (!Number.isFinite(locationId)) {
      return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
    }

    const body = await request.json();
    const location = await updateCompanyLocation(admin.companyId, locationId, {
      name: body.name != null ? String(body.name) : undefined,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      postalCode: body.postalCode,
      city: body.city,
      country: body.country,
      active: body.active != null ? Boolean(body.active) : undefined,
      sortOrder:
        body.sortOrder != null ? Number(body.sortOrder) : undefined,
    });

    return NextResponse.json({
      location: {
        ...location,
        label: formatCompanyLocationLabel(location),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "LOCATION_NOT_FOUND") {
      return NextResponse.json({ error: "Standort nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const access = adminAccessFromSession(admin)!;
    assertCompanyWideAdmin(access);

    const { id } = await params;
    const locationId = Number(id);
    const result = await deactivateCompanyLocationIfAllowed(
      admin.companyId,
      locationId
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Standort kann nicht deaktiviert werden – ${result.employeeCount} aktive Mitarbeiter zugeordnet.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    if (msg === "LOCATION_NOT_FOUND") {
      return NextResponse.json({ error: "Standort nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ error: "Deaktivieren fehlgeschlagen." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant-resolve";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slugParam =
      url.searchParams.get("firma") ??
      url.searchParams.get("slug") ??
      null;
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      url.searchParams.get("host");

    const tenant = await resolveTenant({ host, slug: slugParam });

    if (!tenant) {
      return NextResponse.json({ tenant: null });
    }

    return NextResponse.json({
      tenant: {
        companyId: tenant.companyId,
        slug: tenant.slug,
        companyName: tenant.companyName,
        branding: tenant.branding,
        source: tenant.source,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Mandant konnte nicht ermittelt werden." },
      { status: 500 }
    );
  }
}

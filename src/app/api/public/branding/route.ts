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
      return NextResponse.json({ branding: null });
    }

    return NextResponse.json({
      branding: {
        companyName: tenant.companyName,
        slug: tenant.slug,
        companyId: tenant.companyId,
        ...tenant.branding,
      },
    });
  } catch {
    return NextResponse.json({ branding: null });
  }
}

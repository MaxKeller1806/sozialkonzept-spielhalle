import { NextResponse } from "next/server";
import { getCompanyBySlug } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") ?? "standard";
    const company = await getCompanyBySlug(slug);
    if (!company) {
      return NextResponse.json({ branding: null });
    }
    return NextResponse.json({
      branding: {
        companyName: company.name,
        ...company.branding,
      },
    });
  } catch {
    return NextResponse.json({ branding: null });
  }
}

import { NextResponse } from "next/server";
import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import { fetchOperatorBranding } from "@/lib/operator-branding";

export async function GET() {
  try {
    const data = await fetchOperatorBranding();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json(
      {
        name: APP_NAME,
        operatorName: OPERATOR_NAME,
        branding: DEFAULT_BRANDING,
      },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }
}

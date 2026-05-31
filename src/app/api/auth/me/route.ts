import { NextResponse } from "next/server";
import { getCurrentUser, getAuthState } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const authState = await getAuthState(user);
    return NextResponse.json({ user, authState });
  } catch (err) {
    console.error("[auth/me] Fehler:", err);
    return NextResponse.json(
      { error: "Sitzung konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

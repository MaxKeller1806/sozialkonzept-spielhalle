import { NextResponse } from "next/server";
import { getCurrentUser, getAuthState } from "@/lib/auth";
import {
  isServiceUnavailableDbError,
  postgresErrorFields,
  withDbQuery,
} from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const authState = await withDbQuery(() => getAuthState(user));
    return NextResponse.json({ user, authState });
  } catch (err) {
    if (isServiceUnavailableDbError(err)) {
      console.error(
        "[auth/me] DB vorübergehend nicht verfügbar:",
        postgresErrorFields(err)
      );
      return NextResponse.json(
        {
          error: "SERVICE_TEMPORARILY_UNAVAILABLE",
          message:
            "Die Verbindung zur Datenbank ist vorübergehend nicht verfügbar.",
        },
        { status: 503 }
      );
    }
    console.error("[auth/me] Fehler:", postgresErrorFields(err));
    return NextResponse.json(
      { error: "Sitzung konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

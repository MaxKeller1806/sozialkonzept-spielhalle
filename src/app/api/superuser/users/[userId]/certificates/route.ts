import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import {
  isDbConnectionError,
  isQueryTimeoutError,
  resetSql,
  withDbQuery,
} from "@/lib/db";
import { fetchSuperuserUserTrainings } from "@/lib/superuser-user-trainings";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function superuserErrorResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 401 }
    );
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Bitte als Certiano-Superuser anmelden." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireSuperuser();
    const { userId } = await params;
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) {
      return NextResponse.json({ error: "Ungültige Benutzer-ID." }, { status: 400 });
    }

    const trainings = await withDbQuery(() => fetchSuperuserUserTrainings(uid));
    if (trainings === null) {
      return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({
      trainings,
    });
  } catch (e) {
    console.error("[superuser/users/certificates] GET:", e);
    await resetSql();
    const auth = superuserErrorResponse(e);
    if (auth) return auth;
    if (isQueryTimeoutError(e)) {
      return NextResponse.json(
        { error: "Abfrage hat zu lange gedauert. Bitte erneut versuchen." },
        { status: 504 }
      );
    }
    if (isDbConnectionError(e)) {
      return NextResponse.json(
        { error: "Datenbankverbindung unterbrochen. Bitte erneut versuchen." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Schulungen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

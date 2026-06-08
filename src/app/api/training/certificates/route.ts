import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { listUserCertificates } from "@/lib/certificate";
import { isDbConnectionError, resetSql, withDbRetry } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const user = await requireEmployee();

    const certificates = await withDbRetry(() =>
      listUserCertificates(user.id)
    );

    return NextResponse.json({ certificates });
  } catch (e) {
    console.error("[training/certificates] GET:", e);
    if (isDbConnectionError(e)) {
      await resetSql();
      return NextResponse.json(
        {
          error:
            "Die Nachweise konnten gerade nicht geladen werden. Bitte Seite neu laden.",
        },
        { status: 503 }
      );
    }
    await resetSql();
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Fehler beim Laden der Nachweise." },
      { status: 500 }
    );
  }
}

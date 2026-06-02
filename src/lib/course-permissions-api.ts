import { NextResponse } from "next/server";

export function coursePermissionErrorResponse(e: unknown): NextResponse | null {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "COURSE_READ_ONLY") {
    return NextResponse.json(
      {
        error:
          "Dieser Kurs wird von Certiano bereitgestellt und kann von Ihrer Firma nicht bearbeitet werden.",
      },
      { status: 403 }
    );
  }
  if (msg === "COURSE_LOCKED") {
    return NextResponse.json(
      { error: "Dieser Kurs ist gesperrt." },
      { status: 403 }
    );
  }
  return null;
}

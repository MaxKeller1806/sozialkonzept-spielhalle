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
  if (msg === "COURSE_VALIDITY_LOCKED") {
    return NextResponse.json(
      {
        error:
          "Diese Einstellung wird durch Certiano vorgegeben und kann nur durch den Superuser freigegeben werden.",
      },
      { status: 403 }
    );
  }
  if (msg === "COURSE_PASSING_SCORE_LOCKED") {
    return NextResponse.json(
      {
        error:
          "Diese Einstellung wird durch Certiano vorgegeben und kann nur durch den Superuser freigegeben werden.",
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

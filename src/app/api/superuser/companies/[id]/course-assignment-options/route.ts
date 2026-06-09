import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth";
import { loadCourseAssignmentOptions } from "@/lib/course-assignment-options";
import { resetSqlOnFailure } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = randomUUID();
  const totalStart = performance.now();
  try {
    let step = performance.now();
    await requireSuperuser();
    console.log(
      `[superuser/course-assignment-options] ${requestId} auth ${Math.round(performance.now() - step)}ms`
    );

    const { id } = await params;
    const companyId = Number(id);

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ error: "Ungültige Firmen-ID." }, { status: 400 });
    }

    step = performance.now();
    const options = await loadCourseAssignmentOptions(companyId);
    console.log(
      `[superuser/course-assignment-options] ${requestId} bundle-load ${Math.round(performance.now() - step)}ms`
    );
    console.log(
      `[superuser/course-assignment-options] ${requestId} total ${Math.round(performance.now() - totalStart)}ms`
    );

    return NextResponse.json(options);
  } catch (e) {
    console.error(`[course-assignment-options] ${requestId} GET:`, e);
    await resetSqlOnFailure(e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
    }
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }
    return NextResponse.json(
      { error: msg || "Optionen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser, getUserById } from "@/lib/auth";
import { ensureSeeded, getSql } from "@/lib/db";
import { syncCityFields } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

function profilePayload(user: Awaited<ReturnType<typeof getUserById>>) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthDate: user.birthDate,
    birthPlace: user.birthPlace,
    street: user.street,
    houseNumber: user.houseNumber,
    postalCode: user.postalCode,
    city: user.city ?? user.placeOfResidence,
    location: user.location,
  };
}

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (sessionUser.role === "superuser") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }

    const user = await getUserById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ profile: profilePayload(user) });
  } catch {
    return NextResponse.json({ error: "Profil konnte nicht geladen werden." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    if (sessionUser.role !== "employee") {
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
    }

    const body = await request.json();
    const { birthPlace, street, houseNumber, postalCode, city } = body;

    await ensureSeeded();
    const sql = getSql();
    const { city: syncedCity, placeOfResidence } = syncCityFields(city);

    const patch: Record<string, string | null> = {};
    if (birthPlace !== undefined) patch.birth_place = birthPlace?.trim() || null;
    if (street !== undefined) patch.street = street?.trim() || null;
    if (houseNumber !== undefined) patch.house_number = houseNumber?.trim() || null;
    if (postalCode !== undefined) patch.postal_code = postalCode?.trim() || null;
    if (city !== undefined) {
      patch.city = syncedCity;
      patch.place_of_residence = placeOfResidence;
    }

    const keys = Object.keys(patch);
    if (keys.length === 0) {
      return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
    }

    await sql`
      UPDATE users SET ${sql(patch, ...keys)}
      WHERE id = ${sessionUser.id}
    `;

    const updated = await getUserById(sessionUser.id);
    return NextResponse.json({ profile: profilePayload(updated) });
  } catch {
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
}

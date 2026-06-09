import type postgres from "postgres";
import { getSql } from "./db";
import type { AdminAccess } from "./admin-access";
import { isCompanyWideAdmin } from "./admin-access";
import { assertLocationBelongsToCompany, formatCompanyLocationLabel } from "./company-locations";

export type UserLocationAssignment = {
  locationId: number;
  name: string;
  city: string | null;
  label: string;
  isPrimary: boolean;
};

export function sqlUserAssignedToLocationFilter(
  sql: postgres.Sql,
  locationId: number | null
) {
  if (locationId == null) return sql``;
  return sql`AND EXISTS (
    SELECT 1 FROM user_locations ulf
    WHERE ulf.user_id = u.id AND ulf.location_id = ${locationId}
  )`;
}

export async function getUserLocationAssignments(
  userId: number
): Promise<UserLocationAssignment[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      ul.location_id,
      ul.is_primary,
      cl.name,
      cl.city
    FROM user_locations ul
    JOIN company_locations cl ON cl.id = ul.location_id
    WHERE ul.user_id = ${userId}
    ORDER BY ul.is_primary DESC, cl.sort_order ASC, cl.city ASC NULLS LAST, cl.name ASC
  `) as Record<string, unknown>[];

  return rows.map((row) => {
    const name = String(row.name);
    const city = row.city != null ? String(row.city) : null;
    return {
      locationId: Number(row.location_id),
      name,
      city,
      label: formatCompanyLocationLabel({ name, city }),
      isPrimary: Boolean(row.is_primary),
    };
  });
}

function normalizeLocationIds(
  locationIds: number[] | undefined,
  legacyLocationId: number | null | undefined
): number[] {
  const ids =
    locationIds != null
      ? locationIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      : legacyLocationId != null
        ? [Number(legacyLocationId)]
        : [];
  return [...new Set(ids)];
}

function resolvePrimaryLocationId(
  locationIds: number[],
  primaryLocationId: number | null | undefined
): number | null {
  if (locationIds.length === 0) return null;
  if (locationIds.length === 1) return locationIds[0]!;
  if (
    primaryLocationId != null &&
    locationIds.includes(Number(primaryLocationId))
  ) {
    return Number(primaryLocationId);
  }
  throw new Error("PRIMARY_LOCATION_INVALID");
}

export async function validateUserLocationAssignments(
  companyId: number,
  locationIds: number[],
  admin: AdminAccess
): Promise<void> {
  for (const locationId of locationIds) {
    await assertLocationBelongsToCompany(companyId, locationId);
  }

  if (isCompanyWideAdmin(admin)) return;

  if (admin.adminLocationId == null) {
    throw new Error("FORBIDDEN");
  }

  const invalid = locationIds.some((id) => id !== admin.adminLocationId);
  if (invalid) {
    throw new Error("FORBIDDEN");
  }
}

/** Synchronisiert user_locations und users.location_id (Hauptstandort). */
export async function setUserLocationAssignments(
  userId: number,
  companyId: number,
  input: {
    locationIds?: number[];
    primaryLocationId?: number | null;
    locationId?: number | null;
  },
  admin: AdminAccess
): Promise<UserLocationAssignment[]> {
  const locationIds = normalizeLocationIds(
    input.locationIds,
    input.locationId ?? input.primaryLocationId
  );
  const primaryLocationId = resolvePrimaryLocationId(
    locationIds,
    input.primaryLocationId ?? input.locationId
  );

  await validateUserLocationAssignments(companyId, locationIds, admin);

  const sql = getSql();

  const userRows = await sql`
    SELECT id FROM users
    WHERE id = ${userId} AND company_id = ${companyId} AND role = 'employee'
    LIMIT 1
  `;
  if (userRows.length === 0) throw new Error("NOT_FOUND");

  await sql.begin(async (tx) => {
    await tx`DELETE FROM user_locations WHERE user_id = ${userId}`;

    for (const locationId of locationIds) {
      await tx`
        INSERT INTO user_locations (user_id, location_id, is_primary)
        VALUES (${userId}, ${locationId}, ${locationId === primaryLocationId})
      `;
    }

    await tx`
      UPDATE users
      SET location_id = ${primaryLocationId}
      WHERE id = ${userId}
    `;
  });

  return getUserLocationAssignments(userId);
}

export function splitPrimaryAndOtherLocations(
  assignments: UserLocationAssignment[]
): {
  primary: UserLocationAssignment | null;
  others: UserLocationAssignment[];
} {
  const primary = assignments.find((a) => a.isPrimary) ?? assignments[0] ?? null;
  const others = assignments.filter((a) => primary && a.locationId !== primary.locationId);
  return { primary, others };
}

import type postgres from "postgres";
import { getSql } from "./db";
import type { AdminScope, SessionUser } from "./types";
import { sqlUserAssignedToLocationFilter } from "./user-locations";

export type AdminAccess = {
  id: number;
  companyId: number;
  adminScope: AdminScope;
  adminLocationId: number | null;
};

export function isCompanyWideAdmin(admin: AdminAccess): boolean {
  return admin.adminScope === "company";
}

export function adminAccessFromSession(user: SessionUser): AdminAccess | null {
  if (user.role !== "admin" || user.companyId == null) return null;
  return {
    id: user.id,
    companyId: user.companyId,
    adminScope: user.adminScope ?? "company",
    adminLocationId: user.adminLocationId ?? null,
  };
}

/** Effektiver Standortfilter für Listen/Kennzahlen. */
export function resolveListLocationId(
  admin: AdminAccess,
  requestedLocationId: number | null | undefined
): number | null {
  if (admin.adminScope === "location") {
    return admin.adminLocationId;
  }
  return requestedLocationId ?? null;
}

export function assertCompanyWideAdmin(admin: AdminAccess): void {
  if (!isCompanyWideAdmin(admin)) {
    throw new Error("FORBIDDEN");
  }
}

/** @deprecated Nutze sqlUserAssignedToLocationFilter – filtert über user_locations. */
export function sqlUserLocationFilter(
  sql: postgres.Sql,
  locationId: number | null
) {
  return sqlUserAssignedToLocationFilter(sql, locationId);
}

export async function assertEmployeeInAdminScope(
  admin: AdminAccess,
  employeeUserId: number
): Promise<void> {
  if (isCompanyWideAdmin(admin)) return;

  if (admin.adminLocationId == null) {
    throw new Error("FORBIDDEN");
  }

  const sql = getSql();
  const rows = await sql`
    SELECT 1
    FROM users u
    JOIN user_locations ul ON ul.user_id = u.id
    WHERE u.id = ${employeeUserId}
      AND u.company_id = ${admin.companyId}
      AND u.role = 'employee'
      AND ul.location_id = ${admin.adminLocationId}
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("FORBIDDEN");
}

import { getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  parseListQueryFromUrl,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import type { CompanyLocation } from "./types";
import type { AdminAccess } from "./admin-access";
import { assertCompanyWideAdmin, isCompanyWideAdmin } from "./admin-access";

export const COMPANY_LOCATION_SORT_ALLOWLIST = {
  name: "cl.name",
  city: "cl.city",
  sortOrder: "cl.sort_order",
  active: "cl.active",
  employeeCount: "employee_count",
} as const;

export type CompanyLocationRow = CompanyLocation & {
  employeeCount: number;
  addressLabel: string;
};

function mapLocationRow(row: Record<string, unknown>): CompanyLocationRow {
  const name = String(row.name);
  const city = row.city != null ? String(row.city) : null;
  const addressLine1 =
    row.address_line1 != null ? String(row.address_line1) : null;
  const postalCode = row.postal_code != null ? String(row.postal_code) : null;

  const addressParts = [addressLine1, postalCode, city].filter(Boolean);

  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    name,
    addressLine1,
    addressLine2:
      row.address_line2 != null ? String(row.address_line2) : null,
    postalCode,
    city,
    country: row.country != null ? String(row.country) : "DE",
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    employeeCount: Number(row.employee_count ?? 0),
    addressLabel: addressParts.join(", ") || "—",
  };
}

export function formatCompanyLocationLabel(
  location: Pick<CompanyLocation, "name" | "city">
): string {
  const city = location.city?.trim();
  const name = location.name.trim();
  if (city && name && city.toLowerCase() !== name.toLowerCase()) {
    return `${city} – ${name}`;
  }
  return city || name || "—";
}

export async function assertLocationBelongsToCompany(
  companyId: number,
  locationId: number
): Promise<CompanyLocation> {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM company_locations
    WHERE id = ${locationId} AND company_id = ${companyId}
    LIMIT 1
  `;
  if (rows.length === 0) throw new Error("LOCATION_NOT_FOUND");
  const row = rows[0] as Record<string, unknown>;
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    name: String(row.name),
    addressLine1:
      row.address_line1 != null ? String(row.address_line1) : null,
    addressLine2:
      row.address_line2 != null ? String(row.address_line2) : null,
    postalCode: row.postal_code != null ? String(row.postal_code) : null,
    city: row.city != null ? String(row.city) : null,
    country: row.country != null ? String(row.country) : "DE",
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function validateEmployeeLocationAssignment(
  companyId: number,
  locationId: number | null,
  admin: AdminAccess
): Promise<void> {
  if (locationId == null) {
    if (!isCompanyWideAdmin(admin)) {
      throw new Error("FORBIDDEN");
    }
    return;
  }

  await assertLocationBelongsToCompany(companyId, locationId);

  if (
    !isCompanyWideAdmin(admin) &&
    admin.adminLocationId !== locationId
  ) {
    throw new Error("FORBIDDEN");
  }
}

export async function listActiveCompanyLocations(
  companyId: number,
  admin?: AdminAccess
): Promise<CompanyLocationRow[]> {
  const sql = getSql();
  const scopeFilter =
    admin && !isCompanyWideAdmin(admin) && admin.adminLocationId != null
      ? sql`AND cl.id = ${admin.adminLocationId}`
      : sql``;

  const rows = (await sql`
    SELECT
      cl.*,
      (
        SELECT COUNT(DISTINCT ul.user_id)::int
        FROM user_locations ul
        JOIN users u ON u.id = ul.user_id
        WHERE ul.location_id = cl.id
          AND u.role = 'employee'
          AND u.active = TRUE
      ) AS employee_count
    FROM company_locations cl
    WHERE cl.company_id = ${companyId}
      AND cl.active = TRUE
      ${scopeFilter}
    ORDER BY cl.sort_order ASC, cl.city ASC NULLS LAST, cl.name ASC
  `) as Record<string, unknown>[];

  return rows.map(mapLocationRow);
}

export async function listCompanyLocationsPaginated(
  companyId: number,
  query: ListQueryState,
  admin: AdminAccess
): Promise<{ locations: CompanyLocationRow[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND cl.active = TRUE`
      : query.status === "archived"
        ? sql`AND cl.active = FALSE`
        : sql``;

  const scopeFilter =
    !isCompanyWideAdmin(admin) && admin.adminLocationId != null
      ? sql`AND cl.id = ${admin.adminLocationId}`
      : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(cl.name) LIKE ${searchPattern}
        OR LOWER(COALESCE(cl.city, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(cl.address_line1, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    COMPANY_LOCATION_SORT_ALLOWLIST,
    "cl.sort_order",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction, "last");

  const rows = (await sql`
    SELECT
      cl.*,
      (
        SELECT COUNT(DISTINCT ul.user_id)::int
        FROM user_locations ul
        JOIN users u ON u.id = ul.user_id
        WHERE ul.location_id = cl.id
          AND u.role = 'employee'
          AND u.active = TRUE
      ) AS employee_count,
      COUNT(*) OVER()::int AS total_count
    FROM company_locations cl
    WHERE cl.company_id = ${companyId}
      ${activeFilter}
      ${scopeFilter}
      ${searchFilter}
    ORDER BY ${orderBy}, cl.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `) as Record<string, unknown>[];

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    locations: rows.map(mapLocationRow),
    meta: buildListMeta(query, total),
  };
}

export function parseCompanyLocationListQuery(
  params: URLSearchParams
): ListQueryState {
  return parseListQueryFromUrl(params, {
    sortBy: "sortOrder",
    sortDirection: "asc",
    status: "active",
  });
}

export async function createCompanyLocation(
  companyId: number,
  input: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    sortOrder?: number;
  }
): Promise<CompanyLocationRow> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO company_locations (
      company_id, name, address_line1, address_line2,
      postal_code, city, country, sort_order
    )
    VALUES (
      ${companyId},
      ${input.name.trim()},
      ${input.addressLine1?.trim() || null},
      ${input.addressLine2?.trim() || null},
      ${input.postalCode?.trim() || null},
      ${input.city?.trim() || null},
      ${input.country?.trim() || "DE"},
      ${input.sortOrder ?? 0}
    )
    RETURNING *
  `;
  return mapLocationRow({
    ...(rows[0] as Record<string, unknown>),
    employee_count: 0,
  });
}

export async function updateCompanyLocation(
  companyId: number,
  locationId: number,
  input: {
    name?: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    active?: boolean;
    sortOrder?: number;
  }
): Promise<CompanyLocationRow> {
  const existing = await assertLocationBelongsToCompany(companyId, locationId);
  const sql = getSql();

  const next = {
    name: input.name?.trim() ?? existing.name,
    addressLine1:
      input.addressLine1 !== undefined
        ? input.addressLine1?.trim() || null
        : existing.addressLine1,
    addressLine2:
      input.addressLine2 !== undefined
        ? input.addressLine2?.trim() || null
        : existing.addressLine2,
    postalCode:
      input.postalCode !== undefined
        ? input.postalCode?.trim() || null
        : existing.postalCode,
    city:
      input.city !== undefined ? input.city?.trim() || null : existing.city,
    country: input.country?.trim() ?? existing.country,
    active: input.active ?? existing.active,
    sortOrder: input.sortOrder ?? existing.sortOrder,
  };

  const rows = await sql`
    UPDATE company_locations
    SET
      name = ${next.name},
      address_line1 = ${next.addressLine1},
      address_line2 = ${next.addressLine2},
      postal_code = ${next.postalCode},
      city = ${next.city},
      country = ${next.country},
      active = ${next.active},
      sort_order = ${next.sortOrder},
      updated_at = NOW()
    WHERE id = ${locationId} AND company_id = ${companyId}
    RETURNING *
  `;

  const employeeCountRows = await sql`
    SELECT COUNT(DISTINCT ul.user_id)::int AS c
    FROM user_locations ul
    JOIN users u ON u.id = ul.user_id
    WHERE ul.location_id = ${locationId}
      AND u.role = 'employee'
      AND u.active = TRUE
  `;

  return mapLocationRow({
    ...(rows[0] as Record<string, unknown>),
    employee_count: employeeCountRows[0]?.c ?? 0,
  });
}

export async function deactivateCompanyLocationIfAllowed(
  companyId: number,
  locationId: number
): Promise<{ ok: true; active: false } | { ok: false; employeeCount: number }> {
  await assertLocationBelongsToCompany(companyId, locationId);
  const sql = getSql();

  const countRows = await sql`
    SELECT COUNT(DISTINCT ul.user_id)::int AS c
    FROM user_locations ul
    JOIN users u ON u.id = ul.user_id
    WHERE ul.location_id = ${locationId}
      AND u.role = 'employee'
      AND u.active = TRUE
  `;
  const employeeCount = Number(countRows[0]?.c ?? 0);
  if (employeeCount > 0) {
    return { ok: false, employeeCount };
  }

  await sql`
    UPDATE company_locations
    SET active = FALSE, updated_at = NOW()
    WHERE id = ${locationId} AND company_id = ${companyId}
  `;
  return { ok: true, active: false };
}

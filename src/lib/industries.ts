import { getSql } from "./db";
import {
  buildListMeta,
  buildOrderBySql,
  resolveSortColumn,
  type ListMeta,
  type ListQueryState,
} from "./list-query";
import type { BusinessType, Industry } from "./types";

export const INDUSTRY_SORT_ALLOWLIST = {
  name: "i.name",
  slug: "i.slug",
  sortOrder: "i.sort_order",
  businessTypeCount: "business_type_count",
  companyCount: "company_count",
  createdAt: "i.created_at",
} as const;

export const BUSINESS_TYPE_SORT_ALLOWLIST = {
  name: "bt.name",
  slug: "bt.slug",
  industryName: "i.name",
  sortOrder: "bt.sort_order",
  companyCount: "company_count",
  createdAt: "bt.created_at",
} as const;

export function normalizeIndustrySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapIndustry(row: Record<string, unknown>): Industry {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    businessTypeCount: Number(row.business_type_count ?? 0),
    companyCount: Number(row.company_count ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

function mapBusinessType(row: Record<string, unknown>): BusinessType {
  return {
    id: Number(row.id),
    industryId: Number(row.industry_id),
    industryName: row.industry_name != null ? String(row.industry_name) : null,
    industrySlug: row.industry_slug != null ? String(row.industry_slug) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description != null ? String(row.description) : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    companyCount: Number(row.company_count ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at ?? row.created_at)).toISOString(),
  };
}

export async function listIndustries(
  filter: "active" | "archived" | "all" = "all"
): Promise<Industry[]> {
  const sql = getSql();
  const activeFilter =
    filter === "active"
      ? sql`AND i.active = TRUE`
      : filter === "archived"
        ? sql`AND i.active = FALSE`
        : sql``;

  const rows = await sql`
    SELECT
      i.*,
      COUNT(DISTINCT bt.id)::int AS business_type_count,
      COUNT(DISTINCT c.id)::int AS company_count
    FROM industries i
    LEFT JOIN business_types bt ON bt.industry_id = i.id
    LEFT JOIN companies c ON c.industry_id = i.id
    WHERE TRUE
    ${activeFilter}
    GROUP BY i.id
    ORDER BY i.sort_order, i.name
  `;
  return rows.map((r) => mapIndustry(r as Record<string, unknown>));
}

export async function getIndustryById(id: number): Promise<Industry | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      i.*,
      COUNT(DISTINCT bt.id)::int AS business_type_count,
      COUNT(DISTINCT c.id)::int AS company_count
    FROM industries i
    LEFT JOIN business_types bt ON bt.industry_id = i.id
    LEFT JOIN companies c ON c.industry_id = i.id
    WHERE i.id = ${id}
    GROUP BY i.id
    LIMIT 1
  `;
  return rows[0] ? mapIndustry(rows[0] as Record<string, unknown>) : undefined;
}

export async function createIndustry(input: {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
}): Promise<Industry> {
  const sql = getSql();
  const name = input.name.trim();
  const slug = normalizeIndustrySlug(input.slug?.trim() || name);
  if (!name || !slug) throw new Error("NAME_REQUIRED");

  const rows = await sql`
    INSERT INTO industries (name, slug, description, active, sort_order)
    VALUES (
      ${name}, ${slug}, ${input.description?.trim() || null}, TRUE,
      ${input.sortOrder ?? 0}
    )
    RETURNING *
  `;
  return {
    ...mapIndustry(rows[0] as Record<string, unknown>),
    businessTypeCount: 0,
    companyCount: 0,
  };
}

export async function updateIndustry(
  id: number,
  patch: {
    name?: string;
    slug?: string;
    description?: string | null;
    active?: boolean;
    sortOrder?: number;
  }
): Promise<Industry | undefined> {
  const sql = getSql();
  const updates: Record<string, string | boolean | null | number> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.slug !== undefined) updates.slug = normalizeIndustrySlug(patch.slug);
  if (patch.description !== undefined) {
    updates.description = patch.description?.trim() || null;
  }
  if (patch.active !== undefined) updates.active = Boolean(patch.active);
  if (patch.sortOrder !== undefined) updates.sort_order = Number(patch.sortOrder);

  const keys = Object.keys(updates) as (keyof typeof updates)[];
  if (keys.length === 0) return getIndustryById(id);

  await sql`
    UPDATE industries
    SET ${sql(updates, ...keys)}, updated_at = NOW()
    WHERE id = ${id}
  `;
  return getIndustryById(id);
}

export async function listBusinessTypes(opts?: {
  industryId?: number;
  filter?: "active" | "archived" | "all";
}): Promise<BusinessType[]> {
  const sql = getSql();
  const filter = opts?.filter ?? "all";
  const activeFilter =
    filter === "active"
      ? sql`AND bt.active = TRUE`
      : filter === "archived"
        ? sql`AND bt.active = FALSE`
        : sql``;
  const industryFilter =
    opts?.industryId != null ? sql`AND bt.industry_id = ${opts.industryId}` : sql``;

  const rows = await sql`
    SELECT
      bt.*,
      i.name AS industry_name,
      i.slug AS industry_slug,
      COUNT(DISTINCT c.id)::int AS company_count
    FROM business_types bt
    JOIN industries i ON i.id = bt.industry_id
    LEFT JOIN companies c ON c.business_type_id = bt.id
    WHERE TRUE
    ${industryFilter}
    ${activeFilter}
    GROUP BY bt.id, i.name, i.slug
    ORDER BY bt.sort_order, bt.name
  `;
  return rows.map((r) => mapBusinessType(r as Record<string, unknown>));
}

export async function getBusinessTypeById(
  id: number
): Promise<BusinessType | undefined> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      bt.*,
      i.name AS industry_name,
      i.slug AS industry_slug,
      COUNT(DISTINCT c.id)::int AS company_count
    FROM business_types bt
    JOIN industries i ON i.id = bt.industry_id
    LEFT JOIN companies c ON c.business_type_id = bt.id
    WHERE bt.id = ${id}
    GROUP BY bt.id, i.name, i.slug
    LIMIT 1
  `;
  return rows[0] ? mapBusinessType(rows[0] as Record<string, unknown>) : undefined;
}

export async function createBusinessType(input: {
  industryId: number;
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
}): Promise<BusinessType> {
  const sql = getSql();
  const industry = await getIndustryById(input.industryId);
  if (!industry) throw new Error("INDUSTRY_NOT_FOUND");

  const name = input.name.trim();
  const slug = normalizeIndustrySlug(input.slug?.trim() || name);
  if (!name || !slug) throw new Error("NAME_REQUIRED");

  const rows = await sql`
    INSERT INTO business_types (industry_id, name, slug, description, active, sort_order)
    VALUES (
      ${input.industryId}, ${name}, ${slug}, ${input.description?.trim() || null}, TRUE,
      ${input.sortOrder ?? 0}
    )
    RETURNING *
  `;
  const created = rows[0] as Record<string, unknown>;
  return {
    ...mapBusinessType({
      ...created,
      industry_name: industry.name,
      industry_slug: industry.slug,
      company_count: 0,
    }),
  };
}

export async function updateBusinessType(
  id: number,
  patch: {
    name?: string;
    slug?: string;
    description?: string | null;
    active?: boolean;
    sortOrder?: number;
    industryId?: number;
  }
): Promise<BusinessType | undefined> {
  const existing = await getBusinessTypeById(id);
  if (!existing) return undefined;

  if (patch.industryId != null && patch.industryId !== existing.industryId) {
    const industry = await getIndustryById(patch.industryId);
    if (!industry) throw new Error("INDUSTRY_NOT_FOUND");
    const sql = getSql();
    const linked = await sql`
      SELECT COUNT(*)::int AS n FROM companies WHERE business_type_id = ${id}
    `;
    if (Number(linked[0]?.n ?? 0) > 0) {
      throw new Error("BUSINESS_TYPE_HAS_COMPANIES");
    }
  }

  const sql = getSql();
  const updates: Record<string, string | boolean | null | number> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.slug !== undefined) updates.slug = normalizeIndustrySlug(patch.slug);
  if (patch.description !== undefined) {
    updates.description = patch.description?.trim() || null;
  }
  if (patch.active !== undefined) updates.active = Boolean(patch.active);
  if (patch.sortOrder !== undefined) updates.sort_order = Number(patch.sortOrder);
  if (patch.industryId !== undefined) updates.industry_id = Number(patch.industryId);

  const keys = Object.keys(updates) as (keyof typeof updates)[];
  if (keys.length === 0) return existing;

  await sql`
    UPDATE business_types
    SET ${sql(updates, ...keys)}, updated_at = NOW()
    WHERE id = ${id}
  `;
  return getBusinessTypeById(id);
}

/** Validiert Branche/Betriebstyp für Firmen-Zuordnung. */
export async function validateCompanyIndustryAssignment(
  industryId: unknown,
  businessTypeId: unknown
): Promise<{ industryId: number | null; businessTypeId: number | null }> {
  const normalizedIndustry =
    industryId == null || industryId === "" ? null : Number(industryId);
  const normalizedBusinessType =
    businessTypeId == null || businessTypeId === ""
      ? null
      : Number(businessTypeId);

  if (
    normalizedBusinessType != null &&
    (!Number.isFinite(normalizedBusinessType) || normalizedBusinessType <= 0)
  ) {
    throw new Error("INVALID_BUSINESS_TYPE");
  }
  if (
    normalizedIndustry != null &&
    (!Number.isFinite(normalizedIndustry) || normalizedIndustry <= 0)
  ) {
    throw new Error("INVALID_INDUSTRY");
  }

  if (normalizedBusinessType != null && normalizedIndustry == null) {
    throw new Error("BUSINESS_TYPE_REQUIRES_INDUSTRY");
  }

  if (normalizedIndustry == null) {
    return { industryId: null, businessTypeId: null };
  }

  const industry = await getIndustryById(normalizedIndustry);
  if (!industry || !industry.active) throw new Error("INDUSTRY_NOT_FOUND");

  if (normalizedBusinessType == null) {
    return { industryId: normalizedIndustry, businessTypeId: null };
  }

  const businessType = await getBusinessTypeById(normalizedBusinessType);
  if (!businessType || !businessType.active) {
    throw new Error("BUSINESS_TYPE_NOT_FOUND");
  }
  if (businessType.industryId !== normalizedIndustry) {
    throw new Error("BUSINESS_TYPE_INDUSTRY_MISMATCH");
  }

  return {
    industryId: normalizedIndustry,
    businessTypeId: normalizedBusinessType,
  };
}

/** Für Firmen-PATCH: fehlende Felder aus Ist-Zustand ergänzen und validieren. */
export async function resolveCompanyIndustryFields(
  current: { industryId: number | null; businessTypeId: number | null },
  patch: { industryId?: unknown; businessTypeId?: unknown }
): Promise<{ industryId: number | null; businessTypeId: number | null } | null> {
  if (patch.industryId === undefined && patch.businessTypeId === undefined) {
    return null;
  }

  let industryId =
    patch.industryId !== undefined
      ? patch.industryId == null || patch.industryId === ""
        ? null
        : Number(patch.industryId)
      : current.industryId;
  let businessTypeId =
    patch.businessTypeId !== undefined
      ? patch.businessTypeId == null || patch.businessTypeId === ""
        ? null
        : Number(patch.businessTypeId)
      : current.businessTypeId;

  if (
    patch.industryId !== undefined &&
    patch.businessTypeId === undefined &&
    businessTypeId != null
  ) {
    const bt = await getBusinessTypeById(businessTypeId);
    if (!bt || bt.industryId !== industryId) {
      businessTypeId = null;
    }
  }

  return validateCompanyIndustryAssignment(industryId, businessTypeId);
}

export async function listIndustriesPaginated(
  query: ListQueryState
): Promise<{ industries: Industry[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND i.active = TRUE`
      : query.status === "archived"
        ? sql`AND i.active = FALSE`
        : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(i.name) LIKE ${searchPattern}
        OR LOWER(i.slug) LIKE ${searchPattern}
        OR LOWER(COALESCE(i.description, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    INDUSTRY_SORT_ALLOWLIST,
    "i.sort_order",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction);

  const rows = await sql`
    SELECT
      i.*,
      COUNT(DISTINCT bt.id)::int AS business_type_count,
      COUNT(DISTINCT c.id)::int AS company_count,
      COUNT(*) OVER()::int AS total_count
    FROM industries i
    LEFT JOIN business_types bt ON bt.industry_id = i.id
    LEFT JOIN companies c ON c.industry_id = i.id
    WHERE TRUE
    ${activeFilter}
    ${searchFilter}
    GROUP BY i.id
    ORDER BY ${orderBy}, i.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    industries: rows.map((r) => mapIndustry(r as Record<string, unknown>)),
    meta: buildListMeta(query, total),
  };
}

export async function listBusinessTypesPaginated(
  query: ListQueryState
): Promise<{ businessTypes: BusinessType[]; meta: ListMeta }> {
  const sql = getSql();
  const search = query.search.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;

  const activeFilter =
    query.status === "active"
      ? sql`AND bt.active = TRUE`
      : query.status === "archived"
        ? sql`AND bt.active = FALSE`
        : sql``;

  const industryFilter =
    query.industryId != null
      ? sql`AND bt.industry_id = ${query.industryId}`
      : sql``;

  const searchFilter = searchPattern
    ? sql`AND (
        LOWER(bt.name) LIKE ${searchPattern}
        OR LOWER(bt.slug) LIKE ${searchPattern}
        OR LOWER(i.name) LIKE ${searchPattern}
        OR LOWER(COALESCE(bt.description, '')) LIKE ${searchPattern}
      )`
    : sql``;

  const sort = resolveSortColumn(
    query.sortBy,
    query.sortDirection,
    BUSINESS_TYPE_SORT_ALLOWLIST,
    "bt.sort_order",
    "asc"
  );
  const orderBy = buildOrderBySql(sql, sort.column, sort.direction);

  const rows = await sql`
    SELECT
      bt.*,
      i.name AS industry_name,
      i.slug AS industry_slug,
      COUNT(DISTINCT c.id)::int AS company_count,
      COUNT(*) OVER()::int AS total_count
    FROM business_types bt
    JOIN industries i ON i.id = bt.industry_id
    LEFT JOIN companies c ON c.business_type_id = bt.id
    WHERE TRUE
    ${industryFilter}
    ${activeFilter}
    ${searchFilter}
    GROUP BY bt.id, i.name, i.slug
    ORDER BY ${orderBy}, bt.name ASC
    LIMIT ${query.pageSize}
    OFFSET ${query.offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    businessTypes: rows.map((r) => mapBusinessType(r as Record<string, unknown>)),
    meta: buildListMeta(query, total),
  };
}

export async function listIndustriesWithBusinessTypes(
  filter: "active" | "archived" | "all" = "all"
): Promise<Array<Industry & { businessTypes: BusinessType[] }>> {
  const industries = await listIndustries(filter);
  const businessTypes = await listBusinessTypes({ filter });
  const byIndustry = new Map<number, BusinessType[]>();
  for (const bt of businessTypes) {
    const list = byIndustry.get(bt.industryId) ?? [];
    list.push(bt);
    byIndustry.set(bt.industryId, list);
  }
  return industries.map((industry) => ({
    ...industry,
    businessTypes: byIndustry.get(industry.id) ?? [],
  }));
}

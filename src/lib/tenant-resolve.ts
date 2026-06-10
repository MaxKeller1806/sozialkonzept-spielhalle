import {
  normalizeBranding,
  OPERATOR_COMPANY_SLUG,
} from "./branding-theme";
import {
  getCompanyByCompanyCode,
  getCompanyById,
  getCompanyByLoginDomain,
  getCompanyBySlug,
} from "./tenant";
import type { Company, CompanyBranding } from "./types";

export type TenantResolutionSource = "subdomain" | "domain" | "slug" | "query";

export interface ResolvedTenant {
  companyId: number;
  slug: string;
  companyName: string;
  branding: CompanyBranding;
  source: TenantResolutionSource;
}

export function normalizeCompanySlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeCompanyCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function getTenantBaseDomain(): string {
  const explicit = process.env.APP_TENANT_BASE_DOMAIN?.trim();
  if (explicit) {
    return explicit.split(":")[0].toLowerCase();
  }
  try {
    const u = new URL(process.env.APP_URL ?? "http://localhost:3000");
    return u.hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

export function extractSubdomainSlug(host: string, baseDomain?: string): string | null {
  const base = (baseDomain ?? getTenantBaseDomain()).split(":")[0].toLowerCase();
  const hostname = host.split(":")[0].toLowerCase();

  if (hostname === base || hostname === `www.${base}`) {
    return null;
  }

  const suffix = `.${base}`;
  if (!hostname.endsWith(suffix)) {
    return null;
  }

  const sub = hostname.slice(0, -suffix.length);
  if (!sub || sub.includes(".") || sub === "www") {
    return null;
  }

  return normalizeCompanySlug(sub);
}

export function isTenantCompany(company: Company | undefined): company is Company {
  if (!company) return false;
  if (company.slug === OPERATOR_COMPANY_SLUG) return false;
  if (company.status === "disabled") return false;
  return true;
}

export async function getTenantCompanyBySlug(
  slugRaw: string
): Promise<Company | undefined> {
  const slug = normalizeCompanySlug(slugRaw);
  if (!slug || slug === OPERATOR_COMPANY_SLUG) return undefined;
  const company = await getCompanyBySlug(slug);
  return isTenantCompany(company) ? company : undefined;
}

export async function getTenantCompanyByCode(
  codeRaw: string
): Promise<Company | undefined> {
  const code = normalizeCompanyCode(codeRaw);
  if (!code) return undefined;
  const company = await getCompanyByCompanyCode(code);
  return isTenantCompany(company) ? company : undefined;
}

export function companyToResolvedTenant(
  company: Company,
  source: TenantResolutionSource
): ResolvedTenant {
  return {
    companyId: company.id,
    slug: company.slug,
    companyName: company.name,
    branding: normalizeBranding(company.branding),
    source,
  };
}

export async function resolveTenant(params: {
  host?: string | null;
  companyCode?: string | null;
}): Promise<ResolvedTenant | null> {
  const host = params.host?.split(":")[0].toLowerCase() ?? null;
  const codeParam = params.companyCode?.trim()
    ? normalizeCompanyCode(params.companyCode)
    : null;

  if (host) {
    const byDomain = await getCompanyByLoginDomain(host);
    if (isTenantCompany(byDomain)) {
      return companyToResolvedTenant(byDomain, "domain");
    }

    const subSlug = extractSubdomainSlug(host);
    if (subSlug) {
      const bySub = await getTenantCompanyBySlug(subSlug);
      if (bySub) {
        return companyToResolvedTenant(bySub, "subdomain");
      }
    }
  }

  if (codeParam) {
    const byCode = await getTenantCompanyByCode(codeParam);
    if (byCode) {
      return companyToResolvedTenant(byCode, "query");
    }
  }

  return null;
}

export async function resolveLoginCompanyId(params: {
  companyCode?: string | null;
  companyId?: number | null;
}): Promise<number | null> {
  if (params.companyId != null && Number.isFinite(params.companyId)) {
    const company = await getCompanyById(Number(params.companyId));
    return isTenantCompany(company) ? company.id : null;
  }
  if (params.companyCode?.trim()) {
    const company = await getTenantCompanyByCode(params.companyCode);
    return company?.id ?? null;
  }
  return null;
}

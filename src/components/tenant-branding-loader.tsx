"use client";

import { useEffect, useState } from "react";
import { BrandingProvider } from "@/components/branding-provider";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";

export interface TenantBrandingData {
  companyName: string;
  branding: CompanyBranding;
}

let tenantBrandingCache: TenantBrandingData | null | undefined;
let tenantBrandingFetch: Promise<TenantBrandingData | null> | null = null;

export function invalidateTenantBrandingCache(): void {
  tenantBrandingCache = undefined;
  tenantBrandingFetch = null;
}

function loadTenantBranding(): Promise<TenantBrandingData | null> {
  if (tenantBrandingCache !== undefined) {
    return Promise.resolve(tenantBrandingCache);
  }
  if (!tenantBrandingFetch) {
    tenantBrandingFetch = fetch("/api/auth/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.branding) {
          tenantBrandingCache = null;
          return null;
        }
        const data: TenantBrandingData = {
          companyName: String(d.companyName ?? ""),
          branding: d.branding as CompanyBranding,
        };
        tenantBrandingCache = data;
        return data;
      })
      .catch(() => {
        tenantBrandingCache = null;
        return null;
      })
      .finally(() => {
        tenantBrandingFetch = null;
      });
  }
  return tenantBrandingFetch;
}

export function useTenantBranding(): TenantBrandingData | null {
  const [data, setData] = useState<TenantBrandingData | null>(
    tenantBrandingCache !== undefined ? tenantBrandingCache : null
  );

  useEffect(() => {
    let cancelled = false;
    loadTenantBranding().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

export function TenantBrandingLoader({ children }: { children: React.ReactNode }) {
  const data = useTenantBranding();
  return (
    <BrandingProvider branding={data?.branding ?? DEFAULT_BRANDING}>
      {children}
    </BrandingProvider>
  );
}

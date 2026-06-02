"use client";

import { useEffect } from "react";
import { applyBrandingCssVars } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";

export function BrandingProvider({
  branding,
  children,
}: {
  branding: Partial<CompanyBranding> | null | undefined;
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyBrandingCssVars(branding);
  }, [
    branding?.primaryColor,
    branding?.secondaryColor,
    branding?.backgroundColor,
    branding?.accentColor,
    branding?.logoUrl,
    branding?.loginBackgroundUrl,
  ]);

  return <>{children}</>;
}

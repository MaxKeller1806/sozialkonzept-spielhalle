"use client";

import { useEffect } from "react";
import { applyBrandingCssVars, brandingToCssVars } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";
import type { CSSProperties } from "react";

export function BrandingProvider({
  branding,
  children,
}: {
  branding: Partial<CompanyBranding> | null | undefined;
  children: React.ReactNode;
}) {
  const cssVars = brandingToCssVars(branding) as CSSProperties;

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

  return (
    <div className="contents" style={cssVars}>
      {children}
    </div>
  );
}

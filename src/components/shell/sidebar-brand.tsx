"use client";

import { BrandLogo } from "@/components/brand-logo";

export function SidebarBrand({
  logoUrl,
  companyName,
  productName = "Certiano Campus",
  areaLabel,
  collapsed = false,
}: {
  logoUrl?: string | null;
  companyName: string;
  productName?: string;
  areaLabel: string;
  collapsed?: boolean;
}) {
  return (
    <div
      className={`shrink-0 border-b border-slate-100 ${
        collapsed ? "flex flex-col items-center px-2 py-3" : "px-3 py-3"
      }`}
    >
      {logoUrl ? (
        <div
          className={
            collapsed
              ? "flex h-12 w-full shrink-0 items-center justify-center"
              : "mb-2 w-full shrink-0"
          }
        >
          <BrandLogo
            src={logoUrl}
            variant={collapsed ? "sidebar-collapsed" : "sidebar-expanded"}
          />
        </div>
      ) : (
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl bg-brand-light font-bold text-brand ${
            collapsed ? "h-10 w-10 text-sm" : "mb-3 h-10 w-10 text-sm"
          }`}
          aria-hidden="true"
        >
          {companyName.charAt(0).toUpperCase()}
        </div>
      )}

      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug text-slate-900">
            {companyName}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {productName}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">{areaLabel}</p>
        </div>
      )}
    </div>
  );
}

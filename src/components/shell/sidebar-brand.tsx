"use client";

import { BrandLogo } from "@/components/brand-logo";
import { APP_DESCRIPTION, APP_NAME, APP_SLOGAN } from "@/lib/branding";

export function SidebarBrand({
  logoUrl,
  companyName,
  collapsed = false,
}: {
  logoUrl?: string | null;
  companyName: string;
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
            {APP_NAME}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium leading-snug text-slate-600">
            {APP_SLOGAN}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">{APP_DESCRIPTION}</p>
        </div>
      )}
    </div>
  );
}

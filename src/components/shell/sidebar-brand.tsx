"use client";

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
        collapsed ? "flex flex-col items-center px-2 py-4" : "px-4 py-5"
      }`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={`object-contain ${
            collapsed ? "h-9 w-9" : "mb-3 h-9 w-auto max-w-[140px]"
          }`}
        />
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

"use client";

import Link from "next/link";

export type SidebarNavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon?: React.ReactNode;
};

export function SidebarNav({
  items,
  pathname,
  ariaLabel,
  variant = "light",
  collapsed = false,
}: {
  items: SidebarNavItem[];
  pathname: string;
  ariaLabel: string;
  variant?: "light" | "dark";
  collapsed?: boolean;
}) {
  const isDark = variant === "dark";

  return (
    <nav
      className={`flex flex-col gap-1 py-3 ${collapsed ? "items-center px-2" : "px-3"}`}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = item.match(pathname);
        const activeLight = active && !isDark;
        const activeDark = active && isDark;

        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={
              collapsed
                ? `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    activeLight
                      ? "bg-brand-light text-brand"
                      : activeDark
                        ? "bg-white/15 text-white"
                        : isDark
                          ? "text-white/80 hover:bg-white/10 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeLight
                      ? "bg-brand-light text-brand"
                      : activeDark
                        ? "bg-white/15 text-white"
                        : isDark
                          ? "text-white/80 hover:bg-white/10 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
            }
          >
            {item.icon ? (
              <span
                className={`shrink-0 ${activeLight ? "text-brand" : ""}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            ) : null}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

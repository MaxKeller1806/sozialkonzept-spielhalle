"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SidebarNavChildItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

export type SidebarNavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon?: React.ReactNode;
  children?: SidebarNavChildItem[];
};

function itemLinkClass(
  active: boolean,
  collapsed: boolean,
  isDark: boolean,
  indented = false
): string {
  const activeLight = active && !isDark;
  const activeDark = active && isDark;

  if (collapsed) {
    return `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
      activeLight
        ? "bg-brand-light text-brand"
        : activeDark
          ? "bg-white/15 text-white"
          : isDark
            ? "text-white/80 hover:bg-white/10 hover:text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  }

  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    indented ? "pl-9" : ""
  } ${
    activeLight
      ? "bg-brand-light text-brand"
      : activeDark
        ? "bg-white/15 text-white"
        : isDark
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

function SidebarNavLink({
  item,
  pathname,
  collapsed,
  isDark,
  indented = false,
}: {
  item: { href: string; label: string; match: (pathname: string) => boolean; icon?: React.ReactNode };
  pathname: string;
  collapsed: boolean;
  isDark: boolean;
  indented?: boolean;
}) {
  const active = item.match(pathname);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={itemLinkClass(active, collapsed, isDark, indented)}
    >
      {item.icon ? (
        <span
          className={`shrink-0 ${active && !isDark ? "text-brand" : ""}`}
          aria-hidden="true"
        >
          {item.icon}
        </span>
      ) : null}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarNavGroup({
  item,
  pathname,
  collapsed,
  isDark,
}: {
  item: SidebarNavItem & { children: SidebarNavChildItem[] };
  pathname: string;
  collapsed: boolean;
  isDark: boolean;
}) {
  const groupActive = item.match(pathname);
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  if (collapsed) {
    return (
      <SidebarNavLink
        item={{ ...item, href: item.children[0]?.href ?? item.href }}
        pathname={pathname}
        collapsed={collapsed}
        isDark={isDark}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
          groupActive && !isDark
            ? "text-brand"
            : isDark
              ? "text-white/80 hover:bg-white/10 hover:text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {item.icon ? (
          <span
            className={`shrink-0 ${groupActive && !isDark ? "text-brand" : ""}`}
            aria-hidden="true"
          >
            {item.icon}
          </span>
        ) : null}
        <span className="flex-1 truncate">{item.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="flex flex-col gap-0.5">
          {item.children.map((child) => (
            <SidebarNavLink
              key={child.href + child.label}
              item={child}
              pathname={pathname}
              collapsed={false}
              isDark={isDark}
              indented
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
        if (item.children?.length) {
          return (
            <SidebarNavGroup
              key={item.label}
              item={item as SidebarNavItem & { children: SidebarNavChildItem[] }}
              pathname={pathname}
              collapsed={collapsed}
              isDark={isDark}
            />
          );
        }

        return (
          <SidebarNavLink
            key={item.href + item.label}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            isDark={isDark}
          />
        );
      })}
    </nav>
  );
}

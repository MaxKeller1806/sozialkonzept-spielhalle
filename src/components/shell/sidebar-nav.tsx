"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SidebarNavChildItem = {
  href?: string;
  label: string;
  match: (pathname: string) => boolean;
  children?: SidebarNavChildItem[];
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
  indentLevel = 0
): string {
  const activeLight = active && !isDark;
  const activeDark = active && isDark;
  const indentClass =
    indentLevel === 0 ? "" : indentLevel === 1 ? "pl-9" : indentLevel === 2 ? "pl-12" : "pl-[3.75rem]";

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

  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${indentClass} ${
    activeLight
      ? "bg-brand-light text-brand"
      : activeDark
        ? "bg-white/15 text-white"
        : isDark
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

function childIsActive(item: SidebarNavChildItem, pathname: string): boolean {
  if (item.match(pathname)) return true;
  return item.children?.some((c) => childIsActive(c, pathname)) ?? false;
}

function firstChildHref(item: SidebarNavChildItem): string | undefined {
  if (item.href) return item.href;
  return item.children?.map(firstChildHref).find(Boolean);
}

function navChildrenContextKey(items: SidebarNavChildItem[] | undefined): string {
  if (!items?.length) return "";
  return items
    .map((item) =>
      [
        item.label,
        item.href ?? "",
        item.children?.length ?? 0,
        ...(item.children?.map((c) => c.label) ?? []),
      ].join(":")
    )
    .join("|");
}

function NavChevron({ open, className = "h-4 w-4" }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`shrink-0 transition ${open ? "rotate-180" : ""} ${className}`}
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
  );
}

function groupHeaderClass(active: boolean, isDark: boolean): string {
  return active && !isDark
    ? "text-brand"
    : isDark
      ? "text-white/80 hover:bg-white/10 hover:text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
}

function SidebarNavLink({
  item,
  pathname,
  collapsed,
  isDark,
  indentLevel = 0,
}: {
  item: { href: string; label: string; match: (pathname: string) => boolean; icon?: React.ReactNode };
  pathname: string;
  collapsed: boolean;
  isDark: boolean;
  indentLevel?: number;
}) {
  const active = item.match(pathname);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={itemLinkClass(active, collapsed, isDark, indentLevel)}
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

function SidebarNavChildTree({
  items,
  pathname,
  isDark,
  indentLevel,
  remountKey,
}: {
  items: SidebarNavChildItem[];
  pathname: string;
  isDark: boolean;
  indentLevel: number;
  remountKey: string;
}) {
  return (
    <>
      {items.map((child, index) => (
        <SidebarNavChildNode
          key={`${remountKey}-${child.label}-${index}`}
          item={child}
          pathname={pathname}
          isDark={isDark}
          indentLevel={indentLevel}
          remountKey={`${remountKey}-${child.label}-${index}`}
        />
      ))}
    </>
  );
}

function SidebarNavChildNode({
  item,
  pathname,
  isDark,
  indentLevel,
  remountKey,
}: {
  item: SidebarNavChildItem;
  pathname: string;
  isDark: boolean;
  indentLevel: number;
  remountKey: string;
}) {
  const hasNested = (item.children?.length ?? 0) > 0;
  const linkActive = item.match(pathname);
  const subtreeActive = childIsActive(item, pathname);
  const branchKey = `${remountKey}:${item.label}:${item.href ?? ""}:${item.children?.length ?? 0}`;
  const [open, setOpen] = useState(subtreeActive);

  useEffect(() => {
    setOpen(subtreeActive);
  }, [branchKey, subtreeActive]);

  if (!hasNested && item.href) {
    return (
      <SidebarNavLink
        item={{ href: item.href, label: item.label, match: item.match }}
        pathname={pathname}
        collapsed={false}
        isDark={isDark}
        indentLevel={indentLevel}
      />
    );
  }

  if (!hasNested && !item.href) {
    const active = item.match(pathname);
    return (
      <span
        className={`block truncate rounded-lg px-3 py-2 text-sm ${
          indentLevel === 0 ? "" : indentLevel === 1 ? "pl-9" : "pl-12"
        } ${active ? "font-medium text-brand" : "text-slate-500"}`}
        aria-current={active ? "page" : undefined}
      >
        {item.label}
      </span>
    );
  }

  if (hasNested && item.href) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-stretch gap-0.5">
          <Link
            href={item.href}
            aria-current={linkActive ? "page" : undefined}
            className={`flex min-w-0 flex-1 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${indentLevel === 0 ? "pl-9" : indentLevel === 1 ? "pl-12" : "pl-[3.75rem]"} ${groupHeaderClass(linkActive || subtreeActive, isDark)}`}
          >
            <span className="truncate">{item.label}</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${item.label} ${open ? "einklappen" : "aufklappen"}`}
            className={`shrink-0 rounded-lg px-2 py-2 transition-colors ${groupHeaderClass(subtreeActive, isDark)}`}
          >
            <NavChevron open={open} className="h-3.5 w-3.5" />
          </button>
        </div>
        {open && item.children ? (
          <SidebarNavChildTree
            items={item.children}
            pathname={pathname}
            isDark={isDark}
            indentLevel={indentLevel + 1}
            remountKey={branchKey}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
          indentLevel === 0 ? "pl-9" : indentLevel === 1 ? "pl-12" : "pl-[3.75rem]"
        } ${groupHeaderClass(subtreeActive, isDark)}`}
      >
        <span className="flex-1 truncate">{item.label}</span>
        <NavChevron open={open} className="h-3.5 w-3.5" />
      </button>
      {open && item.children ? (
        <SidebarNavChildTree
          items={item.children}
          pathname={pathname}
          isDark={isDark}
          indentLevel={indentLevel + 1}
          remountKey={branchKey}
        />
      ) : null}
    </div>
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
  const subtreeActive = item.children.some((c) => childIsActive(c, pathname));
  const contextKey = navChildrenContextKey(item.children);
  const autoOpen = groupActive || subtreeActive;
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    setOpen(autoOpen);
  }, [contextKey, autoOpen]);

  if (collapsed) {
    const fallbackHref =
      firstChildHref(item.children[0] ?? {}) ?? item.href;
    return (
      <SidebarNavLink
        item={{ ...item, href: fallbackHref }}
        pathname={pathname}
        collapsed={collapsed}
        isDark={isDark}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-stretch gap-0.5">
        <Link
          href={item.href}
          aria-current={groupActive && !subtreeActive ? "page" : undefined}
          title={item.label}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${groupHeaderClass(groupActive || subtreeActive, isDark)}`}
        >
          {item.icon ? (
            <span
              className={`shrink-0 ${(groupActive || subtreeActive) && !isDark ? "text-brand" : ""}`}
              aria-hidden="true"
            >
              {item.icon}
            </span>
          ) : null}
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${item.label} ${open ? "einklappen" : "aufklappen"}`}
          className={`shrink-0 rounded-lg px-2 py-2.5 transition-colors ${groupHeaderClass(subtreeActive, isDark)}`}
        >
          <NavChevron open={open} />
        </button>
      </div>
      {open ? (
        <SidebarNavChildTree
          key={contextKey}
          items={item.children}
          pathname={pathname}
          isDark={isDark}
          indentLevel={1}
          remountKey={contextKey}
        />
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

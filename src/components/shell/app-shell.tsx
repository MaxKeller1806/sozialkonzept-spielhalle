"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingStatus, PageMain } from "@/components/ui";
import { AppTopbar } from "@/components/shell/app-topbar";
import { SidebarBrand } from "@/components/shell/sidebar-brand";
import { SidebarFooter, type SidebarQuickLink } from "@/components/shell/sidebar-footer";
import { SidebarNav, type SidebarNavItem } from "@/components/shell/sidebar-nav";

export type AppShellBrand = {
  logoUrl?: string | null;
  companyName: string;
  productName?: string;
  areaLabel: string;
};

export type AppShellTopbarOptions = {
  showSearch?: boolean;
  showNotifications?: boolean;
  searchPlaceholder?: string;
};

export type AppShellProps = {
  children: React.ReactNode;
  storageKey: string;
  navItems: SidebarNavItem[];
  brand: AppShellBrand;
  quickLinks: SidebarQuickLink[];
  breadcrumb?: string;
  navAriaLabel: string;
  navVariant?: "light" | "dark";
  contentClassName?: string;
  topbar?: AppShellTopbarOptions;
  ready?: boolean;
  loadingFallback?: React.ReactNode;
};

function SidebarPanel({
  collapsed,
  pathname,
  brand,
  navItems,
  navAriaLabel,
  navVariant,
  quickLinks,
  onToggleCollapse,
}: {
  collapsed: boolean;
  pathname: string;
  brand: AppShellBrand;
  navItems: SidebarNavItem[];
  navAriaLabel: string;
  navVariant?: "light" | "dark";
  quickLinks: SidebarQuickLink[];
  onToggleCollapse: () => void;
}) {
  return (
    <>
      <SidebarBrand
        logoUrl={brand.logoUrl}
        companyName={brand.companyName}
        productName={brand.productName}
        areaLabel={brand.areaLabel}
        collapsed={collapsed}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarNav
          items={navItems}
          pathname={pathname}
          ariaLabel={navAriaLabel}
          variant={navVariant}
          collapsed={collapsed}
        />
      </div>
      <SidebarFooter
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        quickLinks={quickLinks}
      />
    </>
  );
}

export function AppShell({
  children,
  storageKey,
  navItems,
  brand,
  quickLinks,
  breadcrumb,
  navAriaLabel,
  navVariant = "light",
  contentClassName = "app-content mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8",
  topbar,
  ready = true,
  loadingFallback = <LoadingStatus />,
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "1") setCollapsed(true);
  }, [storageKey]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }, [storageKey]);

  const resolvedBreadcrumb =
    breadcrumb ??
    navItems.find((item) => item.match(pathname))?.label ??
    brand.areaLabel;

  if (!ready) {
    return loadingFallback;
  }

  return (
    <div
      className="app-layout-shell flex min-h-screen min-h-dvh w-full bg-[var(--background,#f7f7fc)]"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      <aside className="app-layout-sidebar sticky top-0 hidden h-screen h-dvh shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white lg:flex">
        <SidebarPanel
          collapsed={collapsed}
          pathname={pathname}
          brand={brand}
          navItems={navItems}
          navAriaLabel={navAriaLabel}
          navVariant={navVariant}
          quickLinks={quickLinks}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            aria-label="Navigation schließen"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-xl lg:hidden">
            <SidebarPanel
              collapsed={false}
              pathname={pathname}
              brand={brand}
              navItems={navItems}
              navAriaLabel={navAriaLabel}
              navVariant={navVariant}
              quickLinks={quickLinks}
              onToggleCollapse={toggleCollapse}
            />
          </aside>
        </>
      )}

      <div className="app-layout-main flex min-h-screen min-h-dvh min-w-0 flex-col">
        <AppTopbar
          breadcrumb={resolvedBreadcrumb}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          showSearch={topbar?.showSearch}
          showNotifications={topbar?.showNotifications}
          searchPlaceholder={topbar?.searchPlaceholder}
        />
        <PageMain className={contentClassName}>{children}</PageMain>
      </div>
    </div>
  );
}

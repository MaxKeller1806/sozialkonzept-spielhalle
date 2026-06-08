"use client";

import { useEffect, useState } from "react";
import { ADMIN_SIDEBAR_ITEMS } from "@/components/admin-nav";
import { AppShell } from "@/components/shell/app-shell";
import {
  TenantBrandingLoader,
  useTenantBranding,
} from "@/components/tenant-branding-loader";
import { LoadingStatus } from "@/components/ui";

const ADMIN_ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/passwort-aendern",
  "/datenschutz",
];

const ADMIN_QUICK_LINKS = [
  { href: "/dashboard/konto", label: "Mein Konto" },
  { href: "/dashboard/firma", label: "Meine Firma" },
  { href: "/dashboard/uebersicht", label: "Dashboard" },
];

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const tenant = useTenantBranding();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((auth) => {
        if (!auth.user) {
          window.location.replace("/login");
          return;
        }
        const redirect = auth.authState?.redirect as string | undefined;
        if (
          redirect &&
          !ADMIN_ALLOWED_REDIRECT_PREFIXES.some((p) => redirect.startsWith(p))
        ) {
          window.location.replace(redirect);
          return;
        }
        setReady(true);
      })
      .catch(() => window.location.replace("/login"));
  }, []);

  const companyName = tenant?.companyName || "Administration";

  return (
    <AppShell
      storageKey="admin-sidebar-collapsed"
      navItems={ADMIN_SIDEBAR_ITEMS}
      brand={{
        logoUrl: tenant?.branding.logoUrl,
        companyName,
        productName: "Certiano Campus",
        areaLabel: "Admin-Bereich",
      }}
      quickLinks={ADMIN_QUICK_LINKS}
      navAriaLabel="Administration"
      ready={ready}
      loadingFallback={<LoadingStatus />}
      topbar={{
        showSearch: true,
        showNotifications: true,
        searchPlaceholder: "Suchen…",
      }}
    >
      {children}
    </AppShell>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantBrandingLoader>
      <AdminShellInner>{children}</AdminShellInner>
    </TenantBrandingLoader>
  );
}

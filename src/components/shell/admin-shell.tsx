"use client";

import { useEffect, useState } from "react";
import { ADMIN_SIDEBAR_ITEMS } from "@/components/admin-nav";
import { AppShell } from "@/components/shell/app-shell";
import { useOperatorBrandingLogo } from "@/components/certiano-branding-loader";
import {
  TenantBrandingLoader,
  useTenantBranding,
} from "@/components/tenant-branding-loader";
import { PORTAL_NAME_ADMIN } from "@/lib/branding";
import { LoadingStatus } from "@/components/ui";

const ADMIN_ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/passwort-aendern",
  "/datenschutz",
];

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const tenant = useTenantBranding();
  const operatorLogoUrl = useOperatorBrandingLogo();
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
        logoUrl: operatorLogoUrl,
        companyName,
        portalName: PORTAL_NAME_ADMIN,
      }}
      navAriaLabel="Administration"
      ready={ready}
      loadingFallback={<LoadingStatus />}
      topbar={{
        showNotifications: true,
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

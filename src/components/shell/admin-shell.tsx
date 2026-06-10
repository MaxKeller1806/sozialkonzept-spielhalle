"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_SIDEBAR_ITEMS } from "@/components/admin-nav";
import { AppShell } from "@/components/shell/app-shell";
import { useOperatorBrandingLogo } from "@/components/certiano-branding-loader";
import {
  TenantBrandingLoader,
  useTenantBranding,
} from "@/components/tenant-branding-loader";
import { PORTAL_NAME_ADMIN } from "@/lib/branding";
import { fetchAuthMe } from "@/lib/auth-client";
import { Button, LoadingStatus } from "@/components/ui";

const ADMIN_ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/passwort-aendern",
  "/datenschutz",
];

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const tenant = useTenantBranding();
  const operatorLogoUrl = useOperatorBrandingLogo();
  const [ready, setReady] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const checkAuth = useCallback(() => {
    setServiceError(null);
    fetchAuthMe().then((result) => {
      if (result.status === "unavailable") {
        setServiceError(result.message);
        return;
      }
      if (result.status !== "ok") {
        window.location.replace("/login");
        return;
      }
      const redirect = result.authState?.redirect;
      if (
        redirect &&
        !ADMIN_ALLOWED_REDIRECT_PREFIXES.some((p) => redirect.startsWith(p))
      ) {
        window.location.replace(redirect);
        return;
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const companyName = tenant?.companyName || "Administration";

  if (serviceError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-slate-600">{serviceError}</p>
        <Button type="button" onClick={checkAuth}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

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

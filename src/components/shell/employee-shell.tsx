"use client";

import { useEffect, useState } from "react";
import { EMPLOYEE_SIDEBAR_ITEMS } from "@/components/employee-nav";
import { AppShell } from "@/components/shell/app-shell";
import {
  TenantBrandingLoader,
  useTenantBranding,
} from "@/components/tenant-branding-loader";
import { APP_NAME, PORTAL_NAME_EMPLOYEE } from "@/lib/branding";
import { LoadingStatus } from "@/components/ui";

const EMPLOYEE_ALLOWED_REDIRECT_PREFIXES = [
  "/schulung",
  "/konto",
  "/passwort-aendern",
  "/datenschutz",
];

function EmployeeShellInner({ children }: { children: React.ReactNode }) {
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
          !EMPLOYEE_ALLOWED_REDIRECT_PREFIXES.some((p) =>
            redirect.startsWith(p)
          )
        ) {
          window.location.replace(redirect);
          return;
        }
        setReady(true);
      })
      .catch(() => window.location.replace("/login"));
  }, []);

  return (
    <AppShell
      storageKey="employee-sidebar-collapsed"
      navItems={EMPLOYEE_SIDEBAR_ITEMS}
      brand={{
        logoUrl: tenant?.branding.logoUrl,
        companyName: tenant?.companyName || APP_NAME,
        portalName: PORTAL_NAME_EMPLOYEE,
      }}
      navAriaLabel="Mitarbeiterbereich"
      ready={ready}
      loadingFallback={<LoadingStatus />}
      contentClassName="app-content mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8"
    >
      {children}
    </AppShell>
  );
}

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantBrandingLoader>
      <EmployeeShellInner>{children}</EmployeeShellInner>
    </TenantBrandingLoader>
  );
}

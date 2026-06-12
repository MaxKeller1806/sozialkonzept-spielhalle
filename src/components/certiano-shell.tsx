"use client";

import { Suspense } from "react";
import { getCertianoSidebarItems } from "@/components/certiano-nav";
import { AppShell } from "@/components/shell/app-shell";
import {
  CertianoBrandingLoader,
  useCertianoBranding,
} from "@/components/certiano-branding-loader";
import { LoadingStatus } from "@/components/ui";
import { useSeminarSidebarNav } from "@/hooks/use-seminar-sidebar-nav";
import { APP_NAME, PORTAL_NAME_SUPERUSER } from "@/lib/branding";

function CertianoShellInner({
  children,
  companyId,
  contentClassName,
}: {
  children: React.ReactNode;
  companyId?: number;
  contentClassName?: string;
}) {
  const { branding, name } = useCertianoBranding();
  const navItems = useSeminarSidebarNav({
    baseItems: getCertianoSidebarItems(companyId),
    seminarItemLabel: "Seminarverwaltung",
  });

  return (
    <AppShell
      storageKey="certiano-sidebar-collapsed"
      navItems={navItems}
      brand={{
        logoUrl: branding.logoUrl,
        companyName: name || APP_NAME,
        portalName: PORTAL_NAME_SUPERUSER,
      }}
      navAriaLabel="Certiano"
      contentClassName={
        contentClassName ??
        "app-content mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8"
      }
    >
      {children}
    </AppShell>
  );
}

export function CertianoShell({
  children,
  companyId,
  contentClassName,
}: {
  children: React.ReactNode;
  companyId?: number;
  contentClassName?: string;
}) {
  return (
    <CertianoBrandingLoader>
      <Suspense fallback={<LoadingStatus />}>
        <CertianoShellInner companyId={companyId} contentClassName={contentClassName}>
          {children}
        </CertianoShellInner>
      </Suspense>
    </CertianoBrandingLoader>
  );
}

export { notifyCertianoBrandingUpdated } from "@/components/certiano-branding-loader";

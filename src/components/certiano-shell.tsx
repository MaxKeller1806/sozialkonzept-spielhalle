"use client";

import { getCertianoSidebarItems } from "@/components/certiano-nav";
import { AppShell } from "@/components/shell/app-shell";
import {
  CertianoBrandingLoader,
  useCertianoBranding,
} from "@/components/certiano-branding-loader";
import { APP_NAME } from "@/lib/branding";

const CERTIANO_QUICK_LINKS = [
  { href: "/certiano/konto", label: "Mein Konto" },
  { href: "/certiano/uebersicht", label: "Dashboard" },
  { href: "/certiano", label: "Firmen" },
];

function CertianoShellInner({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId?: number;
}) {
  const { branding, name } = useCertianoBranding();
  const navItems = getCertianoSidebarItems(companyId);

  return (
    <AppShell
      storageKey="certiano-sidebar-collapsed"
      navItems={navItems}
      brand={{
        logoUrl: branding.logoUrl,
        companyName: name || APP_NAME,
        productName: "Certiano Campus",
        areaLabel: "Betreiberbereich",
      }}
      quickLinks={CERTIANO_QUICK_LINKS}
      navAriaLabel="Certiano"
      contentClassName="app-content mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8"
      topbar={{
        showSearch: true,
        searchPlaceholder: "Firma oder Benutzer suchen…",
      }}
    >
      {children}
    </AppShell>
  );
}

export function CertianoShell({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId?: number;
}) {
  return (
    <CertianoBrandingLoader>
      <CertianoShellInner companyId={companyId}>
        {children}
      </CertianoShellInner>
    </CertianoBrandingLoader>
  );
}

export { notifyCertianoBrandingUpdated } from "@/components/certiano-branding-loader";

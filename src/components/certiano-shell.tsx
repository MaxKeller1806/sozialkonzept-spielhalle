"use client";

import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";
import { AccountMenu } from "@/components/account-menu";
import {
  CertianoBrandingLoader,
  useCertianoBranding,
} from "@/components/certiano-branding-loader";
import { CertianoNav } from "@/components/certiano-nav";

function CertianoShellInner({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId?: number;
}) {
  const { branding, name } = useCertianoBranding();

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: branding.backgroundColor }}>
      <header
        className="border-b text-white"
        style={{
          backgroundColor: branding.primaryColor,
          borderColor: branding.secondaryColor,
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="h-10 w-auto max-w-[120px] object-contain"
              />
            ) : null}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide opacity-80"
                style={{ color: branding.backgroundColor }}
              >
                {OPERATOR_NAME}
              </p>
              <h1 className="text-xl font-bold">{name || APP_NAME}</h1>
              <p className="text-sm opacity-80">Betreiberbereich</p>
            </div>
          </div>
          <AccountMenu variant="dark" />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <CertianoNav companyId={companyId} />
        {children}
      </div>
    </div>
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
      <CertianoShellInner companyId={companyId}>{children}</CertianoShellInner>
    </CertianoBrandingLoader>
  );
}

export { notifyCertianoBrandingUpdated } from "@/components/certiano-branding-loader";

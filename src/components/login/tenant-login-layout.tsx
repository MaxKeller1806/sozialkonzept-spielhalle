"use client";

import { BrandLogo } from "@/components/brand-logo";
import {
  IconCertificates,
  IconExport,
  IconSeminars,
} from "@/components/shell/nav-icons";
import {
  APP_LOGIN_DESCRIPTION,
  APP_NAME,
  APP_SLOGAN,
  PORTAL_NAME_ADMIN,
  PORTAL_NAME_EMPLOYEE,
} from "@/lib/branding";
import type { ReactNode } from "react";

const BENEFITS = [
  {
    Icon: IconSeminars,
    iconBg: "bg-blue-100 text-blue-700",
    title: "Schulungen absolvieren",
    description: "Wissen aufbauen und Unterweisungen erfolgreich abschließen.",
  },
  {
    Icon: IconCertificates,
    iconBg: "bg-emerald-100 text-emerald-700",
    title: "Zertifikate verwalten",
    description: "Zertifikate und Nachweise zentral verwalten.",
  },
  {
    Icon: IconExport,
    iconBg: "bg-violet-100 text-violet-700",
    title: "Nachweise dokumentieren",
    description: "Rechtssichere Nachweise erstellen und jederzeit verfügbar haben.",
  },
] as const;

export type TenantPortalKind = "admin" | "employee" | "combined";

export function resolvePortalLabel(portal?: string | null): {
  prefix: string;
  title: string;
} {
  if (portal === "admin") {
    return { prefix: "Sie nutzen das", title: PORTAL_NAME_ADMIN };
  }
  if (portal === "employee") {
    return { prefix: "Sie nutzen das", title: PORTAL_NAME_EMPLOYEE };
  }
  return {
    prefix: "Sie nutzen das",
    title: `${PORTAL_NAME_ADMIN} und ${PORTAL_NAME_EMPLOYEE}`,
  };
}

export function TenantLoginLayout({
  brandingColumn,
  loginColumn,
}: {
  brandingColumn: ReactNode;
  loginColumn: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      {brandingColumn}
      {loginColumn}
    </div>
  );
}

export function TenantLoginBrandingColumn({
  operatorLogoUrl,
}: {
  operatorLogoUrl?: string | null;
}) {
  const campusIndex = APP_NAME.indexOf("Campus");
  const nameBefore =
    campusIndex >= 0 ? APP_NAME.slice(0, campusIndex).trimEnd() : APP_NAME;
  const nameHighlight = campusIndex >= 0 ? "Campus" : "";

  return (
    <section
      className="relative flex flex-col overflow-hidden px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14"
      style={{
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef4ff 45%, #f0fdf9 100%)",
      }}
      aria-label="Certiano Campus"
    >
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-200/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/3 top-1/2 h-56 w-56 rounded-full bg-indigo-100/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="mb-10">
          {operatorLogoUrl ? (
            <BrandLogo
              src={operatorLogoUrl}
              variant="sidebar-expanded"
              className="max-w-[220px] justify-start"
            />
          ) : (
            <p className="text-lg font-bold text-slate-900">{APP_NAME}</p>
          )}
        </header>

        <div className="max-w-lg">
          <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-[2.5rem]">
            {nameHighlight ? (
              <>
                {nameBefore}{" "}
                <span className="bg-gradient-to-r from-blue-700 to-emerald-600 bg-clip-text text-transparent">
                  {nameHighlight}
                </span>
              </>
            ) : (
              APP_NAME
            )}
          </h1>
          <p className="mt-3 text-lg font-medium text-emerald-700 sm:text-xl">
            {APP_SLOGAN}
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {APP_LOGIN_DESCRIPTION}
          </p>
        </div>

        <ul className="mt-10 space-y-5">
          {BENEFITS.map(({ Icon, iconBg, title, description }) => (
            <li key={title} className="flex gap-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                aria-hidden="true"
              >
                <Icon size={22} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TenantLoginFormColumn({
  portal,
  companyLogoUrl,
  companyName,
  children,
}: {
  portal?: string | null;
  companyLogoUrl?: string | null;
  companyName?: string | null;
  children: ReactNode;
}) {
  const { prefix, title } = resolvePortalLabel(portal);
  const year = new Date().getFullYear();
  const showTenantBranding = Boolean(companyLogoUrl || companyName);

  return (
    <section
      className="flex flex-1 flex-col bg-white px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
      aria-label="Anmeldung"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="text-sm text-slate-500">{prefix}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {title}
          </p>
        </div>

        {showTenantBranding && (
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
                Bereitgestellt für
              </span>
              <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>
            <div className="mt-5 flex justify-center">
              {companyLogoUrl ? (
                <BrandLogo src={companyLogoUrl} variant="login" />
              ) : (
                <p className="text-center text-lg font-semibold text-slate-800">
                  {companyName}
                </p>
              )}
            </div>
          </div>
        )}

        {children}
      </div>

      <footer className="mx-auto mt-10 w-full max-w-md text-center text-xs text-slate-400">
        © {year} Certiano Campus. Alle Rechte vorbehalten.
      </footer>
    </section>
  );
}

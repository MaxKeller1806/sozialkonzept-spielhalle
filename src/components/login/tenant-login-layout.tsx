"use client";

import { BrandLogo } from "@/components/brand-logo";
import { LoginBuildingBackdrop } from "@/components/login/login-building-backdrop";
import { LoginCurveDivider } from "@/components/login/login-curve-divider";
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
import { ChevronDown, Globe } from "lucide-react";
import type { ReactNode } from "react";

const LOGIN_GRADIENT =
  "linear-gradient(180deg, #001428 0%, #002855 45%, #003d73 100%)";

const BENEFITS = [
  {
    Icon: IconSeminars,
    title: "Schulungen absolvieren",
    description: "Wissen aufbauen und jederzeit darauf zugreifen.",
  },
  {
    Icon: IconCertificates,
    title: "Zertifikate verwalten",
    description: "Zertifikate einsehen, herunterladen und teilen.",
  },
  {
    Icon: IconExport,
    title: "Nachweise dokumentieren",
    description: "Rechtssicher dokumentieren und verwalten.",
  },
] as const;

export type TenantPortalKind = "admin" | "employee" | "combined";

export function resolvePortalLabel(portal?: string | null): string {
  if (portal === "admin") return PORTAL_NAME_ADMIN;
  if (portal === "employee") return PORTAL_NAME_EMPLOYEE;
  return PORTAL_NAME_ADMIN;
}

export function TenantLoginLayout({
  brandingColumn,
  loginColumn,
}: {
  brandingColumn: ReactNode;
  loginColumn: ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col lg:flex-row">
      {brandingColumn}
      {loginColumn}
    </div>
  );
}

export function TenantLoginBrandingColumn({
  operatorLogoUrl,
  portal,
  companyLogoUrl,
  companyName,
}: {
  operatorLogoUrl?: string | null;
  portal?: string | null;
  companyLogoUrl?: string | null;
  companyName?: string | null;
}) {
  const portalLabel = resolvePortalLabel(portal);
  const showCompanyCard = Boolean(companyLogoUrl || companyName);
  const campusIndex = APP_NAME.indexOf("Campus");
  const nameBefore =
    campusIndex >= 0 ? APP_NAME.slice(0, campusIndex).trimEnd() : APP_NAME;
  const nameHighlight = campusIndex >= 0 ? "Campus" : "";

  return (
    <section
      className="relative flex min-h-[440px] flex-col overflow-hidden lg:min-h-screen lg:w-[58%] lg:max-w-[58%] lg:shrink-0"
      style={{ background: LOGIN_GRADIENT }}
      aria-label="Certiano Campus"
    >
      <LoginBuildingBackdrop className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[62%] sm:h-[68%]" />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#001428]/92 via-[#002855]/78 to-[#003d73]/62"
        aria-hidden="true"
      />
      <LoginCurveDivider />

      <div className="relative z-10 flex flex-1 flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
        <header className="mb-10 flex items-start justify-between gap-6 lg:mb-14">
          <div className="min-w-0">
            {operatorLogoUrl ? (
              <BrandLogo
                src={operatorLogoUrl}
                variant="sidebar-expanded"
                className="max-w-[220px] justify-start brightness-110"
              />
            ) : (
              <p className="text-lg font-bold tracking-tight text-white">{APP_NAME}</p>
            )}
          </div>

          {showCompanyCard && (
            <div className="hidden shrink-0 text-right sm:block">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/75">
                {portalLabel}
              </p>
              <div className="flex min-h-[88px] min-w-[132px] items-center justify-center rounded-xl bg-white px-4 py-3 shadow-lg shadow-black/10">
                {companyLogoUrl ? (
                  <BrandLogo
                    src={companyLogoUrl}
                    alt={companyName ?? ""}
                    variant="login"
                    className="max-h-14 max-w-[120px]"
                  />
                ) : (
                  <p className="text-center text-sm font-bold leading-snug text-slate-800">
                    {companyName}
                  </p>
                )}
              </div>
            </div>
          )}
        </header>

        <div className="max-w-xl">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.65rem]">
            {nameHighlight ? (
              <>
                {nameBefore}{" "}
                <span className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent">
                  {nameHighlight}
                </span>
              </>
            ) : (
              APP_NAME
            )}
          </h1>
          <p className="mt-3 text-lg font-semibold text-sky-300 sm:text-xl">{APP_SLOGAN}</p>
          <p className="mt-4 max-w-md text-base leading-relaxed text-blue-100/80">
            {APP_LOGIN_DESCRIPTION}
          </p>
        </div>

        <ul className="mt-auto space-y-0 pt-10 lg:pt-14">
          {BENEFITS.map(({ Icon, title, description }, index) => (
            <li
              key={title}
              className={`flex gap-4 py-5 ${index > 0 ? "border-t border-white/10" : ""}`}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-200 ring-1 ring-white/15"
                aria-hidden="true"
              >
                <Icon size={22} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-blue-100/70">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LoginLanguageSelector() {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <Globe size={16} className="text-slate-400" aria-hidden="true" />
      <span>Deutsch</span>
      <ChevronDown size={16} className="text-slate-400" aria-hidden="true" />
    </div>
  );
}

export function TenantLoginFormColumn({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <section
      className="relative flex flex-1 flex-col bg-white px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-12 xl:px-16"
      aria-label="Anmeldung"
    >
      <div className="flex justify-end">
        <LoginLanguageSelector />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        {children}
      </div>

      <footer className="mx-auto mt-8 w-full max-w-md text-center text-xs text-slate-400 lg:mt-10">
        © {year} Certiano Campus – Alle Rechte vorbehalten.
      </footer>
    </section>
  );
}

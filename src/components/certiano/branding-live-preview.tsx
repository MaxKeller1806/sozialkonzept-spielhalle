"use client";

import { BrandLogo } from "@/components/brand-logo";
import { PORTAL_NAME_SUPERUSER } from "@/lib/branding";
import type { CSSProperties } from "react";
import { brandingToCssVars } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";

export type BrandingPreviewMode = "desktop" | "tablet" | "mobile";

type BrandingLivePreviewProps = {
  name: string;
  branding: CompanyBranding;
  mode: BrandingPreviewMode;
  areaLabel?: string;
  portalName?: string;
  previewDescription?: string;
};

const PREVIEW_NAV = [
  { label: "Dashboard", active: true },
  { label: "Firmen", active: false },
  { label: "Benutzer", active: false },
];

function PreviewFrame({
  mode,
  children,
}: {
  mode: BrandingPreviewMode;
  children: React.ReactNode;
}) {
  const widthClass =
    mode === "desktop"
      ? "w-full"
      : mode === "tablet"
        ? "mx-auto w-full max-w-[720px]"
        : "mx-auto w-full max-w-[360px]";

  return (
    <div className={`${widthClass} transition-all duration-300`}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
}

export function BrandingLivePreview({
  name,
  branding,
  mode,
  areaLabel = "Certiano",
  portalName = PORTAL_NAME_SUPERUSER,
  previewDescription = "So wirkt Ihr Branding in der Plattform.",
}: BrandingLivePreviewProps) {
  const cssVars = brandingToCssVars(branding) as CSSProperties;
  const sidebarCollapsed = mode === "mobile";

  return (
    <PreviewFrame mode={mode}>
      <div
        className="flex min-h-[420px] bg-[var(--background,#f8fafc)] text-[var(--brand-text,#0f172a)]"
        style={cssVars}
      >
        <aside
          className={`flex shrink-0 flex-col border-r border-slate-200 bg-white ${
            sidebarCollapsed ? "w-14" : "w-56"
          }`}
        >
          <div
            className={`border-b border-slate-100 ${
              sidebarCollapsed ? "flex justify-center px-2 py-3" : "px-3 py-4"
            }`}
          >
            {branding.logoUrl ? (
              <BrandLogo
                src={branding.logoUrl}
                variant={sidebarCollapsed ? "preview-collapsed" : "preview-sidebar"}
              />
            ) : (
              <div
                className={`rounded-lg font-bold text-[var(--brand-primary,#000080)] ${
                  sidebarCollapsed ? "text-center text-xs" : "text-sm"
                }`}
              >
                {sidebarCollapsed ? "C" : name || "Certiano"}
              </div>
            )}
            {!sidebarCollapsed ? (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--brand-text-secondary,#64748b)]">
                {areaLabel}
              </p>
            ) : null}
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-2">
            {PREVIEW_NAV.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg px-2 py-2 text-xs font-medium ${
                  item.active
                    ? "bg-[color-mix(in_srgb,var(--brand-accent,#2563eb)_12%,white)] text-[var(--brand-accent,#2563eb)]"
                    : "text-[var(--brand-menu-text,#475569)]"
                } ${sidebarCollapsed ? "text-center" : ""}`}
              >
                {sidebarCollapsed ? item.label.slice(0, 1) : item.label}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-[var(--brand-text,#0f172a)]">{portalName}</p>
            <div className="h-8 w-24 rounded-lg bg-[color-mix(in_srgb,var(--brand-text-secondary,#64748b)_15%,white)]" aria-hidden />
          </header>

          <div className="space-y-3 p-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--brand-text,#0f172a)]">Dashboard</h3>
              <p className="mt-0.5 text-xs text-[var(--brand-text-secondary,#64748b)]">
                {previewDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-secondary,#64748b)]">
                  Firmen
                </p>
                <p className="mt-1 text-lg font-bold text-[var(--brand-text,#0f172a)]">128</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--brand-text-secondary,#64748b)]">
                  Benutzer
                </p>
                <p className="mt-1 text-lg font-bold text-[var(--brand-text,#0f172a)]">2.430</p>
              </div>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{
                backgroundColor: "color-mix(in srgb, var(--brand-secondary,#4040a0) 8%, var(--background,#fff))",
                borderColor: "color-mix(in srgb, var(--brand-secondary,#4040a0) 20%, var(--background,#fff))",
              }}
            >
              <p className="text-sm font-semibold text-[var(--brand-text,#0f172a)]">
                {name || "Certiano Campus"}
              </p>
              <p className="mt-1 text-xs text-[var(--brand-text-secondary,#64748b)]">
                {previewDescription}
              </p>
              <button
                type="button"
                className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm"
                style={{
                  backgroundColor: "var(--brand-accent,#2563eb)",
                  color: "var(--brand-button-text,#ffffff)",
                }}
              >
                Beispiel-Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

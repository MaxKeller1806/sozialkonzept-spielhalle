"use client";

import Link from "next/link";
import { useId } from "react";
import { AccountMenu } from "@/components/account-menu";
import {
  TenantBrandingLoader,
  useTenantBranding,
} from "@/components/tenant-branding-loader";
import type { TrainingStatus } from "@/lib/types";

const buttonBase =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] w-full sm:w-auto";

const buttonVariants = {
  primary: "bg-brand text-white hover:opacity-90",
  secondary: "bg-white border-2 border-brand text-brand hover:bg-brand-light",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <Link
      href={href}
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label = "Fortschritt",
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barId = useId();

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm text-slate-600">
        <span id={`${barId}-label`}>{label}</span>
        <span aria-hidden="true">{pct}%</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-labelledby={`${barId}-label`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${value} von ${max} abgeschlossen, ${pct} Prozent`}
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<TrainingStatus, string> = {
  green: "Gültig",
  yellow: "Läuft bald ab",
  red: "Abgelaufen",
};

export function StatusDot({ status }: { status: TrainingStatus }) {
  const colors = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
  };
  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${colors[status]}`}
      role="img"
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    />
  );
}

export const EMPLOYEE_SUBTITLE = "Interne Schulung nach Einstellung";
export const EMPLOYEE_TITLE =
  "Schulung und Unterweisung in das betriebliche Sozialkonzept";

export function EmployeeHeader({ pageTitle }: { pageTitle?: string }) {
  const tenant = useTenantBranding();

  return (
    <TenantBrandingLoader>
      <header
        className="border-b border-brand-light bg-white"
        style={{ backgroundColor: tenant?.branding.backgroundColor }}
      >
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 px-4 py-5">
          <div className="min-w-0 flex-1">
            {tenant?.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.branding.logoUrl}
                alt=""
                className="mb-2 h-8 w-auto max-w-[140px] object-contain"
              />
            ) : null}
            <p className="text-brand-muted text-xs font-medium uppercase tracking-wide">
              {EMPLOYEE_SUBTITLE}
            </p>
            <h1 className="text-brand mt-1 text-base font-bold leading-snug sm:text-lg">
              {tenant?.companyName || EMPLOYEE_TITLE}
            </h1>
            {pageTitle && (
              <h2 className="text-brand mt-2 text-sm font-medium">{pageTitle}</h2>
            )}
          </div>
          <AccountMenu className="shrink-0" />
        </div>
      </header>
    </TenantBrandingLoader>
  );
}

export function AppHeader({
  title,
  userName,
  links,
}: {
  title: string;
  userName?: string;
  links?: { href: string; label: string }[];
}) {
  const tenant = useTenantBranding();

  return (
    <TenantBrandingLoader>
      <header
        className="border-b border-slate-200 bg-white"
        style={{ backgroundColor: tenant?.branding.backgroundColor }}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            {tenant?.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.branding.logoUrl}
                alt=""
                className="mb-2 h-8 w-auto max-w-[140px] object-contain"
              />
            ) : null}
            <p className="text-brand text-xs font-medium uppercase tracking-wide">
              {tenant?.companyName || "Administration"}
            </p>
            <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {userName && <span className="text-slate-600">{userName}</span>}
            {links?.map((l) => (
              <Link key={l.href} href={l.href} className="link-brand text-sm">
                {l.label}
              </Link>
            ))}
            <AccountMenu />
          </div>
        </div>
      </header>
    </TenantBrandingLoader>
  );
}

export function PageMain({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <main id="main-content" className={className} style={style} tabIndex={-1}>
      {children}
    </main>
  );
}

export function LoadingStatus({ message = "Wird geladen…" }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center text-slate-600"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export function Input({
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={inputId}
        className="focus-brand w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
        {...props}
      />
    </label>
  );
}

export function Textarea({
  label,
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        id={inputId}
        className="focus-brand w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
        rows={6}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        id={inputId}
        className="focus-brand w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function LiveMessage({
  message,
  type = "polite",
}: {
  message: string;
  type?: "polite" | "assertive";
}) {
  if (!message) return null;
  return (
    <div role="status" aria-live={type} className="live-region">
      {message}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
      role="alert"
      aria-live="assertive"
    >
      {message}
    </p>
  );
}

"use client";

import { useId, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
} from "lucide-react";
import {
  TenantLoginBrandingColumn,
  TenantLoginFormColumn,
  TenantLoginLayout,
} from "@/components/login/tenant-login-layout";
import { BrandingProvider } from "@/components/branding-provider";
import { ErrorMessage } from "@/components/ui";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";
import type { ResolvedTenant } from "@/lib/tenant-resolve";

interface LoginFormProps {
  initialTenant: ResolvedTenant | null;
  initialCompanyCode: string;
  operatorLogoUrl?: string | null;
  portal?: string | null;
}

function LoginField({
  label,
  icon: Icon,
  id,
  trailing,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: typeof Building2;
  trailing?: React.ReactNode;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
        <input
          id={inputId}
          className="focus-brand w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400"
          {...props}
        />
        {trailing ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        ) : null}
      </div>
    </div>
  );
}

export function LoginForm({
  initialTenant,
  initialCompanyCode,
  operatorLogoUrl,
  portal,
}: LoginFormProps) {
  const [tenant] = useState(initialTenant);
  const [companyCode, setCompanyCode] = useState(initialCompanyCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isBranded = tenant != null;
    const codeToSend = isBranded ? null : companyCode.trim();

    if (!isBranded && !codeToSend) {
      setError("Bitte Firmenkennung eingeben.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          portal: "tenant",
          companyCode: codeToSend,
          companyId: tenant?.companyId ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen.");
        setLoading(false);
        return;
      }

      const target = data.redirect as string | undefined;
      if (!target) {
        setError("Kein Weiterleitungsziel erhalten.");
        setLoading(false);
        return;
      }

      window.location.replace(target);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  const branding: CompanyBranding = tenant?.branding ?? DEFAULT_BRANDING;
  const isBranded = tenant != null;

  return (
    <BrandingProvider branding={branding}>
      <main id="main-content" data-readable-content="" className="min-h-screen" tabIndex={-1}>
        <TenantLoginLayout
          brandingColumn={
            <TenantLoginBrandingColumn
              operatorLogoUrl={operatorLogoUrl}
              portal={portal}
              companyLogoUrl={isBranded ? tenant.branding.logoUrl : null}
              companyName={isBranded ? tenant.companyName : null}
            />
          }
          loginColumn={
            <TenantLoginFormColumn>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
                  Willkommen
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Bitte melden Sie sich an, um fortzufahren.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {!isBranded && (
                  <LoginField
                    label="Firmenkennung"
                    icon={Building2}
                    placeholder="z. B. F0001"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    autoComplete="organization"
                    required
                  />
                )}
                <LoginField
                  label="E-Mail"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  placeholder="ihre@email.de"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <LoginField
                  label="Passwort"
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ihr Passwort"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-lg p-2 text-slate-400 transition hover:text-slate-600"
                      aria-label={
                        showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />

                <p className="text-right">
                  <a
                    href="#"
                    className="text-sm font-medium text-[#2563eb] transition hover:text-[#1d4ed8] hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Passwort vergessen?
                  </a>
                </p>

                <ErrorMessage message={error} />
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="bg-brand mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!loading && <LogIn size={18} aria-hidden="true" />}
                  {loading ? "Wird angemeldet…" : "Anmelden"}
                </button>
              </form>
            </TenantLoginFormColumn>
          }
        />
      </main>
    </BrandingProvider>
  );
}

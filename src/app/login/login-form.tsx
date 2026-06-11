"use client";

import { useEffect, useId, useState } from "react";
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
import { LOGIN_COLORS } from "@/components/login/login-curve-divider";
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

function ForgotPasswordDialog({
  open,
  onClose,
  isBranded,
  brandedCompanyCode,
  initialCompanyCode,
  initialEmail,
}: {
  open: boolean;
  onClose: () => void;
  isBranded: boolean;
  brandedCompanyCode: string;
  initialCompanyCode: string;
  initialEmail: string;
}) {
  const successMessage =
    "Ihre Anfrage wurde an den Administrator übermittelt.";

  const [companyCode, setCompanyCode] = useState(initialCompanyCode);
  const [email, setEmail] = useState(initialEmail);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyCode(initialCompanyCode);
    setEmail(initialEmail);
    setAcknowledged(false);
    setError("");
    setSuccess(false);
    setLoading(false);
  }, [open, initialCompanyCode, initialEmail]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(timer);
  }, [success, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isBranded && !companyCode.trim()) {
      setError("Bitte Firmenkennung eingeben.");
      return;
    }
    if (!email.trim()) {
      setError("Bitte E-Mail eingeben.");
      return;
    }
    if (!acknowledged) {
      setError("Bitte bestätigen Sie die Hinweise.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode: isBranded ? brandedCompanyCode : companyCode.trim(),
          email: email.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Anfrage konnte nicht gesendet werden.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Dialog schließen"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        className="relative flex max-h-full w-full max-w-md flex-col bg-white shadow-2xl max-sm:h-full max-sm:rounded-none sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 id="forgot-password-title" className="text-lg font-bold text-slate-900">
            Passwort vergessen?
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Schließen
          </button>
        </header>

        {success ? (
          <div className="flex flex-1 flex-col px-5 py-4">
            <p
              className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800"
              role="status"
            >
              {successMessage}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-[#002855] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004985]"
              >
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
            <p className="mb-4 text-sm text-slate-600">
              Ihr Administrator kann Ihnen ein neues Erstpasswort vergeben. Bitte
              füllen Sie die Felder aus – wir leiten die Anfrage an Ihre Firma
              weiter.
            </p>

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

            <div className={isBranded ? "" : "mt-4"}>
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
            </div>

            <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                Ich verstehe, dass mein Administrator ein neues Erstpasswort für
                mich erzeugt und mir mitteilt.
              </span>
            </label>

            <ErrorMessage message={error} />

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-[#002855] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004985] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Wird gesendet…" : "Anfrage senden"}
              </button>
            </div>
          </form>
        )}
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
  const [forgotOpen, setForgotOpen] = useState(false);

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
                  <button
                    type="button"
                    className="text-sm font-medium transition hover:underline"
                    style={{ color: LOGIN_COLORS.navyMid }}
                    onClick={() => setForgotOpen(true)}
                  >
                    Passwort vergessen?
                  </button>
                </p>

                <ErrorMessage message={error} />
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#002855] px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#004985] active:bg-[#001428] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!loading && <LogIn size={18} aria-hidden="true" />}
                  {loading ? "Wird angemeldet…" : "Anmelden"}
                </button>
              </form>
            </TenantLoginFormColumn>
          }
        />

        <ForgotPasswordDialog
          open={forgotOpen}
          onClose={() => setForgotOpen(false)}
          isBranded={isBranded}
          brandedCompanyCode={tenant?.companyCode ?? ""}
          initialCompanyCode={companyCode}
          initialEmail={email}
        />
      </main>
    </BrandingProvider>
  );
}

"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME, CUSTOMER_LOGIN_SUBTITLE } from "@/lib/branding";
import { BrandingProvider } from "@/components/branding-provider";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageMain,
} from "@/components/ui";
import type { CompanyBranding } from "@/lib/types";
import type { ResolvedTenant } from "@/lib/tenant-resolve";

interface LoginFormProps {
  initialTenant: ResolvedTenant | null;
  initialCompanyCode: string;
}

export function LoginForm({ initialTenant, initialCompanyCode }: LoginFormProps) {
  const [tenant] = useState(initialTenant);
  const [companyCode, setCompanyCode] = useState(initialCompanyCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const title = isBranded ? tenant.companyName : APP_NAME;

  return (
    <BrandingProvider branding={branding}>
      <PageMain
        className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
        style={{ backgroundColor: branding.backgroundColor }}
      >
        <header className="mb-8 text-center">
          {isBranded && branding.logoUrl ? (
            <BrandLogo src={branding.logoUrl} variant="login" className="mb-4" />
          ) : null}
          {isBranded ? (
            <p className="text-brand-muted text-sm font-semibold uppercase tracking-wide">
              {CUSTOMER_LOGIN_SUBTITLE}
            </p>
          ) : (
            <p className="text-brand-muted text-sm font-semibold uppercase tracking-wide">
              Certiano Campus
            </p>
          )}
          <h1 className="text-brand mt-3 text-2xl font-bold leading-snug sm:text-3xl">
            {title}
          </h1>
          {!isBranded && (
            <p className="mt-2 text-sm text-slate-600">
              Bitte Firmenkennung eingeben oder Ihre firmenspezifische Login-Adresse nutzen.
            </p>
          )}
        </header>

        <Card className="w-full max-w-md">
          <h2 className="sr-only">Anmeldung</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isBranded && (
              <Input
                label="Firmenkennung"
                placeholder="z. B. F0004"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                autoComplete="organization"
                required
              />
            )}
            <Input
              label="E-Mail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Passwort"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ErrorMessage message={error} />
            <Button type="submit" disabled={loading} className="w-full" aria-busy={loading}>
              {loading ? "Wird angemeldet…" : "Anmelden"}
            </Button>
          </form>
        </Card>
      </PageMain>
    </BrandingProvider>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

interface TenantInfo {
  companyId: number;
  slug: string;
  companyName: string;
  branding: CompanyBranding;
  source: string;
}

function LoginPageInner() {
  const params = useSearchParams();
  const queryFirma = params.get("firma") ?? params.get("slug") ?? "";

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);
  const [companyKey, setCompanyKey] = useState(queryFirma);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTenant, setLoadingTenant] = useState(true);

  const loadTenant = useCallback(async (slug?: string) => {
    setLoadingTenant(true);
    setError("");
    try {
      const qs = slug?.trim()
        ? `?firma=${encodeURIComponent(slug.trim())}`
        : queryFirma
          ? `?firma=${encodeURIComponent(queryFirma)}`
          : "";
      const res = await fetch(`/api/public/tenant${qs}`);
      const data = await res.json().catch(() => ({}));
      if (data.tenant) {
        setTenant(data.tenant as TenantInfo);
      } else if (slug?.trim()) {
        setTenant(null);
        setError("Firmenkennung nicht gefunden.");
      } else {
        setTenant(null);
      }
    } catch {
      if (slug?.trim()) {
        setError("Firmenkennung konnte nicht geladen werden.");
      }
      setTenant(null);
    } finally {
      setLoadingTenant(false);
      setTenantChecked(true);
    }
  }, [queryFirma]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  async function applyCompanyKey(e: React.FormEvent) {
    e.preventDefault();
    if (!companyKey.trim()) {
      setError("Bitte Firmenkennung eingeben.");
      return;
    }
    await loadTenant(companyKey.trim());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let activeTenant = tenant;
    if (!activeTenant && companyKey.trim()) {
      setLoading(true);
      const res = await fetch(
        `/api/public/tenant?firma=${encodeURIComponent(companyKey.trim())}`
      );
      const data = await res.json().catch(() => ({}));
      if (data.tenant) {
        activeTenant = data.tenant as TenantInfo;
        setTenant(activeTenant);
      } else {
        setError("Firmenkennung nicht gefunden.");
        setLoading(false);
        return;
      }
    }

    if (!activeTenant) {
      setError("Bitte Firmenkennung eingeben oder die firmenspezifische Login-Adresse nutzen.");
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
          companySlug: activeTenant.slug,
          companyId: activeTenant.companyId,
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

  const branding = tenant?.branding ?? DEFAULT_BRANDING;
  const isBranded = tenant != null;
  const title = isBranded ? tenant.companyName : APP_NAME;

  if (loadingTenant && !tenantChecked) {
    return (
      <PageMain className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Lädt…</p>
      </PageMain>
    );
  }

  return (
    <BrandingProvider branding={branding}>
      <PageMain
        className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
        style={{ backgroundColor: branding.backgroundColor }}
      >
        <header className="mb-8 text-center">
          {isBranded && branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              className="mx-auto mb-4 h-12 w-auto max-w-[200px] object-contain"
            />
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

          {!isBranded && (
            <form onSubmit={applyCompanyKey} className="mb-4 space-y-3 border-b border-slate-100 pb-4">
              <Input
                label="Firmenkennung"
                placeholder="z. B. standard"
                value={companyKey}
                onChange={(e) => setCompanyKey(e.target.value)}
                autoComplete="organization"
              />
              <Button type="submit" variant="secondary" className="w-full" disabled={loadingTenant}>
                {loadingTenant ? "Prüft…" : "Firma laden"}
              </Button>
            </form>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PageMain className="flex min-h-screen items-center justify-center">Lädt…</PageMain>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

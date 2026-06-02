"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageMain,
} from "@/components/ui";
import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";
import { BrandingProvider } from "@/components/branding-provider";
import { DEFAULT_BRANDING } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";

export default function CertianoLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<CompanyBranding>(DEFAULT_BRANDING);
  const [displayName, setDisplayName] = useState(APP_NAME);

  useEffect(() => {
    fetch("/api/public/operator-branding")
      .then((r) => r.json())
      .then((d) => {
        if (d?.branding) setBranding(d.branding);
        if (d?.name) setDisplayName(d.name);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal: "certiano" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Anmeldung fehlgeschlagen.");
        setLoading(false);
        return;
      }

      window.location.replace(data.redirect ?? "/certiano");
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setLoading(false);
    }
  }

  return (
    <BrandingProvider branding={branding}>
      <PageMain
        className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-white"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <header className="mb-8 text-center">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              className="mx-auto mb-4 h-12 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
            {OPERATOR_NAME} · Betreiberbereich
          </p>
          <h1 className="mt-3 text-3xl font-bold">{displayName}</h1>
          <p className="mt-2 text-sm opacity-80">Mandantenverwaltung für Certiano</p>
        </header>

        <Card className="w-full max-w-md text-slate-900">
          <h2 className="sr-only">Certiano Anmeldung</h2>
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
          <p className="mt-4 text-center text-xs text-slate-500">
            Kunden-Login:{" "}
            <a href="/login" className="text-brand underline">
              /login
            </a>
          </p>
        </Card>
      </PageMain>
    </BrandingProvider>
  );
}

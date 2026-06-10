"use client";

import { useState } from "react";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageMain,
} from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { OPERATOR_NAME } from "@/lib/branding";
import { BrandingProvider } from "@/components/branding-provider";
import type { CompanyBranding } from "@/lib/types";

interface CertianoLoginFormProps {
  branding: CompanyBranding;
  displayName: string;
}

export function CertianoLoginForm({ branding, displayName }: CertianoLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
            <BrandLogo src={branding.logoUrl} variant="login" className="mb-4" />
          ) : null}
          <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
            {OPERATOR_NAME} · Certiano
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

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CertianoShell, notifyCertianoBrandingUpdated } from "@/components/certiano-shell";
import { invalidateTenantBrandingCache } from "@/components/tenant-branding-loader";
import { Button, Card, Input } from "@/components/ui";
import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";
import { applyBrandingCssVars } from "@/lib/branding-theme";
import type { CompanyBranding } from "@/lib/types";

interface BrandingFormState {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoUrl: string;
}

const defaultForm = (): BrandingFormState => ({
  name: APP_NAME,
  primaryColor: "#000080",
  secondaryColor: "#4040a0",
  backgroundColor: "#f8fafc",
  accentColor: "#2563eb",
  logoUrl: "",
});

function BrandingPreview({ form }: { form: BrandingFormState }) {
  return (
    <div
      className="sm:col-span-2 rounded-xl border p-4"
      style={{ backgroundColor: form.backgroundColor }}
    >
      {form.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={form.logoUrl} alt="" className="mb-3 h-10 w-auto object-contain" />
      ) : null}
      <p style={{ color: form.primaryColor }} className="text-lg font-bold">
        {form.name || "Vorschau"}
      </p>
      <p style={{ color: form.secondaryColor }} className="text-sm">
        Sekundärtext
      </p>
      <span
        style={{ backgroundColor: form.accentColor }}
        className="mt-2 inline-block rounded px-3 py-1 text-sm text-white"
      >
        Button
      </span>
    </div>
  );
}

function BrandingFormInner() {
  const params = useSearchParams();
  const companyId = params.get("companyId");
  const isOperator = !companyId;
  const [form, setForm] = useState<BrandingFormState>(defaultForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (isOperator) {
      fetch("/api/superuser/operator-branding")
        .then((r) => r.json())
        .then((d) => {
          if (!d?.branding) return;
          setForm({
            name: d.name ?? APP_NAME,
            primaryColor: d.branding.primaryColor,
            secondaryColor: d.branding.secondaryColor,
            backgroundColor: d.branding.backgroundColor,
            accentColor: d.branding.accentColor,
            logoUrl: d.branding.logoUrl ?? "",
          });
        })
        .catch(() => setError("Branding konnte nicht geladen werden."));
      return;
    }

    fetch(`/api/superuser/companies/${companyId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.company) {
          setForm({
            name: d.company.name,
            primaryColor: d.company.branding.primaryColor,
            secondaryColor: d.company.branding.secondaryColor,
            backgroundColor: d.company.branding.backgroundColor,
            accentColor: d.company.branding.accentColor,
            logoUrl: d.company.branding.logoUrl ?? "",
          });
        }
      })
      .catch(() => setError("Branding konnte nicht geladen werden."));
  }, [companyId, isOperator]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      if (isOperator) {
        const res = await fetch("/api/superuser/operator-branding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(d.error ?? "Speichern fehlgeschlagen.");
          return;
        }
        const branding = d.branding as CompanyBranding;
        setForm({
          name: d.name ?? form.name,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          backgroundColor: branding.backgroundColor,
          accentColor: branding.accentColor,
          logoUrl: branding.logoUrl ?? "",
        });
        applyBrandingCssVars(branding);
        notifyCertianoBrandingUpdated({
          name: d.name ?? form.name,
          branding,
        });
        setMessage("Branding gespeichert.");
        return;
      }

      const res = await fetch(`/api/superuser/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      if (d.company) {
        setForm({
          name: d.company.name,
          primaryColor: d.company.branding.primaryColor,
          secondaryColor: d.company.branding.secondaryColor,
          backgroundColor: d.company.branding.backgroundColor,
          accentColor: d.company.branding.accentColor,
          logoUrl: d.company.branding.logoUrl ?? "",
        });
      }
      invalidateTenantBrandingCache();
      setMessage("Firmen-Branding gespeichert.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">
        {isOperator ? `${OPERATOR_NAME} – Certiano-Branding` : `Firmen-Branding: ${form.name}`}
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        {isOperator
          ? "Gilt für den Certiano-Bereich (/certiano/*)."
          : "Gilt für Login, Dashboard und Schulung der ausgewählten Firma."}
      </p>
      {message && <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input
          label={isOperator ? "Anzeigename" : "Firmenname"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Logo-URL"
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
        />
        <Input
          label="Primärfarbe"
          type="color"
          value={form.primaryColor}
          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
        />
        <Input
          label="Sekundärfarbe"
          type="color"
          value={form.secondaryColor}
          onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
        />
        <Input
          label="Hintergrund"
          type="color"
          value={form.backgroundColor}
          onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
        />
        <Input
          label="Akzentfarbe"
          type="color"
          value={form.accentColor}
          onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
        />
        <BrandingPreview form={form} />
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
          {!isOperator && (
            <Link
              href="/certiano/branding"
              className="inline-flex min-h-[44px] items-center text-sm text-brand underline"
            >
              Certiano-Branding bearbeiten
            </Link>
          )}
        </div>
      </form>
    </Card>
  );
}

export default function CertianoBrandingPage() {
  return (
    <CertianoShell>
      <Link href="/certiano" className="mb-4 inline-block text-sm text-brand underline">
        ← Zurück
      </Link>
      <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
        <BrandingFormInner />
      </Suspense>
    </CertianoShell>
  );
}

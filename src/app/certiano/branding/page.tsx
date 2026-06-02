"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Button, Card, Input } from "@/components/ui";
import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";

function BrandingForm() {
  const params = useSearchParams();
  const companyId = params.get("companyId");
  const [form, setForm] = useState({
    name: "",
    primaryColor: "#000080",
    secondaryColor: "#4040a0",
    backgroundColor: "#f8fafc",
    accentColor: "#2563eb",
    logoUrl: "",
  });
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    if (!companyId) return;
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
      });
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    const res = await fetch(`/api/superuser/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) setMessage("Branding gespeichert.");
    else setMessage("Speichern fehlgeschlagen.");
  }

  if (!companyId) {
    return (
      <Card>
        <p>Bitte eine Firma in der Übersicht auswählen.</p>
        <Link href="/certiano" className="text-brand underline">
          Zur Firmenübersicht
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Branding: {form.name}</h2>
      {message && <p className="mb-4 text-sm text-brand">{message}</p>}
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input label="Firmenname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Logo-URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        <Input label="Primärfarbe" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
        <Input label="Sekundärfarbe" type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
        <Input label="Hintergrund" type="color" value={form.backgroundColor} onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })} />
        <Input label="Akzentfarbe" type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
        <div className="sm:col-span-2 rounded-xl border p-4" style={{ backgroundColor: form.backgroundColor }}>
          <p style={{ color: form.primaryColor }} className="text-lg font-bold">
            {form.name || "Vorschau"}
          </p>
          <p style={{ color: form.secondaryColor }} className="text-sm">
            Sekundärtext
          </p>
          <span style={{ backgroundColor: form.accentColor }} className="mt-2 inline-block rounded px-3 py-1 text-sm text-white">
            Button
          </span>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Speichern</Button>
        </div>
      </form>
    </Card>
  );
}

export default function CertianoBrandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {OPERATOR_NAME}
            </p>
            <h1 className="text-xl font-bold">{APP_NAME} – Branding</h1>
          </div>
          <AccountMenu variant="dark" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/certiano" className="mb-4 inline-block text-sm text-brand underline">
          ← Kundenfirmen
        </Link>
        <Suspense fallback={<p>Lädt…</p>}>
          <BrandingForm />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { invalidateTenantBrandingCache } from "@/components/tenant-branding-loader";
import { Button, Card, Input } from "@/components/ui";
import { applyBrandingCssVars } from "@/lib/branding-theme";

export default function FirmaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    street: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    email: "",
    phone: "",
    website: "",
    primaryColor: "#000080",
    secondaryColor: "#4040a0",
    backgroundColor: "#f8fafc",
    accentColor: "#2563eb",
  });
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/company")
      .then((r) => {
        if (r.status === 403) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d?.company) return;
        const c = d.company;
        setForm({
          name: c.name,
          contactPerson: c.contactPerson ?? "",
          street: c.street ?? "",
          postalCode: c.postalCode ?? "",
          city: c.city ?? "",
          country: c.country ?? "Deutschland",
          email: c.email ?? "",
          phone: c.phone ?? "",
          website: c.website ?? "",
          primaryColor: c.branding.primaryColor,
          secondaryColor: c.branding.secondaryColor,
          backgroundColor: c.branding.backgroundColor,
          accentColor: c.branding.accentColor,
        });
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (data.company?.branding) {
        applyBrandingCssVars(data.company.branding);
      }
      invalidateTenantBrandingCache();
      setMessage("Firma gespeichert.");
    } else {
      setMessage(data.error ?? "Speichern fehlgeschlagen.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Meine Firma" />
      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">{message}</p>
      )}
      <Card>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Input label="Firmenname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Ansprechpartner"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            placeholder="z. B. Max Mustermann"
          />
          <Input label="E-Mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Straße" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <Input label="PLZ" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          <Input label="Ort" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Land" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Input label="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Firmenlogo</span>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Die Unterstützung für individuelle Firmenlogos wird in einer zukünftigen Version
                verfügbar sein.
              </p>
            </div>
          </div>
          <Input label="Primärfarbe" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
          <Input label="Sekundärfarbe" type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
          <div className="sm:col-span-2 rounded-xl border p-4" style={{ backgroundColor: form.backgroundColor }}>
            <p className="text-lg font-bold" style={{ color: form.primaryColor }}>{form.name} – Vorschau</p>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

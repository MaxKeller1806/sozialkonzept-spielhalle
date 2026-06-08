"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { invalidateTenantBrandingCache } from "@/components/tenant-branding-loader";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { applyBrandingCssVars } from "@/lib/branding-theme";

export default function FirmaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
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
    logoUrl: "",
    certSignaturePerson: "",
    certSignaturePosition: "",
    certSignatureText: "",
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
          logoUrl: c.branding.logoUrl ?? "",
          certSignaturePerson: c.documentSignature?.responsiblePerson ?? "",
          certSignaturePosition: c.documentSignature?.position ?? "",
          certSignatureText: c.documentSignature?.customText ?? "",
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
          <Input label="E-Mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Straße" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <Input label="PLZ" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          <Input label="Ort" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Land" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Input label="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <Input label="Logo-URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          <Input label="Primärfarbe" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
          <Input label="Sekundärfarbe" type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
          <div className="sm:col-span-2 rounded-xl border p-4" style={{ backgroundColor: form.backgroundColor }}>
            <p className="text-lg font-bold" style={{ color: form.primaryColor }}>{form.name} – Vorschau</p>
          </div>

          <div className="sm:col-span-2 mt-2 border-t border-slate-200 pt-6">
            <h2 className="mb-1 text-base font-bold text-slate-900">
              Zertifikate &amp; Nachweise – Signatur
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Diese Angaben erscheinen auf ausgestellten Zertifikaten und Nachweisen,
              wenn der Signaturbereich in der globalen Vorlage aktiviert ist.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Verantwortliche Person"
                placeholder="z. B. Max Mustermann"
                value={form.certSignaturePerson}
                onChange={(e) =>
                  setForm({ ...form, certSignaturePerson: e.target.value })
                }
              />
              <Input
                label="Position / Funktion"
                placeholder="z. B. Geschäftsführer"
                value={form.certSignaturePosition}
                onChange={(e) =>
                  setForm({ ...form, certSignaturePosition: e.target.value })
                }
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Zusätzlicher Signaturtext (optional)"
                  placeholder="z. B. Im Auftrag der Spielhallenleitung"
                  value={form.certSignatureText}
                  onChange={(e) =>
                    setForm({ ...form, certSignatureText: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

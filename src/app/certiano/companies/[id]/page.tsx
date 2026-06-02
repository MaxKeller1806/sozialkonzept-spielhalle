"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, Input } from "@/components/ui";

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [form, setForm] = useState({
    name: "",
    street: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    email: "",
    phone: "",
    website: "",
    logoUrl: "",
    primaryColor: "#000080",
    secondaryColor: "#4040a0",
    backgroundColor: "#f8fafc",
    accentColor: "#2563eb",
    status: "active",
    licenseStatus: "unlicensed",
    licenseExpiresAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/superuser/companies/${companyId}`)
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.company) {
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
            logoUrl: c.branding.logoUrl ?? "",
            primaryColor: c.branding.primaryColor,
            secondaryColor: c.branding.secondaryColor,
            backgroundColor: c.branding.backgroundColor,
            accentColor: c.branding.accentColor,
            status: c.status,
            licenseStatus: c.licenseStatus,
            licenseExpiresAt: c.licenseExpiresAt
              ? c.licenseExpiresAt.slice(0, 10)
              : "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch(`/api/superuser/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        licenseExpiresAt: form.licenseExpiresAt || null,
      }),
    });
    if (res.ok) {
      setMessage("Firma erfolgreich gespeichert.");
      load();
    } else {
      const d = await res.json();
      setMessage(d.error ?? "Speichern fehlgeschlagen.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        Lädt…
      </div>
    );
  }

  return (
    <CertianoShell companyId={companyId}>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Firma bearbeiten: {form.name}</h2>
        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Input label="Firmenname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="E-Mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <Input label="Straße" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <Input label="PLZ" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          <Input label="Ort" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Land" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Input label="Logo-URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          <Input label="Primärfarbe" type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
          <Input label="Sekundärfarbe" type="color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
          <Input label="Hintergrund" type="color" value={form.backgroundColor} onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })} />
          <Input label="Akzentfarbe" type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Firmenstatus</span>
            <select
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Aktiv</option>
              <option value="disabled">Deaktiviert</option>
              <option value="pending">Ausstehend</option>
              <option value="expired">Abgelaufen</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Lizenzstatus</span>
            <select
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.licenseStatus}
              onChange={(e) => setForm({ ...form, licenseStatus: e.target.value })}
            >
              <option value="unlicensed">Unlizenziert</option>
              <option value="active">Aktiv</option>
              <option value="disabled">Gesperrt</option>
              <option value="expired">Abgelaufen</option>
            </select>
          </label>
          <Input
            label="Lizenz gültig bis"
            type="date"
            value={form.licenseExpiresAt}
            onChange={(e) => setForm({ ...form, licenseExpiresAt: e.target.value })}
          />
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit">Speichern</Button>
            <Link href={`/certiano/companies/${companyId}/users`}>
              <Button type="button" variant="secondary">
                Benutzer
              </Button>
            </Link>
            <Link href={`/certiano/companies/${companyId}/courses`}>
              <Button type="button" variant="secondary">
                Kursfreigaben
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </CertianoShell>
  );
}

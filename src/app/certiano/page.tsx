"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";
import { APP_NAME, OPERATOR_NAME } from "@/lib/branding";

interface AdminContact {
  name: string;
  email: string;
}

interface CompanySummary {
  id: number;
  name: string;
  status: string;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  createdAt: string;
  employeeCount: number;
  adminCount: number;
  adminContacts: AdminContact[];
}

export default function CertianoDashboardPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newLicense, setNewLicense] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", email: "" });
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/superuser/companies")
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          window.location.replace("/certiano/login");
          return null;
        }
        if (!r.ok) {
          return r.json().then((d) => {
            throw new Error(d.error ?? "Laden fehlgeschlagen.");
          });
        }
        return r.json();
      })
      .then((d) => {
        if (d?.companies) setCompanies(d.companies);
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/certiano/login");
  }

  useEffect(() => {
    load();
  }, [load]);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setNewLicense(null);
    const res = await fetch("/api/superuser/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    setNewLicense(data.licenseKey);
    setMessage(`Firma angelegt. Admin: ${data.adminEmail}`);
    setShowForm(false);
    load();
  }

  async function regenerateLicense(companyId: number) {
    const res = await fetch(`/api/superuser/companies/${companyId}/license`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      setNewLicense(data.licenseKey);
      setMessage("Neuer Lizenzschlüssel erstellt (nur einmal sichtbar).");
    }
  }

  async function toggleStatus(company: CompanySummary) {
    const newStatus = company.status === "active" ? "disabled" : "active";
    await fetch(`/api/superuser/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        Lädt…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {OPERATOR_NAME}
            </p>
            <h1 className="text-xl font-bold">{APP_NAME}</h1>
            <p className="text-sm text-slate-400">Mandantenverwaltung</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-slate-300 hover:underline"
          >
            Abmelden
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Certiano">
          <span className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Kundenfirmen
          </span>
          <Link
            href="/certiano/branding"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            Branding
          </Link>
        </nav>

        <div className="mb-6 flex flex-wrap justify-between gap-3">
          <p className="max-w-xl text-sm text-slate-600">
            Aggregierte Übersicht aller Kundenfirmen. Keine Mitarbeiterdetails
            (Geburtsort, Wohnort, Prüfungen, Zertifikate).
          </p>
          <Button onClick={() => setShowForm(true)}>Neue Firma</Button>
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        {newLicense && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold">Lizenzschlüssel (bitte kopieren):</p>
            <code className="mt-2 block break-all text-lg">{newLicense}</code>
          </Card>
        )}

        {showForm && (
          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-bold">Neue Kundenfirma anlegen</h2>
            <form onSubmit={createCompany} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Firmenname"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Kurzname (URL)"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
              <Input
                label="E-Mail (optional)"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit">Anlegen</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4">Firma</th>
                <th className="p-4">Status</th>
                <th className="p-4">Lizenz</th>
                <th className="p-4">Admins</th>
                <th className="p-4">Mitarbeiter</th>
                <th className="p-4">Admin-Kontakte</th>
                <th className="p-4">Erstellt</th>
                <th className="p-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4">{c.status}</td>
                  <td className="p-4">{c.licenseStatus}</td>
                  <td className="p-4">{c.adminCount}</td>
                  <td className="p-4">{c.employeeCount}</td>
                  <td className="p-4">
                    {c.adminContacts.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-1">
                        {c.adminContacts.map((a) => (
                          <li key={a.email}>
                            <span className="font-medium">{a.name}</span>
                            <br />
                            <span className="text-slate-500">{a.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="p-4">
                    {new Date(c.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="text-left text-brand hover:underline"
                        onClick={() => regenerateLicense(c.id)}
                      >
                        Lizenz neu
                      </button>
                      <button
                        type="button"
                        className="text-left text-slate-600 hover:underline"
                        onClick={() => toggleStatus(c)}
                      >
                        {c.status === "active" ? "Deaktivieren" : "Aktivieren"}
                      </button>
                      <Link
                        href={`/certiano/branding?companyId=${c.id}`}
                        className="text-brand hover:underline"
                      >
                        Branding
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

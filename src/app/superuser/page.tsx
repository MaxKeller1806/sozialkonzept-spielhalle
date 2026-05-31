"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader, Button, Card, Input } from "@/components/ui";

interface CompanySummary {
  id: number;
  name: string;
  status: string;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  createdAt: string;
  employeeCount: number;
  adminCount: number;
  adminName: string | null;
}

export default function SuperuserPage() {
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
          window.location.replace("/login");
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
    window.location.replace("/login");
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
      <div className="flex min-h-screen items-center justify-center">Lädt…</div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title="Superuser – Mandantenverwaltung" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Superuser">
          <span className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
            Firmen
          </span>
          <Link
            href="/superuser/branding"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Branding
          </Link>
          <button
            type="button"
            onClick={logout}
            className="ml-auto rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:underline"
          >
            Abmelden
          </button>
        </nav>

        <div className="mb-6 flex justify-between gap-3">
          <p className="text-sm text-slate-600">
            Aggregierte Übersicht ohne Zugriff auf personenbezogene Mitarbeiterdaten.
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
            <h2 className="mb-4 text-lg font-bold">Neue Firma anlegen</h2>
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
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit">Anlegen</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4">Firma</th>
                <th className="p-4">Status</th>
                <th className="p-4">Lizenz</th>
                <th className="p-4">Mitarbeiter</th>
                <th className="p-4">Admins</th>
                <th className="p-4">Admin-Kontakt</th>
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
                  <td className="p-4">{c.employeeCount}</td>
                  <td className="p-4">{c.adminCount}</td>
                  <td className="p-4">{c.adminName ?? "—"}</td>
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
                        href={`/superuser/branding?companyId=${c.id}`}
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CertianoShell } from "@/components/certiano-shell";
import { Button, Card, Input } from "@/components/ui";

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
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newLicense, setNewLicense] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", email: "" });
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setLoadError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    fetch("/api/superuser/companies", { signal: controller.signal })
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
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || e.message.toLowerCase().includes("aborted"));
        setLoadError(
          isAbort
            ? "Zeitüberschreitung beim Laden. Bitte erneut versuchen."
            : e instanceof Error
              ? e.message
              : "Laden fehlgeschlagen."
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
  }, []);

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

  return (
    <CertianoShell>
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
        {loadError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            <p>{loadError}</p>
            <Button type="button" variant="secondary" onClick={load} className="mt-3 !w-auto">
              Erneut laden
            </Button>
          </div>
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

        {loading ? (
          <p className="text-sm text-slate-600">Lädt Firmen…</p>
        ) : (
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
                      <Link
                        href={`/certiano/companies/${c.id}`}
                        className="text-brand hover:underline"
                      >
                        Bearbeiten
                      </Link>
                      <Link
                        href={`/certiano/companies/${c.id}/users`}
                        className="text-brand hover:underline"
                      >
                        Benutzer
                      </Link>
                      <Link
                        href={`/certiano/companies/${c.id}/courses`}
                        className="text-brand hover:underline"
                      >
                        Kurse
                      </Link>
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
        )}
    </CertianoShell>
  );
}

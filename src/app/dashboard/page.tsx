"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import {
  AppHeader,
  Button,
  Card,
  Input,
  StatusDot,
} from "@/components/ui";
import type { TrainingStatus } from "@/lib/types";

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  birthDate: string | null;
  birthPlace: string | null;
  placeOfResidence: string | null;
  location: string | null;
  active: boolean;
  status: TrainingStatus;
  statusLabel: string;
  certificate: {
    id: number;
    certificateNumber: string;
    validUntil: string;
    score: number;
  } | null;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    birthDate: "",
    birthPlace: "",
    placeOfResidence: "",
    location: "",
  });
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((auth) => {
        if (!auth.user) {
          window.location.replace("/login");
          return null;
        }
        const redirect = auth.authState?.redirect as string | undefined;
        const allowed = ["/dashboard", "/dashboard/lizenz", "/dashboard/gesperrt"];
        if (redirect && !allowed.includes(redirect)) {
          window.location.replace(redirect);
          return null;
        }
        return fetch("/api/admin/users");
      })
      .then((r) => {
        if (!r) return null;
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
        if (!d) return;
        if (d.users) {
          setUsers(d.users.filter((u: AdminUser) => u.role === "employee"));
        }
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  function resetForm() {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      birthDate: "",
      birthPlace: "",
      placeOfResidence: "",
      location: "",
    });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(u: AdminUser) {
    setEditId(u.id);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: "",
      birthDate: u.birthDate ?? "",
      birthPlace: u.birthPlace ?? "",
      placeOfResidence: u.placeOfResidence ?? "",
      location: u.location ?? "",
    });
    setShowForm(true);
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (editId) {
      const body: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        birthDate: form.birthDate || null,
        birthPlace: form.birthPlace || null,
        placeOfResidence: form.placeOfResidence || null,
        location: form.location || null,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/admin/users/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage("Speichern fehlgeschlagen.");
        return;
      }
    } else {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setMessage(d.error ?? "Anlegen fehlgeschlagen.");
        return;
      }
    }

    resetForm();
    loadUsers();
    setMessage("Gespeichert.");
  }

  async function toggleActive(u: AdminUser) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    loadUsers();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">Lädt…</div>
    );
  }

  const employees = users;

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title="Admin-Dashboard" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdminNav active="mitarbeiter" />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <StatusDot status="green" /> Gültig
            </span>
            <span className="flex items-center gap-1">
              <StatusDot status="yellow" /> Läuft in 30 Tagen ab
            </span>
            <span className="flex items-center gap-1">
              <StatusDot status="red" /> Nicht geschult / abgelaufen
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/export">
              <Button variant="secondary">CSV-Export</Button>
            </a>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Mitarbeiter anlegen
            </Button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:underline"
            >
              Abmelden
            </button>
          </div>
        </div>

        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}

        {showForm && (
          <Card className="mb-6">
            <h2 className="mb-4 text-lg font-bold">
              {editId ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
            </h2>
            <form onSubmit={saveUser} className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Vorname"
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
              <Input
                label="Nachname"
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
              <Input
                label="E-Mail"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label={editId ? "Neues Passwort (optional)" : "Passwort"}
                type="password"
                required={!editId}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <Input
                label="Geburtsdatum"
                type="date"
                value={form.birthDate}
                onChange={(e) =>
                  setForm({ ...form, birthDate: e.target.value })
                }
              />
              <Input
                label="Geburtsort"
                value={form.birthPlace}
                onChange={(e) =>
                  setForm({ ...form, birthPlace: e.target.value })
                }
              />
              <Input
                label="Wohnort"
                value={form.placeOfResidence}
                onChange={(e) =>
                  setForm({ ...form, placeOfResidence: e.target.value })
                }
              />
              <Input
                label="Spielhalle"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
              />
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit">Speichern</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
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
                <th className="p-4">Status</th>
                <th className="p-4">Name</th>
                <th className="p-4">E-Mail</th>
                <th className="p-4">Spielhalle</th>
                <th className="p-4">Zertifikat</th>
                <th className="p-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-4">
                      <span className="flex items-center gap-2">
                        <StatusDot status={u.status} />
                        <span className="text-xs">{u.statusLabel}</span>
                      </span>
                    </td>
                    <td className="p-4 font-medium">
                      {u.firstName} {u.lastName}
                      {!u.active && (
                        <span className="ml-2 text-xs text-red-600">
                          (deaktiviert)
                        </span>
                      )}
                    </td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{u.location ?? "—"}</td>
                    <td className="p-4">
                      {u.certificate ? (
                        <div>
                          <p className="text-xs">{u.certificate.certificateNumber}</p>
                          <a
                            href={`/api/certificates/${u.certificate.id}/pdf`}
                            className="text-brand underline"
                          >
                            PDF
                          </a>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          className="text-left text-brand hover:underline"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(u)}
                          className="text-left text-slate-600 hover:underline"
                        >
                          {u.active ? "Deaktivieren" : "Aktivieren"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {employees.length === 0 && (
            <p className="p-8 text-center text-slate-500">
              Noch keine Mitarbeiter angelegt.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

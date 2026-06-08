"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";

export default function AdminKontoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.user) setEmail(d.user.email);
        setLoading(false);
      });
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword) {
      setError("Bitte aktuelles Passwort eingeben.");
      return;
    }

    const body: Record<string, string> = { currentPassword };
    if (email.trim()) body.email = email.trim();
    if (newPassword) body.password = newPassword;

    const res = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setMessage("Zugangsdaten gespeichert.");
    setCurrentPassword("");
    setNewPassword("");
    if (data.email) setEmail(data.email);
  }

  if (loading) {
    return <p className="px-4 py-8 text-sm text-slate-600">Lädt…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Mein Konto"
        description="E-Mail und Passwort für die Anmeldung ändern. Zur Bestätigung ist das aktuelle Passwort erforderlich."
      />

      <Card>
        <h2 className="mb-2 text-lg font-bold">Mein Admin-Konto</h2>

        {message && (
          <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={save} className="grid gap-4">
          <Input
            label="Login-E-Mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <Input
            label="Neues Passwort (optional)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Aktuelles Passwort"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit">Speichern</Button>
        </form>
      </Card>
    </div>
  );
}

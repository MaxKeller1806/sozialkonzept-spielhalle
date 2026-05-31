"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, ErrorMessage, Input, PageMain } from "@/components/ui";

export default function PasswortAendernPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [mustChange, setMustChange] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setMustChange(!!d.user.mustChangePassword);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        passwordConfirm,
        currentPassword: mustChange ? undefined : currentPassword,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    router.push(data.redirect ?? "/schulung");
    router.refresh();
  }

  return (
    <PageMain className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="text-xl font-bold">Passwort ändern</h1>
        <p className="mt-2 text-sm text-slate-600">
          {mustChange
            ? "Beim ersten Login müssen Sie ein neues persönliches Passwort setzen (mindestens 8 Zeichen)."
            : "Bitte geben Sie Ihr neues Passwort zweimal ein."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {!mustChange && (
            <Input
              label="Aktuelles Passwort"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          )}
          <Input
            label="Neues Passwort"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Neues Passwort wiederholen"
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <ErrorMessage message={error} />
          <Button type="submit" disabled={loading} className="w-full">
            Passwort speichern
          </Button>
        </form>
      </Card>
    </PageMain>
  );
}

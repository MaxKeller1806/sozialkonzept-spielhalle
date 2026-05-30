"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  EMPLOYEE_SUBTITLE,
  EMPLOYEE_TITLE,
  ErrorMessage,
  Input,
  PageMain,
} from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Anmeldung fehlgeschlagen.");
      return;
    }

    router.push(data.redirect ?? "/schulung");
    router.refresh();
  }

  return (
    <PageMain className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <header className="mb-8 text-center">
        <p
          className="text-brand-muted text-sm font-semibold uppercase tracking-wide"
          style={{ color: "#4040a0" }}
        >
          {EMPLOYEE_SUBTITLE}
        </p>
        <h1
          className="text-brand mt-3 text-2xl font-bold leading-snug sm:text-3xl"
          style={{ color: "#000080" }}
        >
          {EMPLOYEE_TITLE}
        </h1>
      </header>

      <Card className="w-full max-w-md">
        <h2 className="sr-only">Anmeldung</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="E-Mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Passwort"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorMessage message={error} />
          <Button type="submit" disabled={loading} className="w-full" aria-busy={loading}>
            {loading ? "Wird angemeldet…" : "Anmelden"}
          </Button>
        </form>

        <aside className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-800">Demo-Zugänge (MVP)</h3>
          <p className="mt-1">Admin: admin@spielhalle.local / admin123</p>
          <p>Mitarbeiter: mitarbeiter@demo.de / demo123</p>
        </aside>
      </Card>
    </PageMain>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input } from "@/components/ui";

export default function LizenzPage() {
  const router = useRouter();
  const [licenseKey, setLicenseKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Aktivierung fehlgeschlagen.");
      return;
    }
    setMessage("Lizenz erfolgreich aktiviert.");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <PageHeader
        title="Lizenz aktivieren"
        description="Ihre Firma wurde noch nicht freigeschaltet. Bitte geben Sie den Lizenzschlüssel ein, den Sie von Ihrem Anbieter erhalten haben."
      />
      <Card>
        <h2 className="text-lg font-bold">Lizenzschlüssel eingeben</h2>
        <form onSubmit={activate} className="mt-6 space-y-4">
          <Input
            label="Lizenzschlüssel"
            required
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-brand">{message}</p>}
          <Button type="submit" className="w-full">
            Firma freischalten
          </Button>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  ButtonLink,
  Card,
  ErrorMessage,
  Select,
  Textarea,
} from "@/components/ui";

export default function FeedbackPage() {
  const [category, setCategory] = useState<"frage" | "anregung">("frage");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error ?? "Senden fehlgeschlagen.");
      return;
    }

    setDone(true);
    setMessage("");
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Rückmeldung" />
        <Card className="text-center">
          <div role="status" aria-live="polite">
            <p className="text-4xl" aria-hidden="true">
              ✓
            </p>
            <h2 className="mt-4 text-xl font-bold">Vielen Dank!</h2>
            <p className="readable-text mt-2 text-base text-slate-600">
              Ihre Rückmeldung wurde übermittelt und wird von der Leitung
              gesichtet.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <Button onClick={() => setDone(false)} variant="secondary" className="w-full">
              Weitere Rückmeldung senden
            </Button>
            <ButtonLink href="/schulung" className="w-full">
              Zur Schulungsübersicht
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Fragen & Anregungen"
        actions={
          <ButtonLink href="/schulung" variant="secondary">
            Zurück zur Schulung
          </ButtonLink>
        }
      />

      <Card>
        <p className="readable-text mb-6 text-base text-slate-600">
          Haben Sie Fragen zur Schulung oder Anregungen zum Ablauf? Teilen Sie
          uns das hier mit – optional am Ende nach dem Test.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Select
            label="Art der Rückmeldung"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as "frage" | "anregung")
            }
          >
            <option value="frage">Frage</option>
            <option value="anregung">Anregung / Verbesserungsvorschlag</option>
          </Select>
          <Textarea
            label="Ihre Nachricht"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Beschreiben Sie Ihre Frage oder Anregung…"
            required
            minLength={10}
          />

          <ErrorMessage message={error} />

          <Button type="submit" disabled={sending} className="w-full" aria-busy={sending}>
            {sending ? "Wird gesendet…" : "Rückmeldung absenden"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

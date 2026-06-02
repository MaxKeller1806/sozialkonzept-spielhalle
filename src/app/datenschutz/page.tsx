"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageMain } from "@/components/ui";

export default function DatenschutzPage() {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState("Datenschutzerklärung");
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  useEffect(() => {
    fetch("/api/auth/privacy")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          throw new Error(d.error ?? "Laden fehlgeschlagen.");
        }
        return d;
      })
      .then((d) => {
        if (d.policy) {
          setTitle(d.policy.title);
          setContent(d.policy.content);
          setVersion(d.policy.version);
        } else {
          setContent("");
        }
        setPendingConfirmation(Boolean(d.pendingConfirmation));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        setContent("");
      });
  }, []);

  return (
    <PageMain className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      {version && (
        <p className="mt-1 text-sm text-slate-500">Version {version}</p>
      )}
      <div className="prose-readable mt-8 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
        {error ? (
          <p className="text-red-600" role="alert">{error}</p>
        ) : content === null ? (
          "Wird geladen…"
        ) : content || (
          "Keine Datenschutzerklärung hinterlegt."
        )}
      </div>
      <p className="mt-8">
        {pendingConfirmation ? (
          <a href="/datenschutz/bestaetigen" className="text-brand underline">
            ← Zurück zur Bestätigung
          </a>
        ) : (
          <Link href="/login" className="text-brand underline">
            Zur Anmeldung
          </Link>
        )}
      </p>
    </PageMain>
  );
}

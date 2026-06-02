"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageMain } from "@/components/ui";

function navigateTo(url: string) {
  window.location.replace(url);
}

export default function DatenschutzBestaetigenPage() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Datenschutzerklärung");
  const [version, setVersion] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/privacy", { credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error ?? "Laden fehlgeschlagen.");
        }
        return data;
      })
      .then((d) => {
        if (cancelled) return;

        if (d.redirect && (d.accepted || d.skipPrivacy)) {
          if (d.redirect === "/datenschutz/bestaetigen") {
            setError("Weiterleitung fehlgeschlagen. Bitte Seite neu laden.");
            setPageLoading(false);
            return;
          }
          setPageLoading(false);
          navigateTo(d.redirect);
          return;
        }

        if (d.policy) {
          setTitle(d.policy.title);
          setContent(d.policy.content);
          setVersion(d.policy.version);
        }

        setPageLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
        setPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function accept() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/privacy", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Bestätigung fehlgeschlagen.");
        if (data.redirect && data.redirect !== "/datenschutz/bestaetigen") {
          navigateTo(data.redirect);
        }
        setSubmitting(false);
        return;
      }

      const target = data.redirect as string | undefined;
      if (!target || target === "/datenschutz/bestaetigen") {
        setError("Kein Weiterleitungsziel erhalten.");
        setSubmitting(false);
        return;
      }

      navigateTo(target);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  }

  if (pageLoading) {
    return (
      <PageMain className="mx-auto max-w-3xl px-4 py-12">
        <p role="status">Datenschutzerklärung wird geladen…</p>
      </PageMain>
    );
  }

  const preview =
    content.length > 600 ? `${content.slice(0, 600).trim()}…` : content;

  return (
    <PageMain className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <h1 className="text-xl font-bold">{title}</h1>
        {version && (
          <p className="mt-1 text-sm text-slate-500">Version {version}</p>
        )}

        <div className="mt-6 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {preview || "Keine Datenschutzerklärung hinterlegt."}
        </div>

        {content.length > 600 && (
          <details className="mt-4 rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-brand">
              Vollständige Datenschutzerklärung anzeigen
            </summary>
            <div className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {content}
            </div>
          </details>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6">
          <Button
            onClick={accept}
            disabled={submitting || !content}
            aria-busy={submitting}
          >
            {submitting
              ? "Wird gespeichert…"
              : "Ich habe die Datenschutzerklärung gelesen und akzeptiere sie"}
          </Button>
        </div>
      </Card>
    </PageMain>
  );
}

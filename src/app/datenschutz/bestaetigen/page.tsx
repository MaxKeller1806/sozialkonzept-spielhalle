"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, PageMain } from "@/components/ui";

export default function DatenschutzBestaetigenPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Datenschutzerklärung");
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/privacy")
      .then((r) => r.json())
      .then((d) => {
        if (d.policy) {
          setTitle(d.policy.title);
          setContent(d.policy.content);
          setVersion(d.policy.version);
        }
        if (d.accepted) {
          router.replace("/schulung");
        }
      });
  }, [router]);

  async function accept() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/privacy", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Bestätigung fehlgeschlagen.");
      return;
    }
    router.push(data.redirect ?? "/schulung");
    router.refresh();
  }

  return (
    <PageMain className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <h1 className="text-xl font-bold">{title}</h1>
        {version && (
          <p className="mt-1 text-sm text-slate-500">Version {version}</p>
        )}
        <div className="mt-6 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {content || "Wird geladen…"}
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={accept} disabled={loading || !content}>
            Ich habe die Datenschutzerklärung gelesen und akzeptiere sie
          </Button>
          <a href="/datenschutz" className="text-sm text-brand underline self-center">
            Vollständige Ansicht
          </a>
        </div>
      </Card>
    </PageMain>
  );
}

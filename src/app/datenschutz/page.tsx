"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageMain } from "@/components/ui";

export default function DatenschutzPage() {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState("Datenschutzerklärung");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/privacy")
      .then((r) => r.json())
      .then((d) => {
        if (d.policy) {
          setTitle(d.policy.title);
          setContent(d.policy.content);
          setVersion(d.policy.version);
        }
      });
  }, []);

  return (
    <PageMain className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      {version && (
        <p className="mt-1 text-sm text-slate-500">Version {version}</p>
      )}
      <div className="prose-readable mt-8 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
        {content ?? "Wird geladen…"}
      </div>
      <p className="mt-8">
        <Link href="/login" className="text-brand underline">
          Zur Anmeldung
        </Link>
      </p>
    </PageMain>
  );
}

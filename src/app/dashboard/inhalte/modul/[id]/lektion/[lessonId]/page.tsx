"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { AppHeader, Button, Card, Input, Textarea } from "@/components/ui";

export default function LektionEditPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = String(params.id);
  const lessonParam = String(params.lessonId);
  const isNew = lessonParam === "neu";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/admin/course/modules/${moduleId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.module) setModuleTitle(d.module.title);
      });

    if (isNew) return;

    fetch(`/api/admin/course/modules/${moduleId}/lessons/${lessonParam}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setTitle(d.lesson.title);
        setContent(d.lesson.content);
        setLoading(false);
      })
      .catch(() => router.push(`/dashboard/inhalte/modul/${moduleId}`));
  }, [moduleId, lessonParam, isNew, router]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const url = isNew
      ? `/api/admin/course/modules/${moduleId}/lessons`
      : `/api/admin/course/modules/${moduleId}/lessons/${lessonParam}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setMessage("Lerninhalt gespeichert.");
    if (isNew) {
      router.push(
        `/dashboard/inhalte/modul/${moduleId}/lektion/${data.lesson.id}`
      );
    }
  }

  async function remove() {
    if (isNew) return;
    if (!confirm("Lerninhalt wirklich löschen?")) return;

    const res = await fetch(
      `/api/admin/course/modules/${moduleId}/lessons/${lessonParam}`,
      { method: "DELETE" }
    );
    if (res.ok) router.push(`/dashboard/inhalte/modul/${moduleId}`);
    else setError("Löschen fehlgeschlagen.");
  }

  if (loading && !isNew) {
    return (
      <div className="flex min-h-screen items-center justify-center">Lädt…</div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader title={isNew ? "Neuer Lerninhalt" : "Lerninhalt bearbeiten"} />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <AdminNav active="inhalte" />
        <Link
          href={`/dashboard/inhalte/modul/${moduleId}`}
          className="mb-1 inline-block text-sm font-medium text-brand hover:underline"
        >
          ← Zurück zu Modul{moduleTitle ? `: ${moduleTitle}` : ""}
        </Link>

        <Card className="mt-4">
          <div className="space-y-4">
            <Input
              label="Titel des Lerninhalts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Ziele des Sozialkonzeptes"
              required
            />
            <Textarea
              label="Inhalt"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              placeholder="Kurzer, verständlicher Text…"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Speichern…" : "Speichern"}
            </Button>
            {!isNew && (
              <Button variant="danger" onClick={remove} className="flex-1">
                Löschen
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

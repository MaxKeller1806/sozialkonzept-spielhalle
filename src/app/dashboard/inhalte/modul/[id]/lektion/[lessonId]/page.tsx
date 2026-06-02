"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import {
  createEmptyEditorBlock,
  LessonBlockEditor,
} from "@/components/lesson-block-editor";
import { LessonContent } from "@/components/lesson-content";
import { AppHeader, Button, Card, Input } from "@/components/ui";
import {
  editorRowsToLessonBlocks,
  lessonToEditorRows,
  normalizeLessonForSave,
  type EditorBlockRow,
} from "@/lib/lesson-blocks";
import type { Lesson } from "@/lib/types";

export default function LektionEditPage() {
  return (
    <Suspense fallback={<div className="p-8">Lädt…</div>}>
      <LektionEditContent />
    </Suspense>
  );
}

function LektionEditContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseQuery = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  const moduleId = String(params.id);
  const lessonParam = String(params.lessonId);
  const isNew = lessonParam === "neu";

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlockRow[]>([createEmptyEditorBlock("text")]);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/admin/course/modules/${moduleId}${courseQuery}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.module) setModuleTitle(d.module.title);
      });

    if (isNew) return;

    fetch(`/api/admin/course/modules/${moduleId}/lessons/${lessonParam}${courseQuery}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setTitle(d.lesson.title);
        const rows = lessonToEditorRows(d.lesson);
        setBlocks(rows.length > 0 ? rows : [createEmptyEditorBlock("text")]);
        setLoading(false);
      })
      .catch(() => router.push(`/dashboard/inhalte/modul/${moduleId}${courseQuery}`));
  }, [moduleId, lessonParam, isNew, router, courseQuery]);

  useEffect(() => {
    const contentBlocks = editorRowsToLessonBlocks(blocks);
    setPreviewLesson({
      id: Number(lessonParam) || 0,
      title: title || "Vorschau",
      content: "",
      blocks: contentBlocks.length > 0 ? contentBlocks : undefined,
    });
  }, [blocks, title, lessonParam]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    const lesson = normalizeLessonForSave(
      {
        id: isNew ? 0 : Number(lessonParam),
        title,
        blocks: editorRowsToLessonBlocks(blocks),
      },
      blocks
    );

    const url = isNew
      ? `/api/admin/course/modules/${moduleId}/lessons${courseQuery}`
      : `/api/admin/course/modules/${moduleId}/lessons/${lessonParam}${courseQuery}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lesson),
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
        `/dashboard/inhalte/modul/${moduleId}/lektion/${data.lesson.id}${courseQuery}`
      );
    }
  }

  async function remove() {
    if (isNew) return;
    if (!confirm("Lerninhalt wirklich löschen?")) return;

    const res = await fetch(
      `/api/admin/course/modules/${moduleId}/lessons/${lessonParam}${courseQuery}`,
      { method: "DELETE" }
    );
    if (res.ok) router.push(`/dashboard/inhalte/modul/${moduleId}${courseQuery}`);
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <AdminNav active="seminare" />
        <Link
          href={`/dashboard/inhalte/modul/${moduleId}${courseQuery}`}
          className="mb-1 inline-block text-sm font-medium text-brand hover:underline"
        >
          ← Zurück zu Modul{moduleTitle ? `: ${moduleTitle}` : ""}
        </Link>

        <Card className="mt-4">
          <p className="mb-4 text-sm text-slate-600">
            Strukturierte Inhaltsblöcke – dieselben Blöcke, die Mitarbeitende in der
            Schulung sehen.
          </p>
          <div className="space-y-4">
            <Input
              label="Titel des Lerninhalts"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Ziele des Sozialkonzeptes"
              required
            />
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Inhaltsblöcke</h3>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {showPreview ? "Vorschau ausblenden" : "Mitarbeiter-Vorschau"}
                </button>
              </div>
              <LessonBlockEditor blocks={blocks} onChange={setBlocks} />
            </div>
          </div>

          {showPreview && previewLesson && (
            <Card className="mt-6 border-brand-light bg-white">
              <h3 className="mb-2 text-sm font-semibold text-brand">Vorschau (Mitarbeiteransicht)</h3>
              <h2 className="text-lg font-bold">{previewLesson.title}</h2>
              <LessonContent lesson={previewLesson} />
            </Card>
          )}

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

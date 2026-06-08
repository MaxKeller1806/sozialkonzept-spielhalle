"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LessonSpeechRegister } from "@/components/lesson-speech-register";
import { PageHeader } from "@/components/page-header";
import {
  Button,
  ButtonLink,
  Card,
  ProgressBar,
} from "@/components/ui";
import { LessonContent } from "@/components/lesson-content";
import type { Lesson } from "@/lib/types";

export default function LektionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lektion wird geladen…</p>}>
      <LektionContent />
    </Suspense>
  );
}

function LektionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseQuery = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  const moduleId = Number(params.id);
  const lessonId = Number(params.lessonId);

  const [moduleTitle, setModuleTitle] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [globalIndex, setGlobalIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [totalLessons, setTotalLessons] = useState(1);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const url = courseId
      ? `/api/training?courseId=${encodeURIComponent(courseId)}`
      : "/api/training";

    fetch(url)
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error ?? "Laden fehlgeschlagen.");
        }
        return data;
      })
      .then((data) => {
        if (cancelled || !data) return;

        if (data.courses) {
          throw new Error("Bitte wählen Sie zuerst eine Schulung aus.");
        }

        const mod = data.course.modules.find(
          (m: { id: number }) => m.id === moduleId
        );
        if (!mod) {
          throw new Error("Modul nicht gefunden.");
        }

        setModuleTitle(mod.title);
        const current = (mod.lessons as Lesson[]).find((l) => l.id === lessonId);
        if (!current) {
          throw new Error("Lernschritt nicht gefunden.");
        }
        setLesson(current);

        const all = data.course.modules.flatMap(
          (m: { id: number; lessons: Lesson[] }) =>
            m.lessons.map((l) => ({ moduleId: m.id, lessonId: l.id }))
        );
        const idx = all.findIndex(
          (l: { moduleId: number; lessonId: number }) =>
            l.moduleId === moduleId && l.lessonId === lessonId
        );
        setGlobalIndex(idx >= 0 ? idx : 0);
        setTotalLessons(all.length);
        setCompletedLessons(data.attempt?.completedLessons ?? 0);

        if (idx > 0) {
          const prev = all[idx - 1];
          setPrevUrl(
            `/schulung/modul/${prev.moduleId}/lektion/${prev.lessonId}${courseQuery}`
          );
        } else {
          setPrevUrl(null);
        }

        if (idx < all.length - 1) {
          const next = all[idx + 1];
          setNextUrl(
            `/schulung/modul/${next.moduleId}/lektion/${next.lessonId}${courseQuery}`
          );
        } else {
          setNextUrl(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId, lessonId, router, courseId, courseQuery]);

  async function markComplete() {
    if (!courseId) {
      setError("Kurs-ID fehlt. Bitte über die Schulungsübersicht starten.");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/training/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, lessonId, courseId }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    if (nextUrl) {
      router.push(nextUrl);
    } else {
      router.push(`/schulung${courseQuery}`);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Lektion wird geladen…</p>;
  }

  if (error || !lesson) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-red-600" role="alert">
          {error ?? "Lernschritt konnte nicht geladen werden."}
        </p>
        <ButtonLink href={`/schulung${courseQuery}`} variant="secondary" className="mt-4">
          Zur Schulungsübersicht
        </ButtonLink>
      </div>
    );
  }

  const lessonKey = `${moduleId}:${lessonId}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={moduleTitle}
        actions={
          <ButtonLink href={`/schulung${courseQuery}`} variant="secondary">
            Zur Schulungsübersicht
          </ButtonLink>
        }
      />

      <div className="mb-4">
        <ProgressBar value={completedLessons} max={totalLessons} />
        <p className="mt-1 text-sm text-slate-600">
          Schritt {globalIndex + 1} von {totalLessons} · {completedLessons}{" "}
          abgeschlossen
        </p>
      </div>

      <Card>
        <h2 className="text-2xl font-bold">{lesson.title}</h2>

        <LessonSpeechRegister lesson={lesson} lessonKey={lessonKey} />

        <LessonContent lesson={lesson} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {prevUrl && (
            <ButtonLink href={prevUrl} variant="secondary" className="flex-1">
              Zurück
            </ButtonLink>
          )}
          <Button
            onClick={markComplete}
            disabled={saving}
            className="flex-1 w-full"
            aria-busy={saving}
          >
            {saving ? "Wird gespeichert…" : nextUrl ? "Weiter" : "Abschließen & zur Übersicht"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

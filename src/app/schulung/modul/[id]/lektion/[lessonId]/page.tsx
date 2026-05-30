"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LessonSpeechRegister } from "@/components/lesson-speech-register";
import {
  Button,
  ButtonLink,
  Card,
  EmployeeHeader,
  LoadingStatus,
  PageMain,
  ProgressBar,
} from "@/components/ui";
import { LessonContent } from "@/components/lesson-content";
import type { Lesson } from "@/lib/types";

export default function LektionPage() {
  const params = useParams();
  const router = useRouter();
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

  useEffect(() => {
    fetch("/api/training")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;

        const mod = data.course.modules.find(
          (m: { id: number }) => m.id === moduleId
        );
        if (!mod) {
          router.push("/schulung");
          return;
        }

        setModuleTitle(mod.title);
        const current = (mod.lessons as Lesson[]).find((l) => l.id === lessonId);
        if (!current) {
          router.push("/schulung");
          return;
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
            `/schulung/modul/${prev.moduleId}/lektion/${prev.lessonId}`
          );
        } else {
          setPrevUrl(null);
        }

        if (idx < all.length - 1) {
          const next = all[idx + 1];
          setNextUrl(
            `/schulung/modul/${next.moduleId}/lektion/${next.lessonId}`
          );
        } else {
          setNextUrl(null);
        }
      });
  }, [moduleId, lessonId, router]);

  async function markComplete() {
    setSaving(true);

    await fetch("/api/training/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, lessonId }),
    });

    setSaving(false);

    if (nextUrl) {
      router.push(nextUrl);
    } else {
      router.push("/schulung");
    }
  }

  if (!lesson) {
    return <LoadingStatus />;
  }

  const lessonKey = `${moduleId}:${lessonId}`;

  return (
    <div className="min-h-screen pb-12">
      <EmployeeHeader pageTitle={moduleTitle} />
      <PageMain className="mx-auto max-w-2xl px-4 py-8">
        <ButtonLink href="/schulung" variant="secondary" className="mb-4 w-auto">
          ← Zur Schulungsübersicht
        </ButtonLink>

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
      </PageMain>
    </div>
  );
}

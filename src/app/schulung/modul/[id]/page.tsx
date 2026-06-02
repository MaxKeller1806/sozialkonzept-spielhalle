"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoadingStatus, PageMain } from "@/components/ui";

export default function ModulOverviewPage() {
  return (
    <Suspense fallback={<LoadingStatus />}>
      <ModulOverviewContent />
    </Suspense>
  );
}

function ModulOverviewContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseQuery = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
  const moduleId = Number(params.id);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

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
          setError("Bitte wählen Sie zuerst eine Schulung aus.");
          router.replace("/schulung");
          return;
        }

        const nextUrl = data.attempt?.nextLessonUrl;
        if (nextUrl) {
          router.replace(nextUrl);
          return;
        }

        const mod = data.course?.modules?.find(
          (m: { id: number; lessons: { id: number }[] }) => m.id === moduleId
        );
        const first = mod?.lessons?.[0];
        if (first) {
          router.replace(
            `/schulung/modul/${moduleId}/lektion/${first.id}${courseQuery}`
          );
        } else {
          router.replace(`/schulung${courseQuery}`);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      });

    return () => {
      cancelled = true;
    };
  }, [moduleId, router, courseId, courseQuery]);

  if (error) {
    return (
      <PageMain className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-red-600" role="alert">
          {error}
        </p>
      </PageMain>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">Weiterleitung…</div>
  );
}

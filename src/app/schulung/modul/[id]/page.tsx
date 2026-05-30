"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ModulOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = Number(params.id);

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

        const nextUrl = data.attempt?.nextLessonUrl;
        if (nextUrl) {
          router.replace(nextUrl);
          return;
        }

        const mod = data.course.modules.find(
          (m: { id: number; lessons: { id: number }[] }) => m.id === moduleId
        );
        const first = mod?.lessons?.[0];
        if (first) {
          router.replace(`/schulung/modul/${moduleId}/lektion/${first.id}`);
        } else {
          router.replace("/schulung");
        }
      });
  }, [moduleId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">Weiterleitung…</div>
  );
}

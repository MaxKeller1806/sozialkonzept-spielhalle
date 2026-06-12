"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { courseInhalteHubHref } from "@/lib/course-inhalte-url";

export default function ModulEditPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-slate-600">Weiterleitung…</p>}>
      <ModulRedirect />
    </Suspense>
  );
}

function ModulRedirect() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const idParam = String(params.id);

  useEffect(() => {
    if (courseId) {
      router.replace(
        courseInhalteHubHref(courseId, { bereich: "module", modul: idParam })
      );
    } else {
      router.replace("/dashboard/inhalte");
    }
  }, [courseId, idParam, router]);

  return <p className="px-4 py-8 text-sm text-slate-600">Weiterleitung…</p>;
}

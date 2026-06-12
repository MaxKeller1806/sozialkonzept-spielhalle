"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { courseInhalteHubHref } from "@/lib/course-inhalte-url";

/** Weiterleitung zur zentralen Seminarbearbeitung. */
export default function SeminarDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = decodeURIComponent(String(params.courseId ?? ""));

  useEffect(() => {
    if (!courseId) {
      router.replace("/dashboard/seminare");
      return;
    }
    router.replace(courseInhalteHubHref(courseId));
  }, [courseId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-600">
      Weiterleitung zur Seminarbearbeitung…
    </div>
  );
}

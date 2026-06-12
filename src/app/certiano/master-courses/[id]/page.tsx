"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { courseInhalteHubHref } from "@/lib/course-inhalte-url";

/** Weiterleitung zur zentralen Master-Inhaltsbearbeitung. */
export default function MasterCourseRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = decodeURIComponent(String(params.id ?? ""));

  useEffect(() => {
    if (!courseId) {
      router.replace("/certiano/master-courses");
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

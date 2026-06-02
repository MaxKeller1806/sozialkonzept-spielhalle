"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Weiterleitung zur seminarbezogenen Inhaltsbearbeitung. */
export default function SeminarInhalteRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = decodeURIComponent(String(params.courseId));

  useEffect(() => {
    router.replace(`/dashboard/inhalte?courseId=${encodeURIComponent(courseId)}`);
  }, [courseId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-600">
      Weiterleitung zu den Seminarinhalten…
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterCourseForEmployeePreview,
  type AdminPreviewContentStates,
} from "@/lib/admin-course-preview";
import type { CourseData } from "@/lib/types";

type PreviewPermissions = {
  readOnly?: boolean;
  fromMaster?: boolean;
};

type PreviewState = {
  course: CourseData | null;
  previewCourse: CourseData | null;
  contentStates: AdminPreviewContentStates | null;
  permissions: PreviewPermissions;
  loading: boolean;
  error: string;
  reload: () => void;
};

export function useAdminCoursePreview(courseId: string): PreviewState {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [contentStates, setContentStates] =
    useState<AdminPreviewContentStates | null>(null);
  const [permissions, setPermissions] = useState<PreviewPermissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ courseId });
    fetch(`/api/admin/course?${params}`)
      .then(async (r) => {
        if (r.status === 401) {
          window.location.replace("/login");
          return null;
        }
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data.error ?? "Kurs konnte nicht geladen werden.");
        }
        return data;
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (data.error) {
          throw new Error(data.error);
        }
        setCourse(data.course ?? null);
        setContentStates(data.contentStates ?? null);
        setPermissions(data.permissions ?? {});
      })
      .catch((e) => {
        if (cancelled) return;
        setCourse(null);
        setContentStates(null);
        setError(
          e instanceof Error ? e.message : "Kurs konnte nicht geladen werden."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, reloadToken]);

  const previewCourse = useMemo(
    () => (course ? filterCourseForEmployeePreview(course, contentStates) : null),
    [course, contentStates]
  );

  return {
    course,
    previewCourse,
    contentStates,
    permissions,
    loading,
    error,
    reload,
  };
}

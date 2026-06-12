"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SidebarNavItem } from "@/components/shell/sidebar-nav";
import {
  activeCourseIdFromLocation,
  buildCurrentSeminarSidebarTrail,
  isSeminarEditorContext,
  mergeSeminarSidebarItems,
  primaryTopicInfo,
} from "@/lib/seminar-sidebar-nav";
import { parseInhalteBereich, type InhalteBereich } from "@/lib/course-inhalte-url";

type SeminarNavContext = {
  courseTitle: string;
  topicLabel: string;
  topicId: number | null;
};

type Options = {
  baseItems: SidebarNavItem[];
  seminarItemLabel: string;
};

async function loadSeminarNavContext(courseId: string): Promise<SeminarNavContext> {
  const encId = encodeURIComponent(courseId);
  const isMaster = courseId.startsWith("master-");

  if (isMaster) {
    const res = await fetch(`/api/superuser/master-courses/${encId}`);
    const d = await res.json().catch(() => ({}));
    const meta = d.meta ?? {};
    const topic = primaryTopicInfo(meta.topics, meta.topicName, meta.topicId);
    return {
      courseTitle: String(meta.title ?? d.course?.courseName ?? "Seminar"),
      topicLabel: topic.label,
      topicId: topic.topicId,
    };
  }

  const res = await fetch(`/api/admin/courses/${encId}`);
  const d = await res.json().catch(() => ({}));
  const course = d.course ?? {};
  const topic = primaryTopicInfo(course.topics, course.topicName, course.topicId);
  return {
    courseTitle: String(course.title ?? "Seminar"),
    topicLabel: topic.label,
    topicId: topic.topicId,
  };
}

export function useSeminarSidebarNav({
  baseItems,
  seminarItemLabel,
}: Options): SidebarNavItem[] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const bereichParam = parseInhalteBereich(searchParams.get("bereich"));
  const modulParam = searchParams.get("modul");
  const courseId = activeCourseIdFromLocation(pathname, courseIdParam);

  const effectiveBereich: InhalteBereich = pathname.startsWith(
    "/dashboard/inhalte/frage/"
  )
    ? "fragen"
    : pathname.match(/^\/dashboard\/inhalte\/modul\/[^/]+\/lektion/)
      ? "module"
      : bereichParam;
  const [context, setContext] = useState<SeminarNavContext | null>(null);

  const inEditorContext = isSeminarEditorContext(pathname, courseIdParam);

  useEffect(() => {
    if (!inEditorContext || !courseId) {
      setContext(null);
      return;
    }

    let cancelled = false;

    loadSeminarNavContext(courseId)
      .then((loaded) => {
        if (!cancelled) setContext(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setContext({
            courseTitle: "Seminar",
            topicLabel: "Ohne Hauptthema",
            topicId: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, inEditorContext]);

  return useMemo(() => {
    if (!inEditorContext || !courseId || !context) {
      return mergeSeminarSidebarItems(baseItems, seminarItemLabel, undefined);
    }

    const mode = courseId.startsWith("master-") ? "superuser" : "admin";
    const children = buildCurrentSeminarSidebarTrail({
      mode,
      courseId,
      courseTitle: context.courseTitle,
      topicLabel: context.topicLabel,
      topicId: context.topicId,
      pathname,
      courseIdParam,
      bereichParam: effectiveBereich,
      modulParam:
        modulParam ??
        (pathname.match(/^\/dashboard\/inhalte\/modul\/([^/]+)\/lektion/)
          ? decodeURIComponent(pathname.match(/^\/dashboard\/inhalte\/modul\/([^/]+)\/lektion/)![1])
          : null),
    });

    return mergeSeminarSidebarItems(baseItems, seminarItemLabel, children);
  }, [
    baseItems,
    seminarItemLabel,
    inEditorContext,
    courseId,
    context,
    pathname,
    courseIdParam,
    bereichParam,
    effectiveBereich,
    modulParam,
  ]);
}

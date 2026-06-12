"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SidebarNavItem } from "@/components/shell/sidebar-nav";
import {
  buildEmployeeTrainingSidebarTrail,
  isEmployeeTrainingContext,
  mergeEmployeeTrainingSidebarItems,
  primaryTopicInfo,
} from "@/lib/employee-sidebar-nav";

type TrainingNavContext = {
  courseTitle: string;
  topicLabel: string;
};

type Options = {
  baseItems: SidebarNavItem[];
  trainingItemLabel: string;
};

async function loadEmployeeNavContext(
  courseId: string
): Promise<TrainingNavContext> {
  const encId = encodeURIComponent(courseId);
  const [listRes, courseRes] = await Promise.all([
    fetch("/api/training"),
    fetch(`/api/training?courseId=${encId}`),
  ]);

  const listData = await listRes.json().catch(() => ({}));
  const courseData = await courseRes.json().catch(() => ({}));
  const fromList = (listData.courses ?? []).find(
    (c: { id: string }) => c.id === courseId
  );
  const topic = primaryTopicInfo(
    fromList?.topics,
    fromList?.topicName,
    fromList?.topicId
  );

  return {
    courseTitle: String(
      courseData.course?.name ?? fromList?.title ?? "Schulung"
    ),
    topicLabel: topic.label,
  };
}

export function useEmployeeTrainingSidebarNav({
  baseItems,
  trainingItemLabel,
}: Options): SidebarNavItem[] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const inTrainingContext = isEmployeeTrainingContext(pathname, courseIdParam);
  const [context, setContext] = useState<TrainingNavContext | null>(null);

  useEffect(() => {
    if (!inTrainingContext || !courseIdParam) {
      setContext(null);
      return;
    }

    let cancelled = false;

    loadEmployeeNavContext(courseIdParam)
      .then((loaded) => {
        if (!cancelled) setContext(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setContext({
            courseTitle: "Schulung",
            topicLabel: "Meine Schulungen",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseIdParam, inTrainingContext]);

  return useMemo(() => {
    if (!inTrainingContext || !courseIdParam || !context) {
      return mergeEmployeeTrainingSidebarItems(
        baseItems,
        trainingItemLabel,
        undefined
      );
    }

    const children = buildEmployeeTrainingSidebarTrail({
      courseId: courseIdParam,
      courseTitle: context.courseTitle,
      topicLabel: context.topicLabel,
      pathname,
      courseIdParam,
    });

    return mergeEmployeeTrainingSidebarItems(
      baseItems,
      trainingItemLabel,
      children
    );
  }, [
    baseItems,
    trainingItemLabel,
    inTrainingContext,
    courseIdParam,
    context,
    pathname,
  ]);
}

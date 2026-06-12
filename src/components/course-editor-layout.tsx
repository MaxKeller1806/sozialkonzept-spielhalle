"use client";

import { CourseBreadcrumb } from "@/components/course-breadcrumb";
import { CourseHubNav } from "@/components/course-hub-tabs";
import { PageHeader } from "@/components/page-header";
import { courseHubBreadcrumb } from "@/lib/course-editor-breadcrumbs";
import { isMasterCourseId } from "@/lib/course-editor-id";
import type { InhalteBereich } from "@/lib/course-inhalte-url";

type Props = {
  courseId: string;
  courseName: string;
  bereich: InhalteBereich;
  title: string;
  children: React.ReactNode;
};

/** Gemeinsamer Rahmen für Seminar-Detailseiten (Lektion, Frage) – Admin & Superuser. */
export function CourseEditorLayout({
  courseId,
  courseName,
  bereich,
  title,
  children,
}: Props) {
  const isMaster = isMasterCourseId(courseId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title={title} />
      <CourseBreadcrumb items={courseHubBreadcrumb(courseId, courseName, bereich)} />
      <CourseHubNav
        courseId={courseId}
        active={bereich}
        showVorschauLink={!isMaster && bereich === "uebersicht"}
        vorschauHref={
          !isMaster
            ? `/dashboard/seminare/${encodeURIComponent(courseId)}/vorschau`
            : undefined
        }
      />
      {children}
    </div>
  );
}

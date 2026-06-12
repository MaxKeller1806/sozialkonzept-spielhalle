import { isMasterCourseId } from "./course-editor-id";
import type { CourseBreadcrumbItem } from "@/components/course-breadcrumb";
import {
  courseInhalteHubHref,
  INHALTE_BEREICH_LABELS,
  type InhalteBereich,
} from "./course-inhalte-url";

export function courseListCrumb(courseId: string): CourseBreadcrumbItem {
  return isMasterCourseId(courseId)
    ? { label: "Masterseminare", href: "/certiano/master-courses" }
    : { label: "Seminarverwaltung", href: "/dashboard/seminare" };
}

export function courseMetaCrumb(
  courseId: string,
  courseName: string
): CourseBreadcrumbItem {
  return {
    label: courseName,
    href: courseInhalteHubHref(courseId, { bereich: "uebersicht" }),
  };
}

export function courseHubBreadcrumb(
  courseId: string,
  courseName: string,
  bereich: InhalteBereich
): CourseBreadcrumbItem[] {
  return [
    courseListCrumb(courseId),
    courseMetaCrumb(courseId, courseName),
    { label: INHALTE_BEREICH_LABELS[bereich] },
  ];
}

/** @deprecated Use courseHubBreadcrumb */
export function courseInhalteCrumb(
  courseId: string,
  courseName: string
): CourseBreadcrumbItem[] {
  return courseHubBreadcrumb(courseId, courseName, "uebersicht");
}

export function courseModulCrumb(
  courseId: string,
  courseName: string,
  moduleLabel: string
): CourseBreadcrumbItem[] {
  return [
    courseListCrumb(courseId),
    courseMetaCrumb(courseId, courseName),
    {
      label: "Module",
      href: courseInhalteHubHref(courseId, { bereich: "module" }),
    },
    { label: moduleLabel },
  ];
}

export function courseLessonCrumb(
  courseId: string,
  courseName: string,
  moduleId: number,
  lessonLabel: string
): CourseBreadcrumbItem[] {
  return [
    courseListCrumb(courseId),
    courseMetaCrumb(courseId, courseName),
    {
      label: "Module",
      href: courseInhalteHubHref(courseId, { bereich: "module" }),
    },
    {
      label: `Modul ${moduleId}`,
      href: courseInhalteHubHref(courseId, { bereich: "module", modul: moduleId }),
    },
    { label: lessonLabel },
  ];
}

export function courseQuestionCrumb(
  courseId: string,
  courseName: string,
  questionLabel: string
): CourseBreadcrumbItem[] {
  return [
    courseListCrumb(courseId),
    courseMetaCrumb(courseId, courseName),
    {
      label: "Prüfungsfragen",
      href: courseInhalteHubHref(courseId, { bereich: "fragen" }),
    },
    { label: questionLabel },
  ];
}

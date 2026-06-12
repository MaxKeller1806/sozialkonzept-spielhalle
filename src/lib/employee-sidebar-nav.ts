import type { SidebarNavChildItem } from "@/components/shell/sidebar-nav";
import { primaryTopicInfo } from "@/lib/seminar-sidebar-nav";
import { mergeSidebarItemChildren } from "@/lib/sidebar-nav-merge";

function enc(value: string): string {
  return encodeURIComponent(value);
}

export type EmployeeTrainingSegment =
  | { type: "hub" }
  | { type: "modul"; moduleId: string }
  | { type: "lektion"; moduleId: string; lessonId: string }
  | { type: "pruefung" }
  | { type: "ergebnis" }
  | { type: "feedback" };

export function isEmployeeTrainingContext(
  pathname: string,
  courseIdParam: string | null
): boolean {
  if (courseIdParam) return true;
  if (pathname.startsWith("/schulung/modul/")) return true;
  if (pathname.startsWith("/schulung/pruefung")) return true;
  if (pathname.startsWith("/schulung/ergebnis")) return true;
  if (pathname.startsWith("/schulung/feedback")) return true;
  return false;
}

export function parseEmployeeTrainingSegment(pathname: string): EmployeeTrainingSegment {
  const lektion = pathname.match(/^\/schulung\/modul\/([^/]+)\/lektion\/([^/]+)/);
  if (lektion) {
    return {
      type: "lektion",
      moduleId: decodeURIComponent(lektion[1]),
      lessonId: decodeURIComponent(lektion[2]),
    };
  }

  const modul = pathname.match(/^\/schulung\/modul\/([^/]+)/);
  if (modul) {
    return { type: "modul", moduleId: decodeURIComponent(modul[1]) };
  }

  if (pathname.startsWith("/schulung/pruefung")) return { type: "pruefung" };
  if (pathname.startsWith("/schulung/ergebnis")) return { type: "ergebnis" };
  if (pathname.startsWith("/schulung/feedback")) return { type: "feedback" };
  return { type: "hub" };
}

function courseContextPaths(): string[] {
  return [
    "/schulung",
    "/schulung/modul/",
    "/schulung/pruefung",
    "/schulung/ergebnis",
    "/schulung/feedback",
  ];
}

function isCourseContextPath(pathname: string, courseIdParam: string | null): boolean {
  if (!courseIdParam) return false;
  return courseContextPaths().some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

function courseQuery(courseId: string): string {
  return `?courseId=${enc(courseId)}`;
}

function courseHubHref(courseId: string): string {
  return `/schulung${courseQuery(courseId)}`;
}

function buildCourseDepthItems(options: {
  courseId: string;
  courseTitle: string;
  pathname: string;
  courseIdParam: string | null;
}): SidebarNavChildItem[] {
  const { courseId, courseTitle, pathname, courseIdParam } = options;
  const segment = parseEmployeeTrainingSegment(pathname);
  const cq = courseQuery(courseId);

  const sectionItems: SidebarNavChildItem[] = [
    {
      href: courseHubHref(courseId),
      label: "Übersicht",
      match: (p) =>
        p === "/schulung" &&
        courseIdParam === courseId &&
        segment.type === "hub",
    },
    {
      href: `/schulung/pruefung${cq}`,
      label: "Abschlusstest",
      match: (p) => p.startsWith("/schulung/pruefung") && courseIdParam === courseId,
    },
  ];

  const contextItems: SidebarNavChildItem[] = [];

  if (segment.type === "modul" || segment.type === "lektion") {
    contextItems.push({
      href: `/schulung/modul/${enc(segment.moduleId)}${cq}`,
      label: `Modul ${segment.moduleId}`,
      match: (p) => {
        const s = parseEmployeeTrainingSegment(p);
        return (
          courseIdParam === courseId &&
          (s.type === "modul" || s.type === "lektion") &&
          s.moduleId === segment.moduleId
        );
      },
    });
  }

  if (segment.type === "lektion") {
    contextItems.push({
      href: `/schulung/modul/${enc(segment.moduleId)}/lektion/${enc(segment.lessonId)}${cq}`,
      label: "Lerninhalt",
      match: (p) => {
        const s = parseEmployeeTrainingSegment(p);
        return (
          s.type === "lektion" &&
          s.moduleId === segment.moduleId &&
          s.lessonId === segment.lessonId &&
          courseIdParam === courseId
        );
      },
    });
  }

  if (segment.type === "ergebnis") {
    contextItems.push({
      href: `/schulung/ergebnis${cq}`,
      label: "Ergebnis",
      match: (p) => p.startsWith("/schulung/ergebnis") && courseIdParam === courseId,
    });
  }

  if (segment.type === "feedback") {
    contextItems.push({
      href: `/schulung/feedback${cq}`,
      label: "Rückmeldung",
      match: (p) => p.startsWith("/schulung/feedback") && courseIdParam === courseId,
    });
  }

  return [
    {
      href: courseHubHref(courseId),
      label: courseTitle,
      match: (p) => isCourseContextPath(p, courseIdParam) && courseIdParam === courseId,
      children: [...sectionItems, ...contextItems],
    },
  ];
}

export function buildEmployeeTrainingSidebarTrail(options: {
  courseId: string;
  courseTitle: string;
  topicLabel: string;
  pathname: string;
  courseIdParam: string | null;
}): SidebarNavChildItem[] {
  const { courseId, courseTitle, topicLabel, pathname, courseIdParam } = options;

  const courseChildren = buildCourseDepthItems({
    courseId,
    courseTitle,
    pathname,
    courseIdParam,
  });

  return [
    {
      href: "/schulung",
      label: topicLabel,
      match: (p) => p === "/schulung" && !courseIdParam,
      children: courseChildren,
    },
  ];
}

export function mergeEmployeeTrainingSidebarItems(
  items: import("@/components/shell/sidebar-nav").SidebarNavItem[],
  trainingItemLabel: string,
  children: SidebarNavChildItem[] | undefined
) {
  return mergeSidebarItemChildren(items, trainingItemLabel, children);
}

export { primaryTopicInfo };

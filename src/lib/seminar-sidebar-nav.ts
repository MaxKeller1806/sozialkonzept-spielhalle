import type { SidebarNavChildItem } from "@/components/shell/sidebar-nav";
import { mergeSidebarItemChildren } from "@/lib/sidebar-nav-merge";
import { UNCategorized_TOPIC_LABEL } from "@/lib/course-hierarchy";
import {
  courseInhalteHubHref,
  INHALTE_BEREICH_LABELS,
  parseInhalteBereich,
  type InhalteBereich,
} from "@/lib/course-inhalte-url";
import { isMasterCourseId } from "./course-editor-id";

function enc(value: string): string {
  return encodeURIComponent(value);
}

export type SeminarEditorSegment =
  | { type: "hub" }
  | { type: "modul"; moduleId: string }
  | { type: "lektion"; moduleId: string; lessonId: string }
  | { type: "frage"; questionId: string }
  | { type: "vorschau" };

export function activeCourseIdFromLocation(
  pathname: string,
  courseIdParam: string | null
): string | null {
  if (courseIdParam) return courseIdParam;
  const previewMatch = pathname.match(/^\/dashboard\/seminare\/([^/]+)\/vorschau/);
  if (previewMatch?.[1]) {
    try {
      return decodeURIComponent(previewMatch[1]);
    } catch {
      return previewMatch[1];
    }
  }
  return null;
}

export function parseSeminarEditorSegment(
  pathname: string,
  modulParam?: string | null
): SeminarEditorSegment {
  const vorschau = pathname.match(/^\/dashboard\/seminare\/[^/]+\/vorschau/);
  if (vorschau) return { type: "vorschau" };

  const lektion = pathname.match(
    /^\/dashboard\/inhalte\/modul\/([^/]+)\/lektion\/([^/]+)/
  );
  if (lektion) {
    return {
      type: "lektion",
      moduleId: decodeURIComponent(lektion[1]),
      lessonId: decodeURIComponent(lektion[2]),
    };
  }

  const modul = pathname.match(/^\/dashboard\/inhalte\/modul\/([^/]+)/);
  if (modul) {
    return { type: "modul", moduleId: decodeURIComponent(modul[1]) };
  }

  const frage = pathname.match(/^\/dashboard\/inhalte\/frage\/([^/]+)/);
  if (frage) {
    return { type: "frage", questionId: decodeURIComponent(frage[1]) };
  }

  if (pathname.startsWith("/dashboard/inhalte")) {
    if (modulParam) {
      return { type: "modul", moduleId: modulParam };
    }
    return { type: "hub" };
  }

  return { type: "hub" };
}

export function isSeminarEditorContext(
  pathname: string,
  courseIdParam: string | null
): boolean {
  const courseId = activeCourseIdFromLocation(pathname, courseIdParam);
  if (!courseId) return false;
  if (pathname.startsWith("/dashboard/inhalte")) return true;
  if (pathname.match(/^\/dashboard\/seminare\/[^/]+\/vorschau/)) return true;
  return false;
}

export function primaryTopicLabel(
  topics?: { id: number; name: string }[],
  topicName?: string | null
): string {
  return primaryTopicInfo(topics, topicName).label;
}

export function primaryTopicInfo(
  topics?: { id: number; name: string }[],
  topicName?: string | null,
  topicId?: number | null
): { label: string; topicId: number | null } {
  if (topics && topics.length > 0) {
    const sorted = [...topics].sort((a, b) => a.name.localeCompare(b.name, "de"));
    return { label: sorted[0].name, topicId: sorted[0].id };
  }
  if (topicId != null && topicId > 0) {
    return {
      label: topicName?.trim() || UNCategorized_TOPIC_LABEL,
      topicId,
    };
  }
  if (topicName?.trim()) {
    return { label: topicName.trim(), topicId: null };
  }
  return { label: UNCategorized_TOPIC_LABEL, topicId: null };
}

function topicListHref(mode: "admin" | "superuser", topicId: number | null): string {
  const base = mode === "superuser" ? "/certiano/master-courses" : "/dashboard/seminare";
  if (topicId != null && topicId > 0) {
    return `${base}?topicId=${topicId}`;
  }
  return base;
}

function hubHref(courseId: string): string {
  return courseInhalteHubHref(courseId, { bereich: "uebersicht" });
}

function moduleHubHref(courseId: string, moduleId: string): string {
  return courseInhalteHubHref(courseId, { bereich: "module", modul: moduleId });
}

const SIDEBAR_BEREICHE: InhalteBereich[] = [
  "uebersicht",
  "module",
  "fragen",
  "export",
  "einstellungen",
];

function matchInhalteBereich(
  pathname: string,
  courseIdParam: string | null,
  courseId: string,
  bereich: InhalteBereich,
  bereichParam: InhalteBereich
): boolean {
  return (
    pathname === "/dashboard/inhalte" &&
    activeCourseIdFromLocation(pathname, courseIdParam) === courseId &&
    bereichParam === bereich
  );
}

function buildBereichNavItems(
  courseId: string,
  courseIdParam: string | null,
  bereichParam: InhalteBereich
): SidebarNavChildItem[] {
  return SIDEBAR_BEREICHE.map((bereich) => ({
    href: courseInhalteHubHref(courseId, { bereich }),
    label: INHALTE_BEREICH_LABELS[bereich],
    match: (p) => {
      if (
        bereich === "fragen" &&
        p.startsWith("/dashboard/inhalte/frage/") &&
        activeCourseIdFromLocation(p, courseIdParam) === courseId
      ) {
        return true;
      }
      if (
        bereich === "module" &&
        /^\/dashboard\/inhalte\/modul\/[^/]+\/lektion/.test(p) &&
        activeCourseIdFromLocation(p, courseIdParam) === courseId
      ) {
        return true;
      }
      return matchInhalteBereich(p, courseIdParam, courseId, bereich, bereichParam);
    },
  }));
}

function buildSeminarDepthItems(options: {
  mode: "admin" | "superuser";
  courseId: string;
  courseTitle: string;
  pathname: string;
  courseIdParam: string | null;
  bereichParam: InhalteBereich;
  modulParam?: string | null;
}): SidebarNavChildItem[] {
  const { mode, courseId, courseTitle, pathname, courseIdParam, bereichParam, modulParam } =
    options;
  const segment = parseSeminarEditorSegment(pathname, modulParam);

  const bereichItems = buildBereichNavItems(
    courseId,
    courseIdParam,
    bereichParam
  );

  const contextItems: SidebarNavChildItem[] = [];

  if (
    bereichParam === "module" &&
    modulParam &&
    segment.type !== "lektion" &&
    segment.type !== "frage"
  ) {
    const openModul = modulParam;
    contextItems.push({
      href: moduleHubHref(courseId, openModul),
      label: openModul === "neu" ? "Neues Modul" : `Modul ${openModul}`,
      match: (p) =>
        p === "/dashboard/inhalte" &&
        bereichParam === "module" &&
        activeCourseIdFromLocation(p, courseIdParam) === courseId,
    });
  }

  if (segment.type === "lektion") {
    contextItems.push({
      href: moduleHubHref(courseId, segment.moduleId),
      label: `Modul ${segment.moduleId}`,
      match: (p) => {
        const s = parseSeminarEditorSegment(p);
        return (
          activeCourseIdFromLocation(p, courseIdParam) === courseId &&
          (s.type === "lektion" || s.type === "modul") &&
          s.moduleId === segment.moduleId
        );
      },
    });
    contextItems.push({
      href: `/dashboard/inhalte/modul/${enc(segment.moduleId)}/lektion/${enc(segment.lessonId)}?courseId=${enc(courseId)}`,
      label: segment.lessonId === "neu" ? "Neuer Lerninhalt" : "Lerninhalt",
      match: (p) => {
        const s = parseSeminarEditorSegment(p);
        return (
          s.type === "lektion" &&
          s.moduleId === segment.moduleId &&
          s.lessonId === segment.lessonId &&
          activeCourseIdFromLocation(p, courseIdParam) === courseId
        );
      },
    });
  }

  if (segment.type === "frage") {
    contextItems.push({
      href: `/dashboard/inhalte/frage/${enc(segment.questionId)}?courseId=${enc(courseId)}`,
      label: segment.questionId === "neu" ? "Neue Frage" : "Prüfungsfrage",
      match: (p) => {
        const s = parseSeminarEditorSegment(p);
        return (
          s.type === "frage" &&
          s.questionId === segment.questionId &&
          activeCourseIdFromLocation(p, courseIdParam) === courseId
        );
      },
    });
  }

  if (mode === "admin" && segment.type !== "vorschau") {
    contextItems.push({
      href: `/dashboard/seminare/${enc(courseId)}/vorschau`,
      label: "Vorschau",
      match: (p) => p.startsWith(`/dashboard/seminare/${enc(courseId)}/vorschau`),
    });
  }

  if (segment.type === "vorschau") {
    contextItems.push({
      href: `/dashboard/seminare/${enc(courseId)}/vorschau`,
      label: "Vorschau",
      match: (p) => p.startsWith(`/dashboard/seminare/${enc(courseId)}/vorschau`),
    });
  }

  return [
    {
      href: hubHref(courseId),
      label: courseTitle,
      match: (p) =>
        activeCourseIdFromLocation(p, courseIdParam) === courseId &&
        (p === "/dashboard/inhalte" ||
          p.startsWith("/dashboard/inhalte/modul/") ||
          p.startsWith("/dashboard/inhalte/frage/")),
      children: [...bereichItems, ...contextItems],
    },
  ];
}

/** Kontext-Pfad: Hauptthema → Seminar → ggf. Modul/Lektion (ohne Zurück-Button). */
export function buildCurrentSeminarSidebarTrail(options: {
  mode: "admin" | "superuser";
  courseId: string;
  courseTitle: string;
  topicLabel: string;
  topicId: number | null;
  pathname: string;
  courseIdParam: string | null;
  bereichParam?: InhalteBereich;
  modulParam?: string | null;
}): SidebarNavChildItem[] {
  const {
    courseId,
    courseTitle,
    topicLabel,
    topicId,
    pathname,
    courseIdParam,
    mode,
    bereichParam = "uebersicht",
    modulParam,
  } = options;

  const seminarChildren = buildSeminarDepthItems({
    mode,
    courseId,
    courseTitle,
    pathname,
    courseIdParam,
    bereichParam,
    modulParam,
  });

  const topicHref = topicListHref(mode, topicId);

  return [
    {
      href: topicHref,
      label: topicLabel,
      match: (p) => {
        const listPath =
          mode === "superuser" ? "/certiano/master-courses" : "/dashboard/seminare";
        return p === listPath;
      },
      children: seminarChildren,
    },
  ];
}

export function mergeSeminarSidebarItems(
  items: import("@/components/shell/sidebar-nav").SidebarNavItem[],
  seminarItemLabel: string,
  children: SidebarNavChildItem[] | undefined
): import("@/components/shell/sidebar-nav").SidebarNavItem[] {
  return mergeSidebarItemChildren(items, seminarItemLabel, children);
}

export { isMasterCourseId };

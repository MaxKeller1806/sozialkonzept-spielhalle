"use client";

import Link from "next/link";
import {
  courseInhalteHubHref,
  INHALTE_BEREICH_LABELS,
  type InhalteBereich,
} from "@/lib/course-inhalte-url";

const BEREICHE: InhalteBereich[] = [
  "uebersicht",
  "module",
  "fragen",
  "export",
  "einstellungen",
];

export function CourseHubNav({
  courseId,
  active,
  showVorschauLink,
  vorschauHref,
}: {
  courseId: string;
  active: InhalteBereich;
  showVorschauLink?: boolean;
  vorschauHref?: string;
}) {
  return (
    <nav
      aria-label="Seminarbereiche"
      className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"
    >
      {BEREICHE.map((bereich) => {
        const isActive = bereich === active;
        return (
          <Link
            key={bereich}
            href={courseInhalteHubHref(courseId, { bereich })}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-brand-light text-brand"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {INHALTE_BEREICH_LABELS[bereich]}
          </Link>
        );
      })}
      {showVorschauLink && vorschauHref ? (
        <a
          href={vorschauHref}
          className="ml-auto text-sm text-brand hover:underline"
        >
          Mitarbeiter-Vorschau →
        </a>
      ) : null}
    </nav>
  );
}

/** @deprecated Use InhalteBereich from course-inhalte-url */
export type HubTab = InhalteBereich;

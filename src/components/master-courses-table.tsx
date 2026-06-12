"use client";

import { CollapsibleTopicSection } from "@/components/collapsible-topic-section";
import Link from "next/link";
import { courseInhalteHubHref } from "@/lib/course-inhalte-url";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { CourseTitleDisplay } from "@/components/course-title-display";
import {
  groupCoursesByTopic,
  UNCategorized_TOPIC_LABEL,
  type CourseTopicGroup,
} from "@/lib/course-hierarchy";

type MasterCourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  validityLabel?: string;
  instructionCode?: string | null;
  topicIds?: number[];
  topics?: { id: number; name: string }[];
  topicName?: string | null;
  topicSortOrder?: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  onDelete: (course: MasterCourseRow) => void;
  onReactivate: (course: MasterCourseRow) => void;
  refreshKey?: number;
};

function formatMasterStatus(status: string): string {
  if (status === "disabled") return "Deaktiviert";
  if (status === "published") return "Veröffentlicht";
  if (status === "draft") return "Entwurf";
  if (status === "active") return "Aktiv";
  return status;
}

function matchesSearch(course: MasterCourseRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    course.title.toLowerCase().includes(q) ||
    (course.instructionCode?.toLowerCase().includes(q) ?? false) ||
    (course.topicName?.toLowerCase().includes(q) ?? false) ||
    (course.topics?.some((t) => t.name.toLowerCase().includes(q)) ?? false)
  );
}

function MasterCourseRowActions({
  course,
  onDelete,
  onReactivate,
}: {
  course: MasterCourseRow;
  onDelete: (course: MasterCourseRow) => void;
  onReactivate: (course: MasterCourseRow) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <Link
        href={courseInhalteHubHref(course.id)}
        className="text-brand hover:underline"
      >
        Bearbeiten
      </Link>
      <button
        type="button"
        onClick={() => onDelete(course)}
        className="text-left text-red-700 hover:underline"
      >
        Löschen
      </button>
      {course.status === "disabled" ? (
        <button
          type="button"
          onClick={() => onReactivate(course)}
          className="text-left text-slate-600 hover:underline"
        >
          Reaktivieren
        </button>
      ) : null}
    </div>
  );
}

function TopicSection({
  group,
  defaultOpen,
  search,
  onDelete,
  onReactivate,
}: {
  group: CourseTopicGroup<MasterCourseRow>;
  defaultOpen: boolean;
  search: string;
  onDelete: (course: MasterCourseRow) => void;
  onReactivate: (course: MasterCourseRow) => void;
}) {
  const visible = group.courses.filter((c) => matchesSearch(c, search));

  return (
    <CollapsibleTopicSection
      title={group.name}
      count={visible.length}
      countLabel={(n) => `${n} Master-Seminar${n === 1 ? "" : "e"}`}
      defaultOpen={defaultOpen}
    >
      <ul className="divide-y divide-slate-100">
        {visible.map((course) => (
          <li key={course.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">
                  <CourseTitleDisplay
                    code={course.instructionCode}
                    title={course.title}
                  />
                  {course.status === "disabled" && (
                    <span className="ml-2 text-xs text-amber-700">(deaktiviert)</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatMasterStatus(course.status)}
                  {course.validityLabel ? ` · ${course.validityLabel}` : ""}
                </p>
              </div>
              <MasterCourseRowActions
                course={course}
                onDelete={onDelete}
                onReactivate={onReactivate}
              />
            </div>
          </li>
        ))}
      </ul>
    </CollapsibleTopicSection>
  );
}

function MasterCoursesTableInner({
  onDelete,
  onReactivate,
  refreshKey = 0,
}: Props) {
  const searchParams = useSearchParams();
  const initialTopicId = searchParams.get("topicId");
  const [courses, setCourses] = useState<MasterCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "disabled" | "all">("active");
  const [topicId, setTopicId] = useState<number | "">(
    initialTopicId && Number.isFinite(Number(initialTopicId))
      ? Number(initialTopicId)
      : ""
  );

  useEffect(() => {
    const fromUrl = searchParams.get("topicId");
    if (fromUrl && Number.isFinite(Number(fromUrl))) {
      setTopicId(Number(fromUrl));
    }
  }, [searchParams]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/superuser/master-courses")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          window.location.replace("/certiano/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (d.error) {
          setError(d.error);
          return;
        }
        setCourses(
          (d.courses ?? []).map((c: MasterCourseRow & { slug?: string }) => ({
            ...c,
            slug: c.slug ?? c.id,
          }))
        );
      })
      .catch(() => setError("Master-Seminare konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (status === "active" && c.status === "disabled") return false;
      if (status === "disabled" && c.status !== "disabled") return false;
      if (topicId !== "") {
        const ids = c.topicIds ?? c.topics?.map((t) => t.id) ?? [];
        if (!ids.includes(topicId)) return false;
      }
      return matchesSearch(c, search);
    });
  }, [courses, search, status, topicId]);

  const { uncategorized, groups } = useMemo(
    () => groupCoursesByTopic(filtered),
    [filtered]
  );

  const hasSearch = search.trim().length > 0;
  const uncategorizedVisible = uncategorized;
  const focusTopicId = topicId !== "" ? topicId : null;

  if (loading) {
    return <p className="text-sm text-slate-600">Lädt Master-Seminare…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
        <Button type="button" variant="secondary" className="ml-3" onClick={load}>
          Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Suche"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Master-Seminar oder Hauptthema…"
          />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Status</span>
          <select
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "active" | "disabled" | "all")
            }
          >
            <option value="active">Aktiv</option>
            <option value="disabled">Deaktiviert</option>
            <option value="all">Alle</option>
          </select>
        </label>
        {(search || status !== "active") && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch("");
              setStatus("active");
            }}
          >
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <TopicSection
            key={group.topicId ?? group.name}
            group={group}
            defaultOpen={hasSearch}
            search={search}
            onDelete={onDelete}
            onReactivate={onReactivate}
          />
        ))}

        {uncategorizedVisible.length > 0 && (
          <TopicSection
            group={{
              topicId: null,
              name: UNCategorized_TOPIC_LABEL,
              sortOrder: 9999,
              courses: uncategorizedVisible,
            }}
            defaultOpen={hasSearch}
            search={search}
            onDelete={onDelete}
            onReactivate={onReactivate}
          />
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-500">
          Keine Master-Seminare gefunden.
        </p>
      )}
    </div>
  );
}

export function MasterCoursesTable(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt Master-Seminare…</p>}>
      <MasterCoursesTableInner {...props} />
    </Suspense>
  );
}

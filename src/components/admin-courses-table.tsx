"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import { formatEstimatedDuration } from "@/lib/course-duration";
import {
  groupCoursesByTopic,
  UNCategorized_TOPIC_LABEL,
  type CourseTopicGroup,
} from "@/lib/course-hierarchy";
import type { ValidityType } from "@/lib/course-validity";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  active: boolean;
  validityType: ValidityType;
  validityLabel: string;
  instructionCode?: string | null;
  topicId?: number | null;
  topicIds?: number[];
  topics?: { id: number; name: string }[];
  topicName?: string | null;
  topicSortOrder?: number;
  sortOrder?: number;
  estimatedDurationMinutes?: number | null;
  permissions?: {
    canArchive?: boolean;
    canReactivate?: boolean;
    fromMaster?: boolean;
  };
};

type TopicOption = { id: number; name: string };

type Props = {
  onDelete: (course: CourseRow) => void;
  onReactivate: (course: CourseRow) => void;
  refreshKey?: number;
};

function matchesSearch(course: CourseRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    course.title.toLowerCase().includes(q) ||
    course.slug.toLowerCase().includes(q) ||
    (course.instructionCode?.toLowerCase().includes(q) ?? false) ||
    (course.topicName?.toLowerCase().includes(q) ?? false) ||
    (course.topics?.some((t) => t.name.toLowerCase().includes(q)) ?? false)
  );
}

function CourseRowActions({
  course,
  onDelete,
  onReactivate,
}: {
  course: CourseRow;
  onDelete: (course: CourseRow) => void;
  onReactivate: (course: CourseRow) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <Link
        href={`/dashboard/seminare/${encodeURIComponent(course.id)}/inhalte`}
        className="text-brand hover:underline"
      >
        Inhalte
      </Link>
      <Link
        href={`/dashboard/seminare/${encodeURIComponent(course.id)}`}
        className="text-brand hover:underline"
      >
        Einstellungen
      </Link>
      {(course.active
        ? course.permissions?.canArchive !== false
        : course.permissions?.canReactivate ||
          course.permissions?.canArchive !== false) ? (
        <button
          type="button"
          onClick={() => onDelete(course)}
          className="text-red-700 hover:underline"
        >
          Löschen
        </button>
      ) : null}
      {!course.active && course.permissions?.canReactivate ? (
        <button
          type="button"
          onClick={() => onReactivate(course)}
          className="text-slate-600 hover:underline"
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
  group: CourseTopicGroup<CourseRow>;
  defaultOpen: boolean;
  search: string;
  onDelete: (course: CourseRow) => void;
  onReactivate: (course: CourseRow) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const visible = group.courses.filter((c) => matchesSearch(c, search));
  if (visible.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium text-slate-900">
          {open ? "▾" : "▸"} {group.name}
        </span>
        <span className="text-sm text-slate-500">
          {visible.length} Seminar{visible.length === 1 ? "" : "e"}
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {visible.map((course) => (
            <li key={course.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {course.instructionCode ? `${course.instructionCode} ` : ""}
                    {course.title}
                    {!course.active && (
                      <span className="ml-2 text-xs text-amber-700">(archiviert)</span>
                    )}
                    {course.permissions?.fromMaster ? (
                      <span className="ml-2 text-xs text-slate-500">(Master)</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {course.validityLabel}
                    {course.estimatedDurationMinutes
                      ? ` · ${formatEstimatedDuration(course.estimatedDurationMinutes)}`
                      : ""}
                  </p>
                </div>
                <CourseRowActions
                  course={course}
                  onDelete={onDelete}
                  onReactivate={onReactivate}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdminCoursesTableInner({ onDelete, onReactivate, refreshKey = 0 }: Props) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");
  const [topicId, setTopicId] = useState<number | "">("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ filter: status });
    if (topicId !== "") params.set("topicId", String(topicId));
    fetch(`/api/admin/courses?${params}`)
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          window.location.replace("/login");
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
        setCourses(d.courses ?? []);
        setTopics(
          (d.topics ?? []).map((t: { id: number; name: string }) => ({
            id: t.id,
            name: t.name,
          }))
        );
      })
      .catch(() => setError("Seminare konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [status, topicId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const filtered = useMemo(
    () => courses.filter((c) => matchesSearch(c, search)),
    [courses, search]
  );

  const { uncategorized, groups } = useMemo(
    () => groupCoursesByTopic(filtered),
    [filtered]
  );

  const hasSearch = search.trim().length > 0;
  const uncategorizedVisible = uncategorized.filter((c) => matchesSearch(c, search));

  const resetFilters = () => {
    setSearch("");
    setStatus("active");
    setTopicId("");
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Lädt Seminare…</p>;
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
            placeholder="Seminar, Kennziffer oder Hauptthema…"
          />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Status</span>
          <select
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "active" | "archived" | "all")
            }
          >
            <option value="active">Aktiv</option>
            <option value="archived">Archiviert</option>
            <option value="all">Alle</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Hauptthema</span>
          <select
            className="rounded-xl border border-slate-300 px-3 py-2"
            value={topicId === "" ? "" : String(topicId)}
            onChange={(e) =>
              setTopicId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Alle Hauptthemen</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {(search || status !== "active" || topicId !== "") && (
          <Button type="button" variant="secondary" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <TopicSection
            key={group.topicId ?? group.name}
            group={group}
            defaultOpen={hasSearch || topicId !== ""}
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
            defaultOpen={hasSearch || groups.length === 0}
            search={search}
            onDelete={onDelete}
            onReactivate={onReactivate}
          />
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-500">
          Keine Seminare gefunden.
        </p>
      )}
    </div>
  );
}

export function AdminCoursesTable(props: Props) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt Seminare…</p>}>
      <AdminCoursesTableInner {...props} />
    </Suspense>
  );
}

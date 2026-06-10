"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import type {
  CourseAssignmentOption,
  CourseAssignmentOptions,
  CourseAssignmentTopicGroup,
} from "@/lib/course-assignment-options";
import { formatCourseCodeTitle } from "@/lib/course-display";

type Props = {
  companyId: number;
  /** Vom Parent geladen – kein separater API-Call. */
  assignmentData?: CourseAssignmentOptions | null;
  assignmentLoading?: boolean;
  onSaved?: () => void;
};

type ActiveFilter = "all" | "active" | "inactive";

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function courseSearchText(course: CourseAssignmentOption): string {
  return [course.title, course.code].filter(Boolean).join(" ").toLowerCase();
}

function matchesCourse(
  course: CourseAssignmentOption,
  search: string,
  activeFilter: ActiveFilter
): boolean {
  if (activeFilter === "active" && !course.active) return false;
  if (activeFilter === "inactive" && course.active) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return courseSearchText(course).includes(q);
}

function matchesTopic(
  topic: CourseAssignmentTopicGroup,
  search: string,
  activeFilter: ActiveFilter
): boolean {
  const q = search.trim().toLowerCase();
  if (q && topic.name.toLowerCase().includes(q)) return true;
  return topic.courses.some((c) => matchesCourse(c, search, activeFilter));
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  className = "",
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={className}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function courseLabel(course: CourseAssignmentOption): string {
  const { code, displayTitle } = formatCourseCodeTitle(course.code, course.title);
  if (code && displayTitle) return `${code} ${displayTitle}`;
  return code ?? displayTitle ?? "—";
}

function renderCourseTitle(course: CourseAssignmentOption) {
  const { code, displayTitle } = formatCourseCodeTitle(course.code, course.title);
  if (!code) {
    return <span>{displayTitle}</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
        {code}
      </span>
      <span>{displayTitle}</span>
    </span>
  );
}

export function CourseProvisionTopicPicker({
  companyId,
  assignmentData,
  assignmentLoading = false,
  onSaved,
}: Props) {
  const [options, setOptions] = useState<CourseAssignmentOptions | null>(
    assignmentData ?? null
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<number | "ungrouped">>(() => new Set());
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [loading, setLoading] = useState(assignmentData == null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const usesExternalData = assignmentData !== undefined;

  useEffect(() => {
    if (!usesExternalData) return;
    if (assignmentData == null) {
      setOptions(null);
      if (assignmentLoading) setLoading(true);
      return;
    }
    setOptions(assignmentData);
    setLoading(false);
    setError("");
    if (!dirtyRef.current) {
      setSelected((prev) => {
        const next = new Set(assignmentData.selectedMasterCourseIds);
        return setsEqual(prev, next) ? prev : next;
      });
    }
  }, [assignmentData, assignmentLoading, usesExternalData]);

  useEffect(() => {
    if (usesExternalData) return;
    if (!Number.isFinite(companyId) || companyId <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/superuser/companies/${companyId}/course-assignment-options`,
          { signal: controller.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          window.location.replace("/certiano/login");
          return;
        }
        if (!res.ok) {
          throw new Error(data.error ?? "Optionen konnten nicht geladen werden.");
        }

        const opts = data as CourseAssignmentOptions;
        setOptions(opts);
        if (!dirtyRef.current) {
          setSelected((prev) => {
            const next = new Set(opts.selectedMasterCourseIds);
            return setsEqual(prev, next) ? prev : next;
          });
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [companyId, usesExternalData]);

  const allCourses = useMemo(() => {
    if (!options) return [];
    return [
      ...options.topics.flatMap((t) => t.courses),
      ...options.ungroupedCourses,
    ];
  }, [options]);

  const uniqueCourseCount = useMemo(() => {
    const ids = new Set(allCourses.map((c) => c.id));
    return ids.size;
  }, [allCourses]);

  const filteredTopics = useMemo(() => {
    if (!options) return [];
    return options.topics
      .filter((t) => matchesTopic(t, search, activeFilter))
      .map((t) => ({
        ...t,
        courses: t.courses.filter((c) => matchesCourse(c, search, activeFilter)),
      }))
      .filter(
        (t) =>
          t.courses.length > 0 ||
          search.trim().toLowerCase().includes(t.name.toLowerCase())
      );
  }, [options, search, activeFilter]);

  const filteredUngrouped = useMemo(() => {
    if (!options) return [];
    return options.ungroupedCourses.filter((c) =>
      matchesCourse(c, search, activeFilter)
    );
  }, [options, search, activeFilter]);

  function topicSelectionState(topic: CourseAssignmentTopicGroup): {
    all: boolean;
    some: boolean;
    none: boolean;
  } {
    const ids = topic.courses.map((c) => c.id);
    if (ids.length === 0) return { all: false, some: false, none: true };
    const selectedCount = ids.filter((id) => selected.has(id)).length;
    return {
      all: selectedCount === ids.length,
      some: selectedCount > 0 && selectedCount < ids.length,
      none: selectedCount === 0,
    };
  }

  function ungroupedSelectionState(): { all: boolean; some: boolean; none: boolean } {
    if (!options) return { all: false, some: false, none: true };
    const ids = options.ungroupedCourses.map((c) => c.id);
    if (ids.length === 0) return { all: false, some: false, none: true };
    const selectedCount = ids.filter((id) => selected.has(id)).length;
    return {
      all: selectedCount === ids.length,
      some: selectedCount > 0 && selectedCount < ids.length,
      none: selectedCount === 0,
    };
  }

  function toggleCourse(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
    setMessage("");
  }

  function setTopicCourses(topic: CourseAssignmentTopicGroup, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const course of topic.courses) {
        if (checked) next.add(course.id);
        else next.delete(course.id);
      }
      return next;
    });
    setDirty(true);
    setMessage("");
  }

  function setUngroupedCourses(checked: boolean) {
    if (!options) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const course of options.ungroupedCourses) {
        if (checked) next.add(course.id);
        else next.delete(course.id);
      }
      return next;
    });
    setDirty(true);
    setMessage("");
  }

  function toggleExpanded(key: number | "ungrouped") {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    const masterCourseIds = [...selected];
    try {
      const res = await fetch(
        `/api/superuser/companies/${companyId}/course-provisions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterCourseIds }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      }

      const parts: string[] = [];
      if (data.assigned > 0) parts.push(`${data.assigned} neu zugewiesen`);
      if (data.reactivated > 0) parts.push(`${data.reactivated} reaktiviert`);
      if (data.deactivated > 0) parts.push(`${data.deactivated} deaktiviert`);
      setMessage(
        parts.length > 0
          ? `Gespeichert: ${parts.join(", ")}.`
          : "Auswahl gespeichert."
      );
      setDirty(false);
      onSavedRef.current?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function renderCourseRow(course: CourseAssignmentOption) {
    const checked = selected.has(course.id);
    return (
      <label
        key={course.id}
        className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
      >
        <input
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={checked}
          disabled={saving}
          onChange={() => toggleCourse(course.id)}
        />
        <span className="text-sm">
          {renderCourseTitle(course)}
          {!course.active && (
            <span className="ml-2 text-xs text-amber-700">(inaktiv)</span>
          )}
          {course.provisioned && !course.provisionActive && (
            <span className="ml-2 text-xs text-slate-500">(deaktiviert)</span>
          )}
        </span>
      </label>
    );
  }

  function renderTopicGroup(topic: CourseAssignmentTopicGroup) {
    const isOpen = expanded.has(topic.id);
    const state = topicSelectionState(topic);
    const visibleCourses = topic.courses.filter((c) =>
      matchesCourse(c, search, activeFilter)
    );

    return (
      <div key={topic.id} className="rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 px-3 py-2">
          <IndeterminateCheckbox
            className="shrink-0"
            checked={state.all}
            indeterminate={state.some}
            disabled={saving}
            onChange={() => setTopicCourses(topic, !state.all)}
          />
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-800"
            onClick={() => toggleExpanded(topic.id)}
            aria-expanded={isOpen}
          >
            <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span>
            <span className="truncate">{topic.name}</span>
            {!topic.active && (
              <span className="text-xs font-normal text-amber-700">(inaktiv)</span>
            )}
            <span className="ml-auto shrink-0 text-xs font-normal text-slate-500">
              {topic.courses.filter((c) => selected.has(c.id)).length}/
              {topic.courses.length}
            </span>
          </button>
        </div>
        {isOpen && visibleCourses.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2 pl-8">
            {visibleCourses.map(renderCourseRow)}
          </div>
        )}
      </div>
    );
  }

  function renderUngrouped() {
    if (!options || options.ungroupedCourses.length === 0) return null;
    const isOpen = expanded.has("ungrouped");
    const state = ungroupedSelectionState();
    const visible = filteredUngrouped;

    return (
      <div className="rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 px-3 py-2">
          <IndeterminateCheckbox
            className="shrink-0"
            checked={state.all}
            indeterminate={state.some}
            disabled={saving}
            onChange={() => setUngroupedCourses(!state.all)}
          />
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-800"
            onClick={() => toggleExpanded("ungrouped")}
            aria-expanded={isOpen}
          >
            <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span>
            <span>Ohne Hauptthema</span>
            <span className="ml-auto shrink-0 text-xs font-normal text-slate-500">
              {options.ungroupedCourses.filter((c) => selected.has(c.id)).length}/
              {options.ungroupedCourses.length}
            </span>
          </button>
        </div>
        {isOpen && visible.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2 pl-8">
            {visible.map(renderCourseRow)}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Lädt Seminare…</p>;
  }

  if (!options) {
    return (
      <p className="text-sm text-red-700">{error || "Keine Daten verfügbar."}</p>
    );
  }

  const hasVisible =
    filteredTopics.length > 0 ||
    filteredUngrouped.length > 0 ||
    (search.trim() === "" && activeFilter === "all" && uniqueCourseCount === 0);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Suchen"
            placeholder="Titel, Kürzel oder Hauptthema…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={saving}
          />
        </div>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            className="mt-1 block rounded-xl border border-slate-300 px-3 py-2"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            disabled={saving}
          >
            <option value="all">Alle</option>
            <option value="active">Nur aktive</option>
            <option value="inactive">Nur inaktive</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-500">
        {selected.size} von {uniqueCourseCount} Seminaren ausgewählt
        {dirty && " · ungespeicherte Änderungen"}
      </p>

      {uniqueCourseCount === 0 ? (
        <p className="text-sm text-slate-600">Noch keine Masterkurse vorhanden.</p>
      ) : (
        <div className="max-h-[32rem] space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
          {filteredTopics.map(renderTopicGroup)}
          {renderUngrouped()}
          {!hasVisible && (
            <p className="text-sm text-slate-500">
              Keine Treffer für „{search}“.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving || !dirty} onClick={save}>
          {saving ? "Speichern…" : "Auswahl speichern"}
        </Button>
        {dirty && options && (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => {
              console.debug("[course-assignment] reset selection");
              setSelected((prev) => {
                const next = new Set(options.selectedMasterCourseIds);
                return setsEqual(prev, next) ? prev : next;
              });
              setDirty(false);
              setMessage("");
            }}
          >
            Zurücksetzen
          </Button>
        )}
      </div>
    </div>
  );
}

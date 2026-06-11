"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui";
import {
  formatDurationSummary,
  formatEstimatedDuration,
  sumEstimatedDurationMinutes,
} from "@/lib/course-duration";
import { formatCourseLabel } from "@/lib/course-display";
import {
  groupCoursesForEmployeeView,
  type CourseHierarchyItem,
} from "@/lib/course-hierarchy";

export type AssignableCourse = CourseHierarchyItem;

type Props = {
  courses: AssignableCourse[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function courseLabel(course: AssignableCourse): string {
  const title = course.fullTitle ?? course.title;
  const duration = formatEstimatedDuration(course.estimatedDurationMinutes);
  const label = formatCourseLabel(course.code, title);
  return duration ? `${label} · ${duration}` : label;
}

function matchesSearch(course: AssignableCourse, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    course.title,
    course.fullTitle,
    course.code,
    course.instructionTitle,
    course.mainCategory,
    course.seminar,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function CourseAssignmentPicker({
  courses,
  selectedIds,
  onChange,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(
    () => courses.filter((c) => matchesSearch(c, search)),
    [courses, search]
  );

  const { uncategorized, hierarchies } = useMemo(
    () => groupCoursesForEmployeeView(filtered),
    [filtered]
  );

  const selectedCourses = useMemo(
    () => courses.filter((c) => selected.has(c.id)),
    [courses, selected]
  );
  const totalMinutes = sumEstimatedDurationMinutes(selectedCourses);

  function toggle(id: string) {
    if (disabled) return;
    if (selected.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function renderCourse(course: AssignableCourse) {
    const id = course.id;
    const checked = selected.has(id);
    return (
      <label
        key={id}
        className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          disabled={disabled}
          onChange={() => toggle(id)}
        />
        <span className="text-sm">{courseLabel(course)}</span>
      </label>
    );
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Keine aktiven Seminare verfügbar.
      </p>
    );
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Seminare & Unterweisungen
        </p>
        <p className="mb-2 text-xs text-slate-500">
          Ausgewählte Schulungen: {selectedIds.length}
          {totalMinutes > 0 && (
            <> · geschätzte Dauer: {formatDurationSummary(totalMinutes)}</>
          )}
        </p>
        <Input
          label="Suchen"
          placeholder="Kürzel, Titel oder Kategorie…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="max-h-96 space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-4">
        {hierarchies.map((main) => (
          <div key={main.name}>
            <h3 className="mb-2 text-sm font-bold text-slate-800">{main.name}</h3>
            <div className="space-y-3 pl-2">
              {main.seminars.map((seminar) => (
                <div key={`${main.name}-${seminar.name}`}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {seminar.name}
                  </p>
                  <div className="space-y-0.5">
                    {seminar.courses.map(renderCourse)}
                    {seminar.instructions.map(renderCourse)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {uncategorized.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-800">Sonstige</h3>
            <div className="space-y-0.5">{uncategorized.map(renderCourse)}</div>
          </div>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-slate-500">Keine Treffer für „{search}“.</p>
        )}
      </div>
    </div>
  );
}

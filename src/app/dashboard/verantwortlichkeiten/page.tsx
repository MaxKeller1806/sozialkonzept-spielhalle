"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CourseResponsibilityEditorDialog } from "@/components/course-responsibility-editor-dialog";
import { CourseTitleDisplay } from "@/components/course-title-display";
import { PageHeader } from "@/components/page-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { IconChevronDown, IconPencil } from "@/components/table-action-icons";
import { Card } from "@/components/ui";
import { UNCategorized_TOPIC_LABEL } from "@/lib/course-hierarchy";
import type {
  AssignableEmployee,
  CourseResponsibilityItem,
  ResponsibleUser,
  TopicResponsibilityGroup,
} from "@/lib/course-responsible-users";

type AssignmentFilter = "all" | "assigned" | "unassigned";

type EditorTarget =
  | { kind: "topic"; topicId: number; name: string; userIds: number[] }
  | {
      kind: "course";
      course: CourseResponsibilityItem;
      userIds: number[];
    };

type Payload = {
  groups: TopicResponsibilityGroup[];
  uncategorized: CourseResponsibilityItem[];
  employees: AssignableEmployee[];
};

const SEMINARS_PREVIEW_COUNT = 5;

function formatPersonName(user: ResponsibleUser): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function matchesCourseFilters(
  course: CourseResponsibilityItem,
  search: string,
  assignmentFilter: AssignmentFilter,
  topicUsers: ResponsibleUser[]
): boolean {
  const q = search.trim().toLowerCase();
  const effectiveUsers =
    course.responsibleUsers.length > 0 ? course.responsibleUsers : topicUsers;
  const hasResponsible = effectiveUsers.length > 0;

  if (assignmentFilter === "assigned" && !hasResponsible) return false;
  if (assignmentFilter === "unassigned" && hasResponsible) return false;

  if (!q) return true;

  if (course.title.toLowerCase().includes(q)) return true;
  if (course.instructionCode?.toLowerCase().includes(q)) return true;
  if (effectiveUsers.some((u) => formatPersonName(u).toLowerCase().includes(q))) {
    return true;
  }
  if (topicUsers.some((u) => formatPersonName(u).toLowerCase().includes(q))) {
    return true;
  }
  return false;
}

function TextEditAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-brand transition hover:underline"
    >
      <IconPencil className="shrink-0" />
      {label}
    </button>
  );
}

function ResponsibleChips({
  users,
  maxVisible = 2,
  inherited = false,
  compact = false,
}: {
  users: ResponsibleUser[];
  maxVisible?: number;
  inherited?: boolean;
  compact?: boolean;
}) {
  if (users.length === 0) {
    return <span className="text-sm text-slate-500">k.A.</span>;
  }

  const visible = users.slice(0, maxVisible);
  const rest = users.length - visible.length;
  const chipClass = compact
    ? inherited
      ? "rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
      : "rounded-md bg-brand-light px-1.5 py-0.5 text-xs font-medium text-brand"
    : inherited
      ? "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
      : "rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((user) => (
        <span key={user.id} className={chipClass}>
          {formatPersonName(user)}
        </span>
      ))}
      {rest > 0 ? (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

function StandardResponsibleLine({
  users,
  onEdit,
}: {
  users: ResponsibleUser[];
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-2 text-sm">
      <span className="shrink-0 text-slate-500">Standard:</span>
      <ResponsibleChips users={users} maxVisible={3} compact />
      <TextEditAction label="Standard anpassen" onClick={onEdit} />
    </div>
  );
}

function SeminarTableRow({
  course,
  onEdit,
}: {
  course: CourseResponsibilityItem;
  onEdit: (course: CourseResponsibilityItem) => void;
}) {
  const inherited = course.responsibilitySource === "topic";

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-4 py-2 align-middle">
        <div className="space-y-1">
          <CourseTitleDisplay
            code={course.instructionCode}
            title={course.title}
            titleClassName="text-sm font-medium text-slate-900"
            badgeClassName="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700"
          />
          <div className="sm:hidden">
            <ResponsibleChips users={course.responsibleUsers} inherited={inherited} />
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-2 align-middle sm:table-cell">
        <ResponsibleChips users={course.responsibleUsers} inherited={inherited} />
      </td>
      <td className="px-4 py-2 text-right align-middle whitespace-nowrap">
        <TextEditAction label="Anpassen" onClick={() => onEdit(course)} />
      </td>
    </tr>
  );
}

function SeminarTable({
  courses,
  onEditCourse,
}: {
  courses: CourseResponsibilityItem[];
  onEditCourse: (course: CourseResponsibilityItem) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = courses.length > SEMINARS_PREVIEW_COUNT;
  const visible = showAll || !hasMore ? courses : courses.slice(0, SEMINARS_PREVIEW_COUNT);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="hidden bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-header-group">
            <tr>
              <th className="px-4 py-2 font-semibold">Seminar</th>
              <th className="px-4 py-2 font-semibold">Verantwortliche</th>
              <th className="px-4 py-2 text-right font-semibold">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((course) => (
              <SeminarTableRow key={course.courseId} course={course} onEdit={onEditCourse} />
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && !showAll ? (
        <div className="border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-brand"
          >
            Weitere Seminare anzeigen
            <IconChevronDown />
          </button>
        </div>
      ) : null}
    </>
  );
}

function TopicResponsibilityCard({
  group,
  defaultOpen,
  search,
  assignmentFilter,
  onEditTopic,
  onEditCourse,
}: {
  group: TopicResponsibilityGroup;
  defaultOpen: boolean;
  search: string;
  assignmentFilter: AssignmentFilter;
  onEditTopic: (group: TopicResponsibilityGroup) => void;
  onEditCourse: (course: CourseResponsibilityItem) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const visible = group.courses.filter((c) =>
    matchesCourseFilters(c, search, assignmentFilter, group.topicResponsibleUsers)
  );

  const topicMatchesSearch =
    search.trim().length > 0 &&
    group.topicResponsibleUsers.some((u) =>
      formatPersonName(u).toLowerCase().includes(search.trim().toLowerCase())
    );

  if (visible.length === 0 && !topicMatchesSearch && search.trim().length > 0) {
    return null;
  }

  return (
    <Card className="!overflow-hidden !p-0 !shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50/80"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="font-semibold text-slate-900">{group.name}</span>
          <span className="ml-2 text-sm text-slate-500">
            {visible.length} Seminar{visible.length === 1 ? "" : "e"}
          </span>
        </span>
        <IconChevronDown
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <>
          {group.topicId != null ? (
            <StandardResponsibleLine
              users={group.topicResponsibleUsers}
              onEdit={() => onEditTopic(group)}
            />
          ) : null}
          {visible.length > 0 ? (
            <SeminarTable courses={visible} onEditCourse={onEditCourse} />
          ) : (
            <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              Keine passenden Seminare.
            </p>
          )}
        </>
      ) : null}
    </Card>
  );
}

function UncategorizedCard({
  courses,
  defaultOpen,
  onEditCourse,
}: {
  courses: CourseResponsibilityItem[];
  defaultOpen: boolean;
  onEditCourse: (course: CourseResponsibilityItem) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  if (courses.length === 0) return null;

  return (
    <Card className="!overflow-hidden !p-0 !shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50/80"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="font-semibold text-slate-600">{UNCategorized_TOPIC_LABEL}</span>
          <span className="ml-2 text-sm text-slate-500">
            {courses.length} Seminar{courses.length === 1 ? "" : "e"}
          </span>
        </span>
        <IconChevronDown
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <SeminarTable courses={courses} onEditCourse={onEditCourse} /> : null}
    </Card>
  );
}

function CompanyResponsibilitiesPageInner() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/responsibilities");
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        window.location.replace("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Laden fehlgeschlagen.");
      }
      setPayload({
        groups: Array.isArray(data.groups) ? data.groups : [],
        uncategorized: Array.isArray(data.uncategorized) ? data.uncategorized : [],
        employees: Array.isArray(data.employees) ? data.employees : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasSearch = search.trim().length > 0;
  const hasActiveFilters = hasSearch || assignmentFilter !== "all";

  const visibleUncategorized = useMemo(() => {
    if (!payload) return [];
    return payload.uncategorized.filter((c) =>
      matchesCourseFilters(c, search, assignmentFilter, [])
    );
  }, [payload, search, assignmentFilter]);

  const totalVisible = useMemo(() => {
    if (!payload) return 0;
    const inGroups = payload.groups.reduce((sum, group) => {
      return (
        sum +
        group.courses.filter((c) =>
          matchesCourseFilters(c, search, assignmentFilter, group.topicResponsibleUsers)
        ).length
      );
    }, 0);
    return inGroups + visibleUncategorized.length;
  }, [payload, search, assignmentFilter, visibleUncategorized.length]);

  function openTopicEditor(group: TopicResponsibilityGroup) {
    if (group.topicId == null) return;
    setEditorError("");
    setEditorTarget({
      kind: "topic",
      topicId: group.topicId,
      name: group.name,
      userIds: group.topicResponsibleUsers.map((u) => u.id),
    });
  }

  function openCourseEditor(course: CourseResponsibilityItem) {
    setEditorError("");
    setEditorTarget({
      kind: "course",
      course,
      userIds: course.responsibleUsers.map((u) => u.id),
    });
  }

  async function saveTopic(userIds: number[]) {
    if (editorTarget?.kind !== "topic") return;
    setSaving(true);
    setEditorError("");
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/responsibilities/topics/${editorTarget.topicId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      }
      setMessage(data.message ?? "Verantwortliche für das Hauptthema gespeichert.");
      setEditorTarget(null);
      await load();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCourse(userIds: number[]) {
    if (editorTarget?.kind !== "course") return;
    setSaving(true);
    setEditorError("");
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/responsibilities/${encodeURIComponent(editorTarget.course.courseId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      }
      setMessage(data.message ?? "Individuelle Zuordnung gespeichert.");
      setEditorTarget(null);
      await load();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function resetCourseToTopic() {
    if (editorTarget?.kind !== "course") return;
    setSaving(true);
    setEditorError("");
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/responsibilities/${encodeURIComponent(editorTarget.course.courseId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetToTopicDefault: true }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Zurücksetzen fehlgeschlagen.");
      }
      setMessage(data.message ?? "Hauptthema gilt wieder für dieses Seminar.");
      setEditorTarget(null);
      await load();
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : "Zurücksetzen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setAssignmentFilter("all");
  }

  const editorProps =
    editorTarget?.kind === "topic"
      ? {
          subjectLabel: "Hauptthema",
          subjectName: editorTarget.name,
          selectedUserIds: editorTarget.userIds,
          hint: "Gilt standardmäßig für alle Seminare dieses Hauptthemas. Bereits individuell angepasste Seminare bleiben unverändert.",
          showResetToTopic: false as const,
          onSave: saveTopic,
        }
      : editorTarget?.kind === "course"
        ? {
            subjectLabel: "Seminar",
            subjectName: editorTarget.course.title,
            selectedUserIds: editorTarget.userIds,
            hint: "Überschreibt die Zuordnung vom Hauptthema nur für dieses Seminar.",
            showResetToTopic: editorTarget.course.hasCourseOverride,
            onSave: saveCourse,
            onResetToTopic: resetCourseToTopic,
          }
        : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Verantwortlichkeiten"
        description="Verantwortliche pro Hauptthema festlegen — gilt für alle Seminare. Einzelne Seminare bei Bedarf anpassen."
      />

      {message && (
        <p className="mb-4 rounded-lg bg-brand-light px-4 py-2 text-sm text-brand">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4">
        <SearchFilterBar
          search={search}
          searchPlaceholder="Seminar suchen …"
          onSearchChange={setSearch}
          statusFilter={assignmentFilter}
          onStatusChange={(value) => setAssignmentFilter(value as AssignmentFilter)}
          statusLabel="Filter"
          statusOptions={[
            { value: "all", label: "Alle anzeigen" },
            { value: "unassigned", label: "Ohne Verantwortliche" },
            { value: "assigned", label: "Mit Verantwortlichen" },
          ]}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Lädt Verantwortlichkeiten…</p>
      ) : totalVisible === 0 && !hasSearch ? (
        <Card className="px-4 py-8 text-center text-sm text-slate-600 !shadow-sm">
          {hasActiveFilters
            ? "Keine Seminare für die aktuelle Filterung."
            : "Keine aktiven Seminare vorhanden."}
        </Card>
      ) : (
        <div className="space-y-3">
          {payload?.groups.map((group) => (
            <TopicResponsibilityCard
              key={group.topicId ?? group.name}
              group={group}
              defaultOpen={hasSearch}
              search={search}
              assignmentFilter={assignmentFilter}
              onEditTopic={openTopicEditor}
              onEditCourse={openCourseEditor}
            />
          ))}
          <UncategorizedCard
            courses={visibleUncategorized}
            defaultOpen={hasSearch}
            onEditCourse={openCourseEditor}
          />
        </div>
      )}

      {editorProps ? (
        <CourseResponsibilityEditorDialog
          open
          employees={payload?.employees ?? []}
          saving={saving}
          error={editorError}
          onClose={() => {
            if (!saving) {
              setEditorTarget(null);
              setEditorError("");
            }
          }}
          {...editorProps}
        />
      ) : null}
    </div>
  );
}

export default function VerantwortlichkeitenPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lädt…</p>}>
      <CompanyResponsibilitiesPageInner />
    </Suspense>
  );
}

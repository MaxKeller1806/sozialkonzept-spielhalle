"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, ErrorMessage, Input, Select } from "@/components/ui";
import {
  groupCoursesForEmployeeView,
  type CourseHierarchyItem,
} from "@/lib/course-hierarchy";
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/document-template-shared";

type EffectiveTemplateSummary = {
  templateId: number;
  name: string;
  publishedRevisionId: number | null;
  publishedRevisionNumber: number | null;
};

type AssignmentItem = {
  id: string;
  title: string;
  mainCategory: string | null;
  seminar: string | null;
  instructionCode: string | null;
  instructionTitle: string | null;
  sortOrder: number;
  documentType: DocumentType;
};

type AssignmentsResponse = {
  templates: Partial<Record<DocumentType, EffectiveTemplateSummary>>;
  items: AssignmentItem[];
  assignmentStatus: "automatic";
};

type EnrichedAssignmentItem = AssignmentItem & {
  documentTypeLabel: string;
  effectiveTemplate: EffectiveTemplateSummary | null;
};

type DocumentTypeFilter = "all" | DocumentType;

function matchesSearch(
  item: EnrichedAssignmentItem,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.title,
    item.instructionCode,
    item.instructionTitle,
    item.mainCategory,
    item.seminar,
    item.effectiveTemplate?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function toHierarchyItem(item: AssignmentItem): CourseHierarchyItem {
  return {
    id: item.id,
    title: item.title,
    code: item.instructionCode,
    instructionTitle: item.instructionTitle,
    mainCategory: item.mainCategory,
    seminar: item.seminar,
    sortOrder: item.sortOrder,
    slug: item.id,
  };
}

function formatEffectiveTemplate(template: EffectiveTemplateSummary | null): string {
  if (!template) {
    return "Keine veröffentlichte Vorlage";
  }
  if (template.publishedRevisionNumber != null) {
    return `${template.name} · Rev. ${template.publishedRevisionNumber}`;
  }
  return template.name;
}

function AssignmentRow({ item }: { item: EnrichedAssignmentItem }) {
  const levelLabel = item.instructionCode ? "Unterweisung" : "Seminar";

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start gap-2">
        {item.instructionCode ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {item.instructionCode}
          </span>
        ) : null}
        <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">
          {item.title}
        </p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {levelLabel}
        </span>
      </div>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Dokumenttyp
          </dt>
          <dd className="mt-0.5 text-slate-800">{item.documentTypeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Effektive Vorlage
          </dt>
          <dd className="mt-0.5 text-slate-800">
            {formatEffectiveTemplate(item.effectiveTemplate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </dt>
          <dd className="mt-0.5 text-slate-800">Automatisch über Dokumenttyp</dd>
        </div>
      </dl>
    </div>
  );
}

export function DocumentTemplateSeminarsOverview() {
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [templates, setTemplates] = useState<
    Partial<Record<DocumentType, EffectiveTemplateSummary>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] =
    useState<DocumentTypeFilter>("all");

  const loadAssignments = useCallback(async () => {
    const res = await fetch("/api/superuser/document-templates/assignments");
    if (res.status === 403) {
      window.location.replace("/certiano/login");
      return;
    }
    const data = (await res.json().catch(() => ({}))) as AssignmentsResponse & {
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Zuordnungen konnten nicht geladen werden.");
    }
    setItems(data.items ?? []);
    setTemplates(data.templates ?? {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadAssignments();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Fehler beim Laden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAssignments]);

  const enrichedItems = useMemo((): EnrichedAssignmentItem[] => {
    return items.map((item) => ({
      ...item,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[item.documentType],
      effectiveTemplate: templates[item.documentType] ?? null,
    }));
  }, [items, templates]);

  const itemsById = useMemo(
    () => new Map(enrichedItems.map((item) => [item.id, item])),
    [enrichedItems]
  );

  const filtered = useMemo(() => {
    return enrichedItems.filter((item) => {
      if (documentTypeFilter !== "all" && item.documentType !== documentTypeFilter) {
        return false;
      }
      return matchesSearch(item, search);
    });
  }, [enrichedItems, search, documentTypeFilter]);

  const { uncategorized, hierarchies } = useMemo(() => {
    return groupCoursesForEmployeeView(filtered.map(toHierarchyItem));
  }, [filtered]);

  function renderAssignment(course: CourseHierarchyItem) {
    const item = itemsById.get(course.id);
    if (!item) return null;
    return <AssignmentRow key={item.id} item={item} />;
  }

  return (
    <>
      <Card className="mb-6 border-brand-light bg-brand-light/30">
        <p className="text-sm text-slate-700">
          Übersicht, welche globale Vorlage bei Ausstellung automatisch verwendet
          wird. Die Zuordnung folgt dem Dokumenttyp des Kurses (
          <strong>Zertifikat</strong> oder <strong>Nachweis</strong>) und der
          jeweiligen Standardvorlage. Individuelle Zuordnungen folgen in einer
          späteren Phase.
        </p>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Input
          label="Suche"
          placeholder="Titel, Kürzel oder Kategorie…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Dokumenttyp"
          value={documentTypeFilter}
          onChange={(e) =>
            setDocumentTypeFilter(e.target.value as DocumentTypeFilter)
          }
        >
          <option value="all">Alle</option>
          <option value="certificate">{DOCUMENT_TYPE_LABELS.certificate}</option>
          <option value="proof">{DOCUMENT_TYPE_LABELS.proof}</option>
        </Select>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <p className="text-sm text-slate-600" role="status">
          Seminare werden geladen…
        </p>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Keine Master-Seminare gefunden.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {hierarchies.map((main) => (
            <Card key={main.name}>
              <h2 className="mb-4 text-base font-bold text-slate-900">
                {main.name}
              </h2>
              <div className="space-y-5">
                {main.seminars.map((seminar) => (
                  <div key={`${main.name}-${seminar.name}`}>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">
                      {seminar.name}
                    </h3>
                    <div className="space-y-2">
                      {seminar.courses.map(renderAssignment)}
                      {seminar.instructions.map(renderAssignment)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {uncategorized.length > 0 ? (
            <Card>
              <h2 className="mb-4 text-base font-bold text-slate-900">
                Ohne Kategorie
              </h2>
              <div className="space-y-2">
                {uncategorized.map(renderAssignment)}
              </div>
            </Card>
          ) : null}

          {filtered.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">
                Keine Treffer für die aktuelle Suche oder Filterauswahl.
              </p>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}

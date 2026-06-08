import { parseInstructionMetaFromRow } from "./course-instruction-meta";
import { getSql } from "./db";
import type { DocumentType } from "./document-template";
import { resolveDocumentTypeFromCourseMeta } from "./document-template";

export type DocumentTemplateAssignmentStatus = "automatic";

export type EffectiveTemplateSummary = {
  templateId: number;
  name: string;
  publishedRevisionId: number | null;
  publishedRevisionNumber: number | null;
};

export type DocumentTemplateAssignmentItem = {
  id: string;
  title: string;
  mainCategory: string | null;
  seminar: string | null;
  instructionCode: string | null;
  instructionTitle: string | null;
  sortOrder: number;
  documentType: DocumentType;
};

export type DocumentTemplateAssignmentsPreview = {
  templates: Partial<Record<DocumentType, EffectiveTemplateSummary>>;
  items: DocumentTemplateAssignmentItem[];
  assignmentStatus: DocumentTemplateAssignmentStatus;
};

type AssignmentQueryRow = {
  courses: MasterCourseAssignmentRow[] | null;
  templates: TemplateSummaryRow[] | null;
};

type MasterCourseAssignmentRow = {
  id: string;
  title: string;
  requiresCertificate: boolean;
  requiresProof: boolean;
  mainCategory: string | null;
  seminar: string | null;
  instructionCode: string | null;
  instructionTitle: string | null;
  sortOrder: number;
};

type TemplateSummaryRow = {
  templateId: number;
  documentType: DocumentType;
  name: string;
  publishedRevisionId: number | null;
  publishedRevisionNumber: number | null;
};

function mapCourseRow(row: Record<string, unknown>): MasterCourseAssignmentRow {
  const meta = parseInstructionMetaFromRow(row);
  return {
    id: String(row.id),
    title: String(row.title),
    requiresCertificate: meta.requiresCertificate,
    requiresProof: meta.requiresProof,
    mainCategory: meta.mainCategory,
    seminar: meta.seminar,
    instructionCode: meta.instructionCode,
    instructionTitle: meta.instructionTitle,
    sortOrder: meta.sortOrder,
  };
}

function mapTemplateRow(row: Record<string, unknown>): TemplateSummaryRow {
  return {
    templateId: Number(row.template_id),
    documentType: String(row.document_type) as DocumentType,
    name: String(row.name),
    publishedRevisionId:
      row.revision_id != null ? Number(row.revision_id) : null,
    publishedRevisionNumber:
      row.revision_number != null ? Number(row.revision_number) : null,
  };
}

async function loadAssignmentsData(): Promise<AssignmentQueryRow> {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT
        (
          SELECT COALESCE(json_agg(row ORDER BY row.sort_order, row.title), '[]'::json)
          FROM (
            SELECT
              id,
              title,
              main_category,
              seminar,
              instruction_code,
              instruction_title,
              sort_order,
              requires_certificate,
              requires_proof
            FROM master_courses
          ) AS row
        ) AS courses,
        (
          SELECT COALESCE(json_agg(row ORDER BY row.document_type), '[]'::json)
          FROM (
            SELECT
              t.id AS template_id,
              t.document_type,
              t.name,
              r.id AS revision_id,
              r.revision_number
            FROM document_templates t
            LEFT JOIN document_template_revisions r
              ON r.id = t.published_revision_id AND r.status = 'published'
            WHERE t.company_id IS NULL
              AND t.is_default = TRUE
          ) AS row
        ) AS templates
    `;

    const row = rows[0] as Record<string, unknown> | undefined;
    return {
      courses: (row?.courses as MasterCourseAssignmentRow[] | null) ?? [],
      templates: (row?.templates as TemplateSummaryRow[] | null) ?? [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") && msg.includes("master_courses")) {
      return { courses: [], templates: [] };
    }
    throw e;
  }
}

function mapTemplateSummaries(
  summaries: TemplateSummaryRow[]
): Partial<Record<DocumentType, EffectiveTemplateSummary>> {
  const templates: Partial<Record<DocumentType, EffectiveTemplateSummary>> = {};
  for (const summary of summaries) {
    templates[summary.documentType] = {
      templateId: summary.templateId,
      name: summary.name,
      publishedRevisionId: summary.publishedRevisionId,
      publishedRevisionNumber: summary.publishedRevisionNumber,
    };
  }
  return templates;
}

/** Read-only: effektive globale Vorlage pro Masterkurs (ohne Speichern / ohne PII). */
export async function listDocumentTemplateAssignmentsPreview(): Promise<DocumentTemplateAssignmentsPreview> {
  const { courses: courseRows, templates: templateRows } =
    await loadAssignmentsData();

  const courses = (courseRows ?? []).map((row) =>
    mapCourseRow(row as unknown as Record<string, unknown>)
  );

  const templates = mapTemplateSummaries(
    (templateRows ?? []).map((row) =>
      mapTemplateRow(row as unknown as Record<string, unknown>)
    )
  );

  const items: DocumentTemplateAssignmentItem[] = courses.map((course) => ({
    id: course.id,
    title: course.title,
    mainCategory: course.mainCategory,
    seminar: course.seminar,
    instructionCode: course.instructionCode,
    instructionTitle: course.instructionTitle,
    sortOrder: course.sortOrder,
    documentType: resolveDocumentTypeFromCourseMeta(course),
  }));

  return {
    templates,
    items,
    assignmentStatus: "automatic",
  };
}

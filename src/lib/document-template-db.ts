import type postgres from "postgres";
import { ensureSeeded, getSql } from "./db";
import {
  DOCUMENT_TEMPLATE_CONFIG_SCHEMA_VERSION,
  type DocumentTemplate,
  type DocumentTemplateConfig,
  type DocumentTemplateConfigPatch,
  type DocumentTemplateRevision,
  type DocumentTemplateRevisionStatus,
  type DocumentType,
  type GlobalDocumentTemplateDetail,
  getBuiltinDocumentTemplateConfig,
  mergeDocumentTemplateConfig,
  normalizeDocumentTemplateConfig,
  sanitizeDocumentTemplateConfigForStorage,
} from "./document-template";

const GLOBAL_TEMPLATE_NAMES: Record<DocumentType, string> = {
  certificate: "Globales Standard-Zertifikat",
  proof: "Globaler Standard-Nachweis",
};

const GLOBAL_TEMPLATE_DESCRIPTIONS: Record<DocumentType, string> = {
  certificate:
    "Plattformweite Standardvorlage für ausgestellte Schulungszertifikate.",
  proof: "Plattformweite Standardvorlage für Unterweisungsnachweise.",
};

function toJsonValue(
  config: DocumentTemplateConfig,
  documentType: DocumentType
): postgres.JSONValue {
  return structuredClone(
    sanitizeDocumentTemplateConfigForStorage(config, documentType)
  ) as unknown as postgres.JSONValue;
}

function mapDocumentTemplate(row: Record<string, unknown>): DocumentTemplate {
  return {
    id: Number(row.id),
    companyId: row.company_id != null ? Number(row.company_id) : null,
    documentType: String(row.document_type) as DocumentType,
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    isDefault: Boolean(row.is_default),
    draftRevisionId:
      row.draft_revision_id != null ? Number(row.draft_revision_id) : null,
    publishedRevisionId:
      row.published_revision_id != null
        ? Number(row.published_revision_id)
        : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    createdBy: row.created_by != null ? Number(row.created_by) : null,
  };
}

function mapDocumentTemplateRevision(
  row: Record<string, unknown>,
  documentType: DocumentType = "certificate"
): DocumentTemplateRevision {
  return {
    id: Number(row.id),
    templateId: Number(row.template_id),
    revisionNumber: Number(row.revision_number),
    status: String(row.status) as DocumentTemplateRevisionStatus,
    config: normalizeDocumentTemplateConfig(row.config, documentType),
    configSchemaVersion: Number(row.config_schema_version),
    publishedAt:
      row.published_at != null
        ? new Date(String(row.published_at)).toISOString()
        : null,
    publishedBy: row.published_by != null ? Number(row.published_by) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    supersededAt:
      row.superseded_at != null
        ? new Date(String(row.superseded_at)).toISOString()
        : null,
  };
}

async function findDefaultPublishedRevision(
  sql: postgres.Sql,
  companyId: number | null,
  documentType: DocumentType
): Promise<DocumentTemplateRevision | null> {
  const rows = (await sql`
    SELECT r.*
    FROM document_templates t
    JOIN document_template_revisions r ON r.id = t.published_revision_id
    WHERE t.document_type = ${documentType}
      AND t.is_default = TRUE
      AND t.published_revision_id IS NOT NULL
      AND r.status = 'published'
      AND (
        (${companyId}::bigint IS NULL AND t.company_id IS NULL)
        OR t.company_id = ${companyId}
      )
    LIMIT 1
  `) as Record<string, unknown>[];

  return rows[0] ? mapDocumentTemplateRevision(rows[0], documentType) : null;
}

export async function getDefaultPublishedDocumentTemplateRevision(
  companyId: number | null,
  documentType: DocumentType
): Promise<DocumentTemplateRevision | null> {
  await ensureSeeded();
  const sql = getSql();

  if (companyId != null) {
    const companyRevision = await findDefaultPublishedRevision(
      sql,
      companyId,
      documentType
    );
    if (companyRevision) return companyRevision;
  }

  return findDefaultPublishedRevision(sql, null, documentType);
}

export async function getDocumentTemplateRevisionById(
  id: number
): Promise<DocumentTemplateRevision | null> {
  await ensureSeeded();
  const sql = getSql();
  const rows = (await sql`
    SELECT r.*, t.document_type
    FROM document_template_revisions r
    JOIN document_templates t ON t.id = r.template_id
    WHERE r.id = ${id}
    LIMIT 1
  `) as Record<string, unknown>[];
  if (!rows[0]) return null;
  const documentType = String(rows[0].document_type) as DocumentType;
  return mapDocumentTemplateRevision(rows[0], documentType);
}

export async function listGlobalDocumentTemplates(): Promise<DocumentTemplate[]> {
  await ensureSeeded();
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM document_templates
    WHERE company_id IS NULL
    ORDER BY document_type ASC, name ASC
  `) as Record<string, unknown>[];
  return rows.map(mapDocumentTemplate);
}

export type GlobalDefaultTemplateSummary = {
  templateId: number;
  documentType: DocumentType;
  name: string;
  publishedRevisionId: number | null;
  publishedRevisionNumber: number | null;
};

/** Minimale Metadaten globaler Standardvorlagen – ohne config_json. */
export async function listGlobalDefaultTemplateSummaries(): Promise<
  GlobalDefaultTemplateSummary[]
> {
  const sql = getSql();
  const rows = (await sql`
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
    ORDER BY t.document_type ASC
  `) as Record<string, unknown>[];

  return rows.map((row) => ({
    templateId: Number(row.template_id),
    documentType: String(row.document_type) as DocumentType,
    name: String(row.name),
    publishedRevisionId:
      row.revision_id != null ? Number(row.revision_id) : null,
    publishedRevisionNumber:
      row.revision_number != null ? Number(row.revision_number) : null,
  }));
}

async function getDocumentTemplateRowById(
  sql: postgres.Sql,
  templateId: number
): Promise<DocumentTemplate | null> {
  const rows = (await sql`
    SELECT * FROM document_templates WHERE id = ${templateId} LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? mapDocumentTemplate(rows[0]) : null;
}

export async function getGlobalDocumentTemplateById(
  templateId: number
): Promise<DocumentTemplate | null> {
  await ensureSeeded();
  const template = await getDocumentTemplateRowById(getSql(), templateId);
  if (!template || template.companyId != null) return null;
  return template;
}

async function requireGlobalDocumentTemplate(
  sql: postgres.Sql | postgres.TransactionSql,
  templateId: number,
  forUpdate = false
): Promise<DocumentTemplate> {
  const rows = (await (forUpdate
    ? sql`
        SELECT * FROM document_templates
        WHERE id = ${templateId} AND company_id IS NULL
        FOR UPDATE
      `
    : sql`
        SELECT * FROM document_templates
        WHERE id = ${templateId} AND company_id IS NULL
        LIMIT 1
      `)) as Record<string, unknown>[];
  if (rows.length === 0) throw new Error("TEMPLATE_NOT_FOUND");
  return mapDocumentTemplate(rows[0]);
}

export async function getGlobalDocumentTemplateDetail(
  templateId: number
): Promise<GlobalDocumentTemplateDetail | null> {
  const template = await getGlobalDocumentTemplateById(templateId);
  if (!template) return null;

  const publishedRevision =
    template.publishedRevisionId != null
      ? await getDocumentTemplateRevisionById(template.publishedRevisionId)
      : null;
  const draftRevision =
    template.draftRevisionId != null
      ? await getDocumentTemplateRevisionById(template.draftRevisionId)
      : null;

  return { template, publishedRevision, draftRevision };
}

export async function createGlobalDocumentTemplateDraft(
  templateId: number,
  userId?: number | null
): Promise<GlobalDocumentTemplateDetail> {
  const template = await getGlobalDocumentTemplateById(templateId);
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  await createDraftFromPublished(templateId, userId);
  const detail = await getGlobalDocumentTemplateDetail(templateId);
  if (!detail) throw new Error("TEMPLATE_NOT_FOUND");
  return detail;
}

export async function publishGlobalDocumentTemplateDraft(
  templateId: number,
  userId?: number | null
): Promise<GlobalDocumentTemplateDetail> {
  const template = await getGlobalDocumentTemplateById(templateId);
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  await publishDraftRevision(templateId, userId);
  const detail = await getGlobalDocumentTemplateDetail(templateId);
  if (!detail) throw new Error("TEMPLATE_NOT_FOUND");
  return detail;
}

export async function updateGlobalDocumentTemplateDraftConfig(
  templateId: number,
  patch: DocumentTemplateConfigPatch
): Promise<DocumentTemplateRevision> {
  await ensureSeeded();
  const sql = getSql();

  return sql.begin(async (tx) => {
    const template = await requireGlobalDocumentTemplate(tx, templateId, true);
    if (template.draftRevisionId == null) {
      throw new Error("NO_DRAFT_REVISION");
    }

    const draftRows = (await tx`
      SELECT * FROM document_template_revisions
      WHERE id = ${template.draftRevisionId} AND status = 'draft'
      FOR UPDATE
    `) as Record<string, unknown>[];
    if (draftRows.length === 0) {
      throw new Error("NO_DRAFT_REVISION");
    }
    const draft = mapDocumentTemplateRevision(
      draftRows[0],
      template.documentType
    );
    const config = sanitizeDocumentTemplateConfigForStorage(
      mergeDocumentTemplateConfig(draft.config, patch),
      template.documentType
    );

    const updatedRows = (await tx`
      UPDATE document_template_revisions
      SET config = ${tx.json(toJsonValue(config, template.documentType))}
      WHERE id = ${draft.id} AND status = 'draft'
      RETURNING *
    `) as Record<string, unknown>[];

    await tx`
      UPDATE document_templates SET updated_at = NOW() WHERE id = ${templateId}
    `;

    return mapDocumentTemplateRevision(updatedRows[0], template.documentType);
  });
}

export async function createDraftFromPublished(
  templateId: number,
  publishedBy?: number | null
): Promise<DocumentTemplateRevision> {
  await ensureSeeded();
  const sql = getSql();

  return sql.begin(async (tx) => {
    const templateRows = (await tx`
      SELECT * FROM document_templates WHERE id = ${templateId} FOR UPDATE
    `) as Record<string, unknown>[];
    if (templateRows.length === 0) {
      throw new Error("TEMPLATE_NOT_FOUND");
    }
    const template = mapDocumentTemplate(templateRows[0]);

    if (template.draftRevisionId != null) {
      throw new Error("DRAFT_ALREADY_EXISTS");
    }
    if (template.publishedRevisionId == null) {
      throw new Error("NO_PUBLISHED_REVISION");
    }

    const publishedRows = (await tx`
      SELECT * FROM document_template_revisions
      WHERE id = ${template.publishedRevisionId} AND status = 'published'
      LIMIT 1
    `) as Record<string, unknown>[];
    if (publishedRows.length === 0) {
      throw new Error("NO_PUBLISHED_REVISION");
    }
    const published = mapDocumentTemplateRevision(
      publishedRows[0],
      template.documentType
    );
    const sanitizedConfig = sanitizeDocumentTemplateConfigForStorage(
      published.config,
      template.documentType
    );

    const nextRows = (await tx`
      SELECT COALESCE(MAX(revision_number), 0)::int + 1 AS next_revision
      FROM document_template_revisions
      WHERE template_id = ${templateId}
    `) as Record<string, unknown>[];
    const nextRevision = Number(nextRows[0]?.next_revision ?? 1);

    const inserted = (await tx`
      INSERT INTO document_template_revisions (
        template_id,
        revision_number,
        status,
        config,
        config_schema_version,
        published_by
      )
      VALUES (
        ${templateId},
        ${nextRevision},
        'draft',
        ${tx.json(toJsonValue(sanitizedConfig, template.documentType))},
        ${DOCUMENT_TEMPLATE_CONFIG_SCHEMA_VERSION},
        ${publishedBy ?? null}
      )
      RETURNING *
    `) as Record<string, unknown>[];

    const draft = mapDocumentTemplateRevision(inserted[0], template.documentType);
    await tx`
      UPDATE document_templates
      SET draft_revision_id = ${draft.id}, updated_at = NOW()
      WHERE id = ${templateId}
    `;
    return draft;
  });
}

export async function publishDraftRevision(
  templateId: number,
  publishedBy?: number | null
): Promise<DocumentTemplateRevision> {
  await ensureSeeded();
  const sql = getSql();

  return sql.begin(async (tx) => {
    const templateRows = (await tx`
      SELECT * FROM document_templates WHERE id = ${templateId} FOR UPDATE
    `) as Record<string, unknown>[];
    if (templateRows.length === 0) {
      throw new Error("TEMPLATE_NOT_FOUND");
    }
    const template = mapDocumentTemplate(templateRows[0]);

    if (template.draftRevisionId == null) {
      throw new Error("NO_DRAFT_REVISION");
    }

    const draftRows = (await tx`
      SELECT * FROM document_template_revisions
      WHERE id = ${template.draftRevisionId} AND status = 'draft'
      FOR UPDATE
    `) as Record<string, unknown>[];
    if (draftRows.length === 0) {
      throw new Error("NO_DRAFT_REVISION");
    }
    const draft = mapDocumentTemplateRevision(draftRows[0], template.documentType);

    if (template.publishedRevisionId != null) {
      await tx`
        UPDATE document_template_revisions
        SET status = 'superseded', superseded_at = NOW()
        WHERE id = ${template.publishedRevisionId}
          AND status = 'published'
      `;
    }

    const now = new Date().toISOString();
    const publishedRows = (await tx`
      UPDATE document_template_revisions
      SET
        status = 'published',
        published_at = ${now},
        published_by = ${publishedBy ?? null}
      WHERE id = ${draft.id}
      RETURNING *
    `) as Record<string, unknown>[];
    const published = mapDocumentTemplateRevision(
      publishedRows[0],
      template.documentType
    );

    await tx`
      UPDATE document_templates
      SET
        published_revision_id = ${published.id},
        draft_revision_id = NULL,
        updated_at = NOW()
      WHERE id = ${templateId}
    `;

    return published;
  });
}

async function seedGlobalDocumentTemplate(
  sql: postgres.Sql,
  documentType: DocumentType
): Promise<{ created: boolean; templateId: number; revisionId: number }> {
  const existing = (await sql`
    SELECT id, published_revision_id
    FROM document_templates
    WHERE company_id IS NULL
      AND document_type = ${documentType}
      AND is_default = TRUE
    LIMIT 1
  `) as Record<string, unknown>[];

  if (
    existing.length > 0 &&
    existing[0].published_revision_id != null
  ) {
    return {
      created: false,
      templateId: Number(existing[0].id),
      revisionId: Number(existing[0].published_revision_id),
    };
  }

  const config = getBuiltinDocumentTemplateConfig(documentType);
  const now = new Date().toISOString();

  return sql.begin(async (tx) => {
    let templateId: number;

    if (existing.length > 0) {
      templateId = Number(existing[0].id);

      const linkedPublished = (await tx`
        SELECT id FROM document_template_revisions
        WHERE template_id = ${templateId} AND status = 'published'
        ORDER BY revision_number ASC
        LIMIT 1
      `) as Record<string, unknown>[];
      if (linkedPublished.length > 0) {
        const revisionId = Number(linkedPublished[0].id);
        await tx`
          UPDATE document_templates
          SET
            published_revision_id = ${revisionId},
            draft_revision_id = NULL,
            updated_at = NOW()
          WHERE id = ${templateId}
        `;
        return { created: false, templateId, revisionId };
      }
    } else {
      const inserted = (await tx`
        INSERT INTO document_templates (
          company_id,
          document_type,
          name,
          description,
          is_default
        )
        VALUES (
          NULL,
          ${documentType},
          ${GLOBAL_TEMPLATE_NAMES[documentType]},
          ${GLOBAL_TEMPLATE_DESCRIPTIONS[documentType]},
          TRUE
        )
        RETURNING id
      `) as Record<string, unknown>[];
      templateId = Number(inserted[0].id);
    }

    const revisionRows = (await tx`
      INSERT INTO document_template_revisions (
        template_id,
        revision_number,
        status,
        config,
        config_schema_version,
        published_at
      )
      VALUES (
        ${templateId},
        1,
        'published',
        ${tx.json(toJsonValue(config, documentType))},
        ${DOCUMENT_TEMPLATE_CONFIG_SCHEMA_VERSION},
        ${now}
      )
      RETURNING id
    `) as Record<string, unknown>[];
    const revisionId = Number(revisionRows[0].id);

    await tx`
      UPDATE document_templates
      SET
        published_revision_id = ${revisionId},
        draft_revision_id = NULL,
        updated_at = NOW()
      WHERE id = ${templateId}
    `;

    return { created: true, templateId, revisionId };
  });
}

/** Idempotenter Seed für globale Standardvorlagen (certificate + proof). */
export async function seedGlobalDocumentTemplates(
  sql?: postgres.Sql
): Promise<{
  certificate: { created: boolean; templateId: number; revisionId: number };
  proof: { created: boolean; templateId: number; revisionId: number };
}> {
  const db = sql ?? getSql();
  const certificate = await seedGlobalDocumentTemplate(db, "certificate");
  const proof = await seedGlobalDocumentTemplate(db, "proof");
  return { certificate, proof };
}

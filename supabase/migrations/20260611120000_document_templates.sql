-- Vorlagen für Zertifikate/Nachweise (Designer-Vorbereitung)
-- company_id NULL = globale Certiano-Standardvorlage

CREATE TABLE IF NOT EXISTS document_templates (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('certificate', 'proof')),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  draft_revision_id BIGINT,
  published_revision_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_template_revisions (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'superseded')),
  config JSONB NOT NULL,
  config_schema_version INTEGER NOT NULL DEFAULT 1 CHECK (config_schema_version > 0),
  published_at TIMESTAMPTZ,
  published_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ,
  UNIQUE (template_id, revision_number)
);

ALTER TABLE document_templates
  DROP CONSTRAINT IF EXISTS document_templates_draft_revision_id_fkey;

ALTER TABLE document_templates
  ADD CONSTRAINT document_templates_draft_revision_id_fkey
  FOREIGN KEY (draft_revision_id) REFERENCES document_template_revisions(id)
  ON DELETE SET NULL;

ALTER TABLE document_templates
  DROP CONSTRAINT IF EXISTS document_templates_published_revision_id_fkey;

ALTER TABLE document_templates
  ADD CONSTRAINT document_templates_published_revision_id_fkey
  FOREIGN KEY (published_revision_id) REFERENCES document_template_revisions(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_templates_company_type
  ON document_templates (company_id, document_type);

CREATE INDEX IF NOT EXISTS idx_document_template_revisions_template_status
  ON document_template_revisions (template_id, status);

-- Pro Mandant/Typ höchstens eine Default-Vorlage mit Veröffentlichung
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_one_default_per_scope
  ON document_templates (document_type, COALESCE(company_id, 0))
  WHERE is_default = TRUE AND published_revision_id IS NOT NULL;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS template_revision_id BIGINT
  REFERENCES document_template_revisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_certificates_template_revision
  ON certificates (template_revision_id)
  WHERE template_revision_id IS NOT NULL;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_template_revisions ENABLE ROW LEVEL SECURITY;

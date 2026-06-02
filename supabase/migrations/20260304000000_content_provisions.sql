-- Inhalts-Freigaben pro Firma (Module/Lektionen/Testfragen)
-- Vereinfachung Kursstatus: locked → disabled

CREATE TABLE IF NOT EXISTS company_content_provisions (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('module', 'lesson', 'question')),
  content_id INT NOT NULL,
  parent_module_id INT NOT NULL DEFAULT -1,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  controlled_by TEXT NOT NULL DEFAULT 'superuser',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, course_id, content_type, content_id, parent_module_id)
);

CREATE INDEX IF NOT EXISTS idx_content_provisions_company_course
  ON company_content_provisions (company_id, course_id);

ALTER TABLE company_course_provisions
  ADD COLUMN IF NOT EXISTS disabled_by_superuser BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE company_course_provisions SET status = 'disabled' WHERE status = 'locked';
UPDATE company_course_provisions SET disabled_by_superuser = TRUE WHERE status = 'disabled';

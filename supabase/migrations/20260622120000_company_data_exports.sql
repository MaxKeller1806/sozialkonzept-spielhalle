-- Protokoll für Firmen-Datenexporte (DSGVO, Vertragsende, Datenportabilität)

CREATE TABLE IF NOT EXISTS company_data_exports (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  exported_by_user_id BIGINT NOT NULL REFERENCES users(id),
  export_reason TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_data_exports_company
  ON company_data_exports (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_data_exports_user
  ON company_data_exports (exported_by_user_id);

ALTER TABLE public.company_data_exports ENABLE ROW LEVEL SECURITY;

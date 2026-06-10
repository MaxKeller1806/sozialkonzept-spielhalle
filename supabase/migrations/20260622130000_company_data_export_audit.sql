-- Erweiterung Exportprotokoll: Snapshot, Freitextbegründung, Protokoll-PDF

ALTER TABLE company_data_exports
  ADD COLUMN IF NOT EXISTS custom_reason TEXT,
  ADD COLUMN IF NOT EXISTS export_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS protocol_file_url TEXT;

-- Bestehende Kleinbuchstaben-Gründe auf Großschreibung normalisieren (falls vorhanden)
UPDATE company_data_exports SET export_reason = 'DSGVO_AUSKUNFT' WHERE export_reason = 'dsgvo_auskunft';
UPDATE company_data_exports SET export_reason = 'VERTRAGSENDE' WHERE export_reason = 'vertragsende';
UPDATE company_data_exports SET export_reason = 'DATENUEBERNAHME' WHERE export_reason = 'datenuebernahme';
UPDATE company_data_exports SET export_reason = 'INTERNE_PRUEFUNG' WHERE export_reason = 'interne_pruefung';
UPDATE company_data_exports SET export_reason = 'SONSTIGES' WHERE export_reason = 'sonstiges';

CREATE INDEX IF NOT EXISTS idx_company_data_exports_created
  ON company_data_exports (created_at DESC);

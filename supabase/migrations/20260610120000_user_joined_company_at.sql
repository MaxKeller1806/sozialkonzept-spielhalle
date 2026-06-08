-- Eintrittsdatum des Mitarbeiters in der Firma (optional, für Schulungsfristen)
ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_company_at DATE;

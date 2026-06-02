-- Wiederholungs-/Gültigkeitsregeln für Seminare und Masterkurse
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS validity_type TEXT NOT NULL DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS validity_interval_value INTEGER,
  ADD COLUMN IF NOT EXISTS validity_interval_unit TEXT;

ALTER TABLE master_courses
  ADD COLUMN IF NOT EXISTS validity_type TEXT NOT NULL DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS validity_interval_value INTEGER,
  ADD COLUMN IF NOT EXISTS validity_interval_unit TEXT;

UPDATE courses SET validity_type = 'yearly' WHERE validity_type IS NULL;
UPDATE master_courses SET validity_type = 'yearly' WHERE validity_type IS NULL;

-- Bestehende validity_months als custom-Fallback beibehalten
UPDATE courses
SET validity_type = 'custom',
    validity_interval_value = validity_months,
    validity_interval_unit = 'months'
WHERE validity_months IS NOT NULL
  AND validity_months NOT IN (6, 12, 24)
  AND validity_type = 'yearly';

-- Zertifikate ohne Ablaufdatum (unbegrenzt / einmalig)
ALTER TABLE certificates ALTER COLUMN valid_until DROP NOT NULL;

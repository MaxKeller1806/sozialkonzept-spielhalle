-- Admin-Freigaben firmenweit (statt pro Kurs in company_course_provisions)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS allow_admin_validity_override BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS allow_admin_passing_score_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Bestehende Kurs-Freigaben übernehmen (OR pro Firma), falls Altspalten existieren
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_course_provisions'
      AND column_name = 'allow_admin_validity_override'
  ) THEN
    UPDATE companies c
    SET allow_admin_validity_override = TRUE
    WHERE EXISTS (
      SELECT 1 FROM company_course_provisions p
      WHERE p.company_id = c.id
        AND p.allow_admin_validity_override = TRUE
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_course_provisions'
      AND column_name = 'allow_admin_passing_score_override'
  ) THEN
    UPDATE companies c
    SET allow_admin_passing_score_override = TRUE
    WHERE EXISTS (
      SELECT 1 FROM company_course_provisions p
      WHERE p.company_id = c.id
        AND p.allow_admin_passing_score_override = TRUE
    );
  END IF;
END $$;

ALTER TABLE company_course_provisions
  DROP COLUMN IF EXISTS allow_admin_validity_override;

ALTER TABLE company_course_provisions
  DROP COLUMN IF EXISTS allow_admin_passing_score_override;

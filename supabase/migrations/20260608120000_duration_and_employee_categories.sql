-- Geschätzte Bearbeitungsdauer + firmenbezogene Mitarbeiterkategorien

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

ALTER TABLE master_courses
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

-- BAV-Standardzeiten (Master + Firmenkopien)
UPDATE master_courses
SET estimated_duration_minutes = CASE instruction_code
  WHEN 'N7' THEN 7
  WHEN 'N8' THEN 5
  WHEN 'N9' THEN 6
  WHEN 'N10' THEN 6
  WHEN 'N11' THEN 5
  WHEN 'N19' THEN 6
  WHEN 'N21' THEN 6
  WHEN 'N22' THEN 5
  WHEN 'N24' THEN 6
  WHEN 'N29' THEN 5
  WHEN 'N30' THEN 6
  WHEN 'N37' THEN 5
  WHEN 'N38' THEN 5
  WHEN 'N39' THEN 6
  ELSE estimated_duration_minutes
END
WHERE instruction_code IS NOT NULL;

UPDATE courses
SET estimated_duration_minutes = CASE instruction_code
  WHEN 'N7' THEN 7
  WHEN 'N8' THEN 5
  WHEN 'N9' THEN 6
  WHEN 'N10' THEN 6
  WHEN 'N11' THEN 5
  WHEN 'N19' THEN 6
  WHEN 'N21' THEN 6
  WHEN 'N22' THEN 5
  WHEN 'N24' THEN 6
  WHEN 'N29' THEN 5
  WHEN 'N30' THEN 6
  WHEN 'N37' THEN 5
  WHEN 'N38' THEN 5
  WHEN 'N39' THEN 6
  ELSE estimated_duration_minutes
END
WHERE instruction_code IS NOT NULL;

-- Sozialkonzept: Gesamtdauer (Inhalte unverändert)
UPDATE master_courses
SET estimated_duration_minutes = 40
WHERE instruction_code IS NULL
  AND (slug = 'sozialkonzept' OR main_category = 'Sozialkonzept');

UPDATE courses
SET estimated_duration_minutes = 40
WHERE instruction_code IS NULL
  AND (slug = 'sozialkonzept' OR main_category = 'Sozialkonzept');

-- Mitarbeiterkategorien (firmenbezogen; master_template_id für spätere Superuser-Vorlagen)
CREATE TABLE IF NOT EXISTS employee_categories (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  master_template_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS employee_category_course_assignments (
  id BIGSERIAL PRIMARY KEY,
  employee_category_id BIGINT NOT NULL REFERENCES employee_categories(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_category_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_categories_company
  ON employee_categories(company_id);

CREATE INDEX IF NOT EXISTS idx_employee_category_courses_category
  ON employee_category_course_assignments(employee_category_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employee_category_id BIGINT REFERENCES employee_categories(id) ON DELETE SET NULL;

-- Beispiel-Kategorien für Firma 1 (bearbeitbar durch Admin)
DO $$
DECLARE
  cid BIGINT;
  cat_service BIGINT;
  cat_reinigung BIGINT;
  cat_filialleiter BIGINT;
BEGIN
  SELECT id INTO cid FROM companies WHERE id = 1 LIMIT 1;
  IF cid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO employee_categories (company_id, name, description, active)
  VALUES
    (cid, 'Servicekraft', 'Standard für Service und Thekenbereich', TRUE),
    (cid, 'Reinigungskraft', 'Standard für Reinigungspersonal', TRUE),
    (cid, 'Aufsicht', 'Standard für Aufsichtspersonal', TRUE),
    (cid, 'Schichtleiter', 'Standard für Schichtleitung', TRUE),
    (cid, 'Filialleiter', 'Alle relevanten Schulungen inkl. Sicherheitskonzept', TRUE),
    (cid, 'Verwaltung', 'Standard für Verwaltung', TRUE),
    (cid, 'Aushilfe', 'Reduzierter Standard für Aushilfen', TRUE)
  ON CONFLICT (company_id, name) DO NOTHING;

  SELECT id INTO cat_service FROM employee_categories WHERE company_id = cid AND name = 'Servicekraft';
  SELECT id INTO cat_reinigung FROM employee_categories WHERE company_id = cid AND name = 'Reinigungskraft';
  SELECT id INTO cat_filialleiter FROM employee_categories WHERE company_id = cid AND name = 'Filialleiter';

  IF cat_service IS NOT NULL THEN
    INSERT INTO employee_category_course_assignments (employee_category_id, course_id)
    SELECT cat_service, c.id
    FROM courses c
    WHERE c.company_id = cid
      AND c.active = TRUE
      AND (
        c.slug = 'sozialkonzept'
        OR c.instruction_code IN ('N7', 'N9', 'N10', 'N19', 'N22', 'N24', 'N30')
      )
    ON CONFLICT DO NOTHING;
  END IF;

  IF cat_reinigung IS NOT NULL THEN
    INSERT INTO employee_category_course_assignments (employee_category_id, course_id)
    SELECT cat_reinigung, c.id
    FROM courses c
    WHERE c.company_id = cid
      AND c.active = TRUE
      AND c.instruction_code IN ('N19', 'N22', 'N24', 'N38', 'N39')
    ON CONFLICT DO NOTHING;
  END IF;

  IF cat_filialleiter IS NOT NULL THEN
    INSERT INTO employee_category_course_assignments (employee_category_id, course_id)
    SELECT cat_filialleiter, c.id
    FROM courses c
    WHERE c.company_id = cid
      AND c.active = TRUE
      AND (c.slug = 'sozialkonzept' OR c.instruction_code IS NOT NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

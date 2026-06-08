-- 3-Ebenen-Hierarchie: Hauptkategorie → Seminar → Unterweisung
-- Erweiterung bestehender courses / master_courses (keine Parallelstruktur).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'category'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'main_category'
  ) THEN
    ALTER TABLE courses RENAME COLUMN category TO main_category;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_courses' AND column_name = 'category'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'master_courses' AND column_name = 'main_category'
  ) THEN
    ALTER TABLE master_courses RENAME COLUMN category TO main_category;
  END IF;
END $$;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS main_category TEXT,
  ADD COLUMN IF NOT EXISTS seminar TEXT,
  ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE master_courses
  ADD COLUMN IF NOT EXISTS main_category TEXT,
  ADD COLUMN IF NOT EXISTS seminar TEXT,
  ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN NOT NULL DEFAULT TRUE;

DROP INDEX IF EXISTS idx_courses_category_sort;

CREATE INDEX IF NOT EXISTS idx_courses_hierarchy_sort
  ON courses (company_id, main_category, seminar, sort_order, title)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_master_courses_hierarchy
  ON master_courses (main_category, seminar, sort_order, title);

UPDATE master_courses
SET main_category = 'Sicherheitskonzept'
WHERE main_category = 'Sicherheitskonzept Spielhalle';

UPDATE courses
SET main_category = 'Sicherheitskonzept'
WHERE main_category = 'Sicherheitskonzept Spielhalle';

UPDATE courses
SET
  main_category = 'Sozialkonzept',
  seminar = 'Sozialkonzept'
WHERE slug = 'sozialkonzept'
  AND instruction_code IS NULL
  AND (main_category IS NULL OR main_category = '');

UPDATE master_courses
SET
  main_category = 'Sozialkonzept',
  seminar = 'Sozialkonzept'
WHERE slug = 'sozialkonzept'
  AND instruction_code IS NULL
  AND (main_category IS NULL OR main_category = '');

INSERT INTO master_courses (
  id, slug, title, description, version, passing_score, validity_months,
  validity_type, validity_interval_value, validity_interval_unit,
  content_json, status,
  main_category, seminar, instruction_code, instruction_title,
  sort_order, requires_certificate, requires_proof
)
VALUES
  ('master-bav-n7', 'bav-n7', 'N7 Verhalten bei einem Überfall', 'Unterweisung Sicherheitskonzept', '1.0', 80, 6, 'half_yearly', NULL, NULL, '{"courseId":"master-bav-n7","courseName":"N7 Verhalten bei einem Überfall","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":6,"certificateTitle":"Nachweis N7 Verhalten bei einem Überfall","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Überfallprävention', 'N7', 'Verhalten bei einem Überfall', 110, TRUE, TRUE),
  ('master-bav-n8', 'bav-n8', 'N8 Fahndungsblatt Raubüberfall', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n8","courseName":"N8 Fahndungsblatt Raubüberfall","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N8 Fahndungsblatt Raubüberfall","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Überfallprävention', 'N8', 'Fahndungsblatt Raubüberfall', 120, TRUE, TRUE),
  ('master-bav-n11', 'bav-n11', 'N11 Videoüberwachung', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n11","courseName":"N11 Videoüberwachung","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N11 Videoüberwachung","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Überfallprävention', 'N11', 'Videoüberwachung', 130, TRUE, TRUE),
  ('master-bav-n9', 'bav-n9', 'N9 Umgang mit Bargeldbeständen', 'Unterweisung Sicherheitskonzept', '1.0', 80, 6, 'half_yearly', NULL, NULL, '{"courseId":"master-bav-n9","courseName":"N9 Umgang mit Bargeldbeständen","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":6,"certificateTitle":"Nachweis N9 Umgang mit Bargeldbeständen","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Bargeldsicherheit', 'N9', 'Umgang mit Bargeldbeständen', 210, TRUE, TRUE),
  ('master-bav-n10', 'bav-n10', 'N10 Geldtransporte', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n10","courseName":"N10 Geldtransporte","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N10 Geldtransporte","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Bargeldsicherheit', 'N10', 'Geldtransporte', 220, TRUE, TRUE),
  ('master-bav-n19', 'bav-n19', 'N19 Verhalten im Brandfall und Notfall', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n19","courseName":"N19 Verhalten im Brandfall und Notfall","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N19 Verhalten im Brandfall und Notfall","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Brandschutz & Notfallmanagement', 'N19', 'Verhalten im Brandfall und Notfall', 310, TRUE, TRUE),
  ('master-bav-n21', 'bav-n21', 'N21 Brandbekämpfung', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n21","courseName":"N21 Brandbekämpfung","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N21 Brandbekämpfung","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Brandschutz & Notfallmanagement', 'N21', 'Brandbekämpfung', 320, TRUE, TRUE),
  ('master-bav-n22', 'bav-n22', 'N22 Feuerlöscher', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n22","courseName":"N22 Feuerlöscher","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N22 Feuerlöscher","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Brandschutz & Notfallmanagement', 'N22', 'Feuerlöscher', 330, TRUE, TRUE),
  ('master-bav-n24', 'bav-n24', 'N24 Erste Hilfe', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n24","courseName":"N24 Erste Hilfe","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N24 Erste Hilfe","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Erste Hilfe', 'N24', 'Erste Hilfe', 410, TRUE, TRUE),
  ('master-bav-n29', 'bav-n29', 'N29 Stehleitern', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n29","courseName":"N29 Stehleitern","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N29 Stehleitern","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Arbeitsschutz', 'N29', 'Stehleitern', 510, TRUE, TRUE),
  ('master-bav-n38', 'bav-n38', 'N38 Hautschutz, Hautreinigung und Hautpflege', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n38","courseName":"N38 Hautschutz, Hautreinigung und Hautpflege","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N38 Hautschutz, Hautreinigung und Hautpflege","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Arbeitsschutz', 'N38', 'Hautschutz, Hautreinigung und Hautpflege', 520, TRUE, TRUE),
  ('master-bav-n39', 'bav-n39', 'N39 Ätzende und reizende Reinigungsmittel', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n39","courseName":"N39 Ätzende und reizende Reinigungsmittel","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N39 Ätzende und reizende Reinigungsmittel","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Arbeitsschutz', 'N39', 'Ätzende und reizende Reinigungsmittel', 530, TRUE, TRUE),
  ('master-bav-n30', 'bav-n30', 'N30 Drogenproblematik', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n30","courseName":"N30 Drogenproblematik","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N30 Drogenproblematik","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Sucht- und Drogenprävention', 'N30', 'Drogenproblematik', 610, TRUE, TRUE),
  ('master-bav-n37', 'bav-n37', 'N37 Allergeninformation', 'Unterweisung Sicherheitskonzept', '1.0', 80, 12, 'yearly', NULL, NULL, '{"courseId":"master-bav-n37","courseName":"N37 Allergeninformation","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N37 Allergeninformation","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb, 'published', 'Sicherheitskonzept', 'Hygiene & Lebensmittel', 'N37', 'Allergeninformation', 710, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  validity_type = EXCLUDED.validity_type,
  validity_months = EXCLUDED.validity_months,
  main_category = EXCLUDED.main_category,
  seminar = EXCLUDED.seminar,
  instruction_code = EXCLUDED.instruction_code,
  instruction_title = EXCLUDED.instruction_title,
  sort_order = EXCLUDED.sort_order,
  requires_certificate = EXCLUDED.requires_certificate,
  requires_proof = EXCLUDED.requires_proof,
  status = EXCLUDED.status,
  updated_at = NOW();

UPDATE courses c
SET
  main_category = m.main_category,
  seminar = m.seminar,
  instruction_code = m.instruction_code,
  instruction_title = m.instruction_title,
  sort_order = m.sort_order,
  requires_certificate = m.requires_certificate,
  requires_proof = m.requires_proof,
  validity_type = m.validity_type,
  validity_months = m.validity_months,
  updated_at = NOW()
FROM master_courses m
WHERE c.master_course_id = m.id
  AND m.instruction_code IS NOT NULL;

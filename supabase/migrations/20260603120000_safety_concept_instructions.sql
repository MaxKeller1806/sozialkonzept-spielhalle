-- BAV-Unterweisungen: Metadaten auf bestehenden Kurs-/Master-Tabellen (keine Parallelstruktur).

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS instruction_code TEXT,
  ADD COLUMN IF NOT EXISTS instruction_title TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_certificate BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE master_courses
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS instruction_code TEXT,
  ADD COLUMN IF NOT EXISTS instruction_title TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_certificate BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_courses_instruction_code
  ON master_courses (instruction_code)
  WHERE instruction_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_company_instruction_code
  ON courses (company_id, instruction_code)
  WHERE instruction_code IS NOT NULL AND company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_category_sort
  ON courses (company_id, category, sort_order, title)
  WHERE company_id IS NOT NULL;

-- Master-Unterweisungen Sicherheitskonzept Spielhalle (leeres Inhalts-Template, Certiano pflegt Inhalte).
INSERT INTO master_courses (
  id, slug, title, description, version, passing_score, validity_months,
  validity_type, validity_interval_value, validity_interval_unit,
  content_json, status,
  category, instruction_code, instruction_title, sort_order, requires_certificate
)
VALUES
  (
    'master-bav-n7', 'bav-n7', 'N7 Verhalten bei einem Überfall',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 6,
    'half_yearly', NULL, NULL,
    '{"courseId":"master-bav-n7","courseName":"N7 Verhalten bei einem Überfall","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":6,"certificateTitle":"Nachweis N7 Verhalten bei einem Überfall","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N7', 'Verhalten bei einem Überfall', 10, TRUE
  ),
  (
    'master-bav-n9', 'bav-n9', 'N9 Umgang mit Bargeldbeständen',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 6,
    'half_yearly', NULL, NULL,
    '{"courseId":"master-bav-n9","courseName":"N9 Umgang mit Bargeldbeständen","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":6,"certificateTitle":"Nachweis N9 Umgang mit Bargeldbeständen","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N9', 'Umgang mit Bargeldbeständen', 20, TRUE
  ),
  (
    'master-bav-n10', 'bav-n10', 'N10 Geldtransporte',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n10","courseName":"N10 Geldtransporte","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N10 Geldtransporte","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N10', 'Geldtransporte', 30, TRUE
  ),
  (
    'master-bav-n21', 'bav-n21', 'N21 Brandbekämpfung',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n21","courseName":"N21 Brandbekämpfung","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N21 Brandbekämpfung","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N21', 'Brandbekämpfung', 40, TRUE
  ),
  (
    'master-bav-n22', 'bav-n22', 'N22 Feuerlöscher',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n22","courseName":"N22 Feuerlöscher","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N22 Feuerlöscher","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N22', 'Feuerlöscher', 50, TRUE
  ),
  (
    'master-bav-n24', 'bav-n24', 'N24 Erste Hilfe',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n24","courseName":"N24 Erste Hilfe","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N24 Erste Hilfe","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N24', 'Erste Hilfe', 60, TRUE
  ),
  (
    'master-bav-n29', 'bav-n29', 'N29 Stehleitern',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n29","courseName":"N29 Stehleitern","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N29 Stehleitern","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N29', 'Stehleitern', 70, TRUE
  ),
  (
    'master-bav-n30', 'bav-n30', 'N30 Drogenproblem',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n30","courseName":"N30 Drogenproblem","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N30 Drogenproblem","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N30', 'Drogenproblem', 80, TRUE
  ),
  (
    'master-bav-n37', 'bav-n37', 'N37 Allergeninformation',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n37","courseName":"N37 Allergeninformation","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N37 Allergeninformation","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N37', 'Allergeninformation', 90, TRUE
  ),
  (
    'master-bav-n38', 'bav-n38', 'N38 Hautschutz, Hautreinigung und Hautpflege',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n38","courseName":"N38 Hautschutz, Hautreinigung und Hautpflege","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N38 Hautschutz, Hautreinigung und Hautpflege","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N38', 'Hautschutz, Hautreinigung und Hautpflege', 100, TRUE
  ),
  (
    'master-bav-n39', 'bav-n39', 'N39 Ätzende und reizende Reinigungsmittel',
    'Unterweisung Sicherheitskonzept Spielhalle', '1.0', 80, 12,
    'yearly', NULL, NULL,
    '{"courseId":"master-bav-n39","courseName":"N39 Ätzende und reizende Reinigungsmittel","version":"1.0","durationMinutes":0,"maxDurationMinutes":60,"recommendedMinutes":"—","passingScore":80,"minCorrectAnswers":12,"totalQuestions":15,"certificateValidityMonths":12,"certificateTitle":"Nachweis N39 Ätzende und reizende Reinigungsmittel","examQuestionsPerTest":15,"modules":[],"exam":[]}'::jsonb,
    'published', 'Sicherheitskonzept Spielhalle', 'N39', 'Ätzende und reizende Reinigungsmittel', 110, TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  validity_type = EXCLUDED.validity_type,
  validity_months = EXCLUDED.validity_months,
  category = EXCLUDED.category,
  instruction_code = EXCLUDED.instruction_code,
  instruction_title = EXCLUDED.instruction_title,
  sort_order = EXCLUDED.sort_order,
  requires_certificate = EXCLUDED.requires_certificate,
  status = EXCLUDED.status,
  updated_at = NOW();

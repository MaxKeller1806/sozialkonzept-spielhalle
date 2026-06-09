-- Superuser-Freigaben: Admins dürfen Gültigkeit/Bestehensgrenze bei provisionierten Kursen ändern
ALTER TABLE company_course_provisions
  ADD COLUMN IF NOT EXISTS allow_admin_validity_override BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_course_provisions
  ADD COLUMN IF NOT EXISTS allow_admin_passing_score_override BOOLEAN NOT NULL DEFAULT FALSE;

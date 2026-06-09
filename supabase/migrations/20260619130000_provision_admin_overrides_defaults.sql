-- Idempotent: Defaults für Admin-Freigaben sicherstellen (Standard = nicht freigegeben)
ALTER TABLE company_course_provisions
  ALTER COLUMN allow_admin_validity_override SET DEFAULT FALSE;

ALTER TABLE company_course_provisions
  ALTER COLUMN allow_admin_passing_score_override SET DEFAULT FALSE;

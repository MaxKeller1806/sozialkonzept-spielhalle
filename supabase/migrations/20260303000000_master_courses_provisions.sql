-- Master-Kurse (Certiano) und Firmen-Freigaben mit Bearbeitungsrechten
-- Idempotent; bestehende Firmenkurse bleiben erhalten.

-- ---------------------------------------------------------------------------
-- Master-Kurse
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_courses (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  passing_score INT NOT NULL DEFAULT 80,
  validity_months INT NOT NULL DEFAULT 24,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_courses_status ON master_courses (status);
CREATE INDEX IF NOT EXISTS idx_master_courses_slug ON master_courses (slug);

-- ---------------------------------------------------------------------------
-- Kurs-Freigaben / Bereitstellungen pro Firma
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_course_provisions (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  master_course_id TEXT REFERENCES master_courses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'locked', 'disabled')),
  can_edit_content BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_tests BOOLEAN NOT NULL DEFAULT TRUE,
  can_add_modules BOOLEAN NOT NULL DEFAULT TRUE,
  can_deactivate BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (company_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_provisions_company ON company_course_provisions (company_id);
CREATE INDEX IF NOT EXISTS idx_provisions_master ON company_course_provisions (master_course_id);

ALTER TABLE courses ADD COLUMN IF NOT EXISTS master_course_id TEXT
  REFERENCES master_courses(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Letzter Login (optional, datensparsam für Superuser-Übersicht)
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Bestehende Firmenkurse → Freigaben mit vollen Rechten
-- ---------------------------------------------------------------------------
INSERT INTO company_course_provisions (
  company_id, course_id, master_course_id, status,
  can_edit_content, can_edit_tests, can_add_modules, can_deactivate, assigned_at
)
SELECT
  c.company_id,
  c.id,
  c.master_course_id,
  CASE WHEN c.active THEN 'active' ELSE 'disabled' END,
  TRUE, TRUE, TRUE, TRUE,
  COALESCE(c.created_at, NOW())
FROM courses c
WHERE c.company_id IS NOT NULL
ON CONFLICT (company_id, course_id) DO NOTHING;

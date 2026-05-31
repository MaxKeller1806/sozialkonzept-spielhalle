-- Multi-Tenant: Firmen, SUPERUSER, Kurse in DB, Datenschutz, Lizenzen
-- Idempotent: mehrfach ausführbar auf bestehenden Datenbanken.

-- ---------------------------------------------------------------------------
-- Firmen / Mandanten
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  street TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',
  email TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  login_background_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#000080',
  secondary_color TEXT NOT NULL DEFAULT '#4040a0',
  background_color TEXT NOT NULL DEFAULT '#f8fafc',
  accent_color TEXT NOT NULL DEFAULT '#2563eb',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'disabled', 'expired')),
  license_key_hash TEXT,
  license_status TEXT NOT NULL DEFAULT 'unlicensed'
    CHECK (license_status IN ('unlicensed', 'active', 'expired', 'disabled')),
  license_expires_at TIMESTAMPTZ,
  license_activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies (slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies (status);

-- Standardfirma ZUERST anlegen (wird für Backfill aller company_id benötigt)
INSERT INTO companies (
  slug, name, status, license_status, license_activated_at,
  primary_color, secondary_color, background_color, accent_color
)
VALUES (
  'standard', 'Standard Spielhalle GmbH', 'active', 'active', NOW(),
  '#000080', '#4040a0', '#f8fafc', '#2563eb'
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Nutzer erweitern
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superuser', 'admin', 'employee'));

-- ---------------------------------------------------------------------------
-- Kurse erweitern (Inhalte pro Firma in JSONB)
-- ---------------------------------------------------------------------------
ALTER TABLE courses ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS content_json JSONB;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_company_slug
  ON courses (company_id, slug) WHERE company_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Kurszuweisungen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_course_assignments (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_course_assignments_user
  ON user_course_assignments (user_id);

-- ---------------------------------------------------------------------------
-- Fortschritt / Zertifikate / Feedback – company_id nullable hinzufügen
-- ---------------------------------------------------------------------------
ALTER TABLE training_attempts ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id);

-- ---------------------------------------------------------------------------
-- Zertifikatszähler pro Firma – zuerst nullable Spalte
-- ---------------------------------------------------------------------------
ALTER TABLE certificate_counters ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id);

-- ---------------------------------------------------------------------------
-- Datenschutzerklärung
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_policy_acceptances (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  version_id BIGINT NOT NULL REFERENCES privacy_policy_versions(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_accept_user_version
  ON privacy_policy_acceptances (user_id, version_id);

-- ---------------------------------------------------------------------------
-- Bestehende Daten → Standardfirma (Backfill vor NOT NULL)
-- ---------------------------------------------------------------------------
UPDATE users
SET company_id = (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1)
WHERE company_id IS NULL AND role IN ('admin', 'employee');

UPDATE courses
SET
  company_id = (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1),
  slug = COALESCE(slug, 'sozialkonzept'),
  active = TRUE
WHERE company_id IS NULL;

UPDATE training_attempts ta
SET company_id = COALESCE(u.company_id, (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1))
FROM users u
WHERE ta.user_id = u.id AND ta.company_id IS NULL;

UPDATE certificates c
SET company_id = COALESCE(u.company_id, (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1))
FROM users u
WHERE c.user_id = u.id AND c.company_id IS NULL;

UPDATE feedback f
SET company_id = COALESCE(u.company_id, (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1))
FROM users u
WHERE f.user_id = u.id AND f.company_id IS NULL;

UPDATE certificate_counters
SET company_id = (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1)
WHERE company_id IS NULL;

-- certificate_counters: NOT NULL + zusammengesetzter PK (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'certificate_counters'
      AND column_name = 'company_id'
      AND is_nullable = 'YES'
  ) THEN
    UPDATE certificate_counters
    SET company_id = (SELECT id FROM companies WHERE slug = 'standard' LIMIT 1)
    WHERE company_id IS NULL;

    ALTER TABLE certificate_counters ALTER COLUMN company_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.certificate_counters'::regclass
      AND c.contype = 'p'
      AND a.attname = 'company_id'
  ) THEN
    ALTER TABLE certificate_counters DROP CONSTRAINT IF EXISTS certificate_counters_pkey;
    ALTER TABLE certificate_counters ADD PRIMARY KEY (company_id, year);
  END IF;
END $$;

INSERT INTO user_course_assignments (user_id, course_id)
SELECT u.id, c.id
FROM users u
JOIN courses c ON c.company_id = u.company_id
WHERE u.role = 'employee'
ON CONFLICT DO NOTHING;

INSERT INTO privacy_policy_versions (version, title, content, active)
VALUES (
  '1.0',
  'Datenschutzerklärung',
  E'Datenschutzerklärung\n\nWir verarbeiten personenbezogene Daten ausschließlich zum Zweck der Durchführung und Dokumentation der internen Schulungen.\n\nVerantwortlich ist Ihr Arbeitgeber bzw. die jeweilige Spielhallen-Firma, die diese Plattform nutzt.\n\nErhobene Daten umfassen insbesondere Name, E-Mail, Geburtsdatum, Fortschritt in Schulungen, Prüfungsergebnisse und ausgestellte Zertifikate.\n\nDie Daten werden nur so lange gespeichert, wie es für Schulungsnachweis und gesetzliche Aufbewahrungspflichten erforderlich ist.\n\nSie haben das Recht auf Auskunft, Berichtigung und Löschung im Rahmen der gesetzlichen Vorgaben.\n\nMit Bestätigung erklären Sie, dass Sie diese Datenschutzerklärung gelesen und verstanden haben.',
  TRUE
)
ON CONFLICT (version) DO NOTHING;

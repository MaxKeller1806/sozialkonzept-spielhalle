-- Verantwortliche Personen pro Firmenkurs (Seminar), nicht mehr freie Typen.

CREATE TABLE IF NOT EXISTS course_responsible_users (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_responsible_users_company_course
  ON course_responsible_users (company_id, course_id);

CREATE INDEX IF NOT EXISTS idx_course_responsible_users_user
  ON course_responsible_users (user_id);

ALTER TABLE course_responsible_users ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE course_responsible_users IS
  'Verantwortliche Mitarbeiter je Firmenkurs/Seminar (ersetzt fachlich company_responsibilities).';

-- Bestehende Zuordnungen über Hauptthemen-Slug → passende Firmenkurse übernehmen.
INSERT INTO course_responsible_users (company_id, course_id, user_id, assigned_at)
SELECT DISTINCT
  cr.company_id,
  c.id AS course_id,
  cr.user_id,
  COALESCE(cr.assigned_at, NOW()) AS assigned_at
FROM company_responsibilities cr
JOIN responsibility_types rt ON rt.id = cr.responsibility_type_id
JOIN courses c ON c.company_id = cr.company_id AND c.active = TRUE
LEFT JOIN course_topic_assignments cta ON cta.course_id = c.id
LEFT JOIN course_topics ct ON ct.id = cta.topic_id
LEFT JOIN course_topics ct_legacy ON ct_legacy.id = c.topic_id
WHERE cr.user_id IS NOT NULL
  AND (
    LOWER(ct.slug) = LOWER(rt.slug)
    OR LOWER(ct_legacy.slug) = LOWER(rt.slug)
  )
ON CONFLICT (company_id, course_id, user_id) DO NOTHING;

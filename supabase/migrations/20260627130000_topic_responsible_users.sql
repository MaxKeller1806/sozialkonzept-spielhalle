-- Standard-Verantwortliche je Hauptthema (Firma); Seminare erben, bis individuell überschrieben.

CREATE TABLE IF NOT EXISTS topic_responsible_users (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  topic_id BIGINT NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_responsible_users_company_topic
  ON topic_responsible_users (company_id, topic_id);

ALTER TABLE topic_responsible_users ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE topic_responsible_users IS
  'Standard-Verantwortliche je Hauptthema; gilt für alle Seminare des Themas ohne individuelle Überschreibung.';

-- Kennzeichnet Seminare mit eigener Zuordnung (nicht mehr vom Hauptthema geerbt).
CREATE TABLE IF NOT EXISTS course_responsibility_overrides (
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, course_id)
);

ALTER TABLE course_responsibility_overrides ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE course_responsibility_overrides IS
  'Seminar hat individuelle Verantwortliche (course_responsible_users), unabhängig vom Hauptthema.';

-- Bisher direkt gesetzte Kurs-Zuordnungen als individuelle Überschreibung markieren.
INSERT INTO course_responsibility_overrides (company_id, course_id)
SELECT DISTINCT company_id, course_id
FROM course_responsible_users
ON CONFLICT (company_id, course_id) DO NOTHING;

-- Mehrfach-Hauptthemen pro Kurs/Masterkurs (Mapping-Tabellen)
CREATE TABLE IF NOT EXISTS master_course_topics (
  id BIGSERIAL PRIMARY KEY,
  master_course_id TEXT NOT NULL REFERENCES master_courses(id) ON DELETE CASCADE,
  topic_id BIGINT NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (master_course_id, topic_id)
);

CREATE TABLE IF NOT EXISTS course_topic_assignments (
  id BIGSERIAL PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_id BIGINT NOT NULL REFERENCES course_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_master_course_topics_master
  ON master_course_topics (master_course_id);

CREATE INDEX IF NOT EXISTS idx_master_course_topics_topic
  ON master_course_topics (topic_id);

CREATE INDEX IF NOT EXISTS idx_course_topic_assignments_course
  ON course_topic_assignments (course_id);

CREATE INDEX IF NOT EXISTS idx_course_topic_assignments_topic
  ON course_topic_assignments (topic_id);

-- Legacy topic_id → Mapping-Tabellen (idempotent)
INSERT INTO master_course_topics (master_course_id, topic_id, created_at, updated_at)
SELECT mc.id, mc.topic_id, NOW(), NOW()
FROM master_courses mc
WHERE mc.topic_id IS NOT NULL
ON CONFLICT (master_course_id, topic_id) DO NOTHING;

INSERT INTO course_topic_assignments (course_id, topic_id, created_at, updated_at)
SELECT c.id, c.topic_id, NOW(), NOW()
FROM courses c
WHERE c.topic_id IS NOT NULL
ON CONFLICT (course_id, topic_id) DO NOTHING;

-- Legacy-Spalte courses.topic_id mit erstem Thema synchron halten
UPDATE courses c
SET topic_id = sub.topic_id, updated_at = NOW()
FROM (
  SELECT cta.course_id, MIN(cta.topic_id) AS topic_id
  FROM course_topic_assignments cta
  GROUP BY cta.course_id
) sub
WHERE c.id = sub.course_id
  AND (c.topic_id IS NULL OR c.topic_id <> sub.topic_id);

UPDATE master_courses mc
SET topic_id = sub.topic_id, updated_at = NOW()
FROM (
  SELECT mct.master_course_id, MIN(mct.topic_id) AS topic_id
  FROM master_course_topics mct
  GROUP BY mct.master_course_id
) sub
WHERE mc.id = sub.master_course_id
  AND (mc.topic_id IS NULL OR mc.topic_id <> sub.topic_id);

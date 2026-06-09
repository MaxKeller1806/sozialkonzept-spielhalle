-- Hauptthemen für Seminar-Gruppierung (Navigationslogik, keine Parallel-Kursarchitektur)
CREATE TABLE IF NOT EXISTS course_topics (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_topics_global_slug
  ON course_topics (slug)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_topics_company_slug
  ON course_topics (company_id, slug)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_topics_company_id
  ON course_topics (company_id);

CREATE INDEX IF NOT EXISTS idx_course_topics_active
  ON course_topics (active);

ALTER TABLE master_courses
  ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES course_topics(id) ON DELETE SET NULL;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES course_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_master_courses_topic_id
  ON master_courses (topic_id);

CREATE INDEX IF NOT EXISTS idx_courses_company_topic
  ON courses (company_id, topic_id);

-- Globale Hauptthemen (Superuser-Vorlagen, idempotent)
INSERT INTO course_topics (company_id, name, slug, sort_order, active)
SELECT NULL, v.name, v.slug, v.sort_order, TRUE
FROM (VALUES
  ('Sozialkonzept', 'sozialkonzept', 10),
  ('Sicherheitskonzept', 'sicherheitskonzept', 20),
  ('Datenschutz', 'datenschutz', 30),
  ('Arbeitsschutz', 'arbeitsschutz', 40),
  ('Brandschutz', 'brandschutz', 50),
  ('Erste Hilfe', 'erste-hilfe', 60),
  ('Geldwäsche', 'geldwaesche', 70),
  ('Allgemein', 'allgemein', 80)
) AS v(name, slug, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM course_topics ct
  WHERE ct.company_id IS NULL AND ct.slug = v.slug
);

-- Vorsichtige automatische Zuordnung (nur wo topic_id noch NULL)
UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'datenschutz'
  AND mc.topic_id IS NULL
  AND (mc.title ILIKE '%datenschutz%' OR mc.instruction_title ILIKE '%datenschutz%');

UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'sozialkonzept'
  AND mc.topic_id IS NULL
  AND (
    mc.main_category ILIKE '%sozialkonzept%'
    OR mc.title ILIKE '%sozialkonzept%'
  );

UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'brandschutz'
  AND mc.topic_id IS NULL
  AND (
    mc.title ILIKE '%brandschutz%'
    OR mc.title ILIKE '%feuerlöscher%'
    OR mc.title ILIKE '%feuerloescher%'
  );

UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'erste-hilfe'
  AND mc.topic_id IS NULL
  AND mc.title ILIKE '%erste hilfe%';

UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'geldwaesche'
  AND mc.topic_id IS NULL
  AND (
    mc.title ILIKE '%geldwäsche%'
    OR mc.title ILIKE '%geldwaesche%'
  );

UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'arbeitsschutz'
  AND mc.topic_id IS NULL
  AND (
    mc.title ILIKE '%flucht%'
    OR mc.title ILIKE '%rettungsweg%'
    OR mc.title ILIKE '%arbeitsschutz%'
  );

UPDATE master_courses mc
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'sicherheitskonzept'
  AND mc.topic_id IS NULL
  AND (
    mc.main_category ILIKE '%sicherheitskonzept%'
    OR mc.instruction_code ~ '^N[0-9]+'
  );

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'datenschutz'
  AND c.topic_id IS NULL
  AND (c.title ILIKE '%datenschutz%' OR c.instruction_title ILIKE '%datenschutz%');

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'sozialkonzept'
  AND c.topic_id IS NULL
  AND (
    c.main_category ILIKE '%sozialkonzept%'
    OR c.title ILIKE '%sozialkonzept%'
  );

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'brandschutz'
  AND c.topic_id IS NULL
  AND (
    c.title ILIKE '%brandschutz%'
    OR c.title ILIKE '%feuerlöscher%'
    OR c.title ILIKE '%feuerloescher%'
  );

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'erste-hilfe'
  AND c.topic_id IS NULL
  AND c.title ILIKE '%erste hilfe%';

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'geldwaesche'
  AND c.topic_id IS NULL
  AND (
    c.title ILIKE '%geldwäsche%'
    OR c.title ILIKE '%geldwaesche%'
  );

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'arbeitsschutz'
  AND c.topic_id IS NULL
  AND (
    c.title ILIKE '%flucht%'
    OR c.title ILIKE '%rettungsweg%'
    OR c.title ILIKE '%arbeitsschutz%'
  );

UPDATE courses c
SET topic_id = t.id, updated_at = NOW()
FROM course_topics t
WHERE t.company_id IS NULL AND t.slug = 'sicherheitskonzept'
  AND c.topic_id IS NULL
  AND (
    c.main_category ILIKE '%sicherheitskonzept%'
    OR c.instruction_code ~ '^N[0-9]+'
  );

-- Firmenkurse: topic_id vom Master übernehmen wo noch leer
UPDATE courses c
SET topic_id = mc.topic_id, updated_at = NOW()
FROM master_courses mc
WHERE c.master_course_id = mc.id
  AND c.topic_id IS NULL
  AND mc.topic_id IS NOT NULL;

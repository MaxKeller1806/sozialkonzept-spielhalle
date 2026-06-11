-- Fragenpool-System: Prüfungsfragen getrennt von Seminarinhalten (content_json.exam)

CREATE TABLE IF NOT EXISTS question_pool (
  id BIGSERIAL PRIMARY KEY,
  course_id TEXT NOT NULL,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('master', 'company')),
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single', 'multiple', 'boolean', 'situation')),
  answer_a TEXT,
  answer_b TEXT,
  answer_c TEXT,
  answer_d TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')),
  module_id INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_pool_source_company CHECK (
    (source_type = 'master' AND company_id IS NULL)
    OR (source_type = 'company' AND company_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_question_pool_course
  ON question_pool (course_id, source_type, active);

CREATE INDEX IF NOT EXISTS idx_question_pool_company_course
  ON question_pool (company_id, course_id, active)
  WHERE company_id IS NOT NULL;

-- Master-Seminare: exam[] aus content_json in Fragenpool übernehmen
INSERT INTO question_pool (
  course_id,
  company_id,
  source_type,
  question,
  question_type,
  answer_a,
  answer_b,
  answer_c,
  answer_d,
  correct_answer,
  module_id,
  active
)
SELECT
  mc.id,
  NULL,
  'master',
  COALESCE(q->>'question', ''),
  COALESCE(q->>'type', 'single'),
  q->'answers'->>0,
  q->'answers'->>1,
  q->'answers'->>2,
  q->'answers'->>3,
  CASE
    WHEN COALESCE(q->>'type', 'single') = 'boolean' THEN COALESCE(q->>'correct', 'true')
    ELSE COALESCE((q->'correct')::text, q->>'correct', '0')
  END,
  NULLIF(q->>'moduleId', '')::INTEGER,
  TRUE
FROM master_courses mc
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(mc.content_json->'exam', '[]'::jsonb)) AS q
WHERE COALESCE(q->>'question', '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM question_pool qp
    WHERE qp.course_id = mc.id AND qp.source_type = 'master'
  );

-- Eigene Firmenseminare (ohne Master-Vorlage)
INSERT INTO question_pool (
  course_id,
  company_id,
  source_type,
  question,
  question_type,
  answer_a,
  answer_b,
  answer_c,
  answer_d,
  correct_answer,
  module_id,
  active
)
SELECT
  c.id,
  c.company_id,
  'company',
  COALESCE(q->>'question', ''),
  COALESCE(q->>'type', 'single'),
  q->'answers'->>0,
  q->'answers'->>1,
  q->'answers'->>2,
  q->'answers'->>3,
  CASE
    WHEN COALESCE(q->>'type', 'single') = 'boolean' THEN COALESCE(q->>'correct', 'true')
    ELSE COALESCE((q->'correct')::text, q->>'correct', '0')
  END,
  NULLIF(q->>'moduleId', '')::INTEGER,
  TRUE
FROM courses c
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.content_json->'exam', '[]'::jsonb)) AS q
WHERE c.master_course_id IS NULL
  AND c.company_id IS NOT NULL
  AND COALESCE(q->>'question', '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM question_pool qp
    WHERE qp.course_id = c.id AND qp.source_type = 'company' AND qp.company_id = c.company_id
  );

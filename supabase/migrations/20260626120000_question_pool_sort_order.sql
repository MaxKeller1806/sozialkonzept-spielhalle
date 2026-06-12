-- Sortierreihenfolge für Fragenpool-Anzeige (UI-Nummerierung 1…n)

ALTER TABLE question_pool
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id, source_type, COALESCE(company_id, 0)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM question_pool
)
UPDATE question_pool qp
SET sort_order = ordered.rn
FROM ordered
WHERE qp.id = ordered.id;

CREATE INDEX IF NOT EXISTS idx_question_pool_sort
  ON question_pool (course_id, source_type, sort_order, created_at, id);

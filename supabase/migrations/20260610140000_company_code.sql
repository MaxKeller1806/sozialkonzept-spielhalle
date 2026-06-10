-- Feste Firmen-ID (F0001, F0002, …) – fortlaufend, eindeutig, nicht wiederverwendbar

CREATE SEQUENCE IF NOT EXISTS company_code_seq START 1;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_code TEXT;

-- Bestehende Firmen ohne Code nacheinander nummerieren (Reihenfolge nach created_at, id)
WITH max_code AS (
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(company_code FROM 2) AS INTEGER)),
    0
  ) AS m
  FROM companies
  WHERE company_code ~ '^F[0-9]+$'
),
numbered AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (ORDER BY c.created_at, c.id) AS rn
  FROM companies c
  WHERE c.company_code IS NULL
)
UPDATE companies c
SET company_code = 'F' || LPAD((mc.m + n.rn)::text, 4, '0')
FROM numbered n
CROSS JOIN max_code mc
WHERE c.id = n.id;

-- Sequenz hinter höchste vergebene Nummer setzen (Lücken bleiben erhalten)
SELECT setval(
  'company_code_seq',
  GREATEST(
    1,
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING(company_code FROM 2) AS INTEGER))
        FROM companies
        WHERE company_code ~ '^F[0-9]+$'
      ),
      0
    ) + 1
  ),
  false
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM companies WHERE company_code IS NULL) THEN
    ALTER TABLE companies ALTER COLUMN company_code SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS companies_company_code_unique
  ON companies (company_code);

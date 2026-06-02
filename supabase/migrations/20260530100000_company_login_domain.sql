-- Custom login domain per tenant (e.g. schulung.kundendomain.de)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS login_domain TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_login_domain_lower
  ON companies (LOWER(login_domain))
  WHERE login_domain IS NOT NULL;

-- Ensure standard company slug exists (idempotent)
UPDATE companies SET slug = 'standard' WHERE slug IS NULL OR TRIM(slug) = '';

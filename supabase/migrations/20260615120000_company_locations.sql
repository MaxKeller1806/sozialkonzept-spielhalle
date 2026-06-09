-- Standortstruktur pro Firma (kein eigener Mandant)
CREATE TABLE IF NOT EXISTS company_locations (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'DE',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_locations_company_id
  ON company_locations (company_id);

CREATE INDEX IF NOT EXISTS idx_company_locations_company_active
  ON company_locations (company_id, active);

ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id BIGINT
  REFERENCES company_locations(id) ON DELETE SET NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_scope TEXT NOT NULL DEFAULT 'company';

ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_location_id BIGINT
  REFERENCES company_locations(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_admin_scope_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_admin_scope_check
      CHECK (admin_scope IN ('company', 'location'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_company_location
  ON users (company_id, location_id);

CREATE INDEX IF NOT EXISTS idx_users_admin_location
  ON users (admin_location_id);

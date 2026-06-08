-- Austrittsdatum (optional, nur Admin pflegbar)
ALTER TABLE users ADD COLUMN IF NOT EXISTS left_company_at DATE;

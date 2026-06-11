-- Passwort-Zurücksetzen-Anfragen (Admin-Bearbeitung, kein Self-Service-Token)

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  company_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'completed', 'dismissed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled_at TIMESTAMPTZ,
  handled_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_company_status
  ON password_reset_requests (company_id, status);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_requested
  ON password_reset_requests (LOWER(email), requested_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_requests_open_email_company
  ON password_reset_requests (company_id, LOWER(email))
  WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_requests_open_user
  ON password_reset_requests (company_id, user_id)
  WHERE status = 'open' AND user_id IS NOT NULL;

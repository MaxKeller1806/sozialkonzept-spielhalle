-- Mehrfach-Standortzuordnung pro Mitarbeiter (Hauptstandort weiter in users.location_id)
CREATE TABLE IF NOT EXISTS user_locations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id BIGINT NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, location_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_locations_one_primary
  ON user_locations (user_id)
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id
  ON user_locations (user_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_location_id
  ON user_locations (location_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_location_user
  ON user_locations (location_id, user_id);

-- Bestehende Hauptstandorte übernehmen
INSERT INTO user_locations (user_id, location_id, is_primary, created_at, updated_at)
SELECT u.id, u.location_id, TRUE, NOW(), NOW()
FROM users u
WHERE u.location_id IS NOT NULL
ON CONFLICT (user_id, location_id) DO UPDATE
  SET is_primary = TRUE, updated_at = NOW();

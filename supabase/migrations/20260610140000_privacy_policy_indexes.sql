-- Schneller Lookup der aktiven Datenschutzversion
CREATE INDEX IF NOT EXISTS idx_privacy_policy_versions_active
ON privacy_policy_versions (effective_from DESC, id DESC)
WHERE active = TRUE;

-- idx_privacy_accept_user_version (user_id, version_id) existiert bereits als UNIQUE INDEX

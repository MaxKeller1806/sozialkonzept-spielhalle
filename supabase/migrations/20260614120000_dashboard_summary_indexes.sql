-- Dashboard summary: set-based lookups on certificates and training_attempts
CREATE INDEX IF NOT EXISTS idx_certificates_user_course_issued
  ON certificates (user_id, course_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_attempts_user_course_completed
  ON training_attempts (user_id, course_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_attempts_user_course_in_progress
  ON training_attempts (user_id, course_id)
  WHERE completed_at IS NULL;

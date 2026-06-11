-- N7 „Verhalten bei einem Überfall“ – Metadaten Version 2.0
-- Vollständige Inhalte und Fragenpool: npm run seed:safety

UPDATE master_courses
SET
  version = '2.0',
  estimated_duration_minutes = 6,
  updated_at = NOW()
WHERE instruction_code = 'N7';

UPDATE courses
SET
  version = '2.0',
  estimated_duration_minutes = 6,
  updated_at = NOW()
WHERE master_course_id = 'master-bav-n7'
   OR instruction_code = 'N7';

-- Zusätzliche Mitarbeiterfelder: Geburtsort, Wohnort

ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS place_of_residence TEXT;

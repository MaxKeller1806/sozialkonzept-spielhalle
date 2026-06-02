-- Mitarbeiter-Adressfelder (Straße, Hausnummer, PLZ, Ort)

ALTER TABLE users ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;

-- Bestehenden Wohnort als Ort übernehmen
UPDATE users
SET city = place_of_residence
WHERE city IS NULL AND place_of_residence IS NOT NULL AND place_of_residence != '';

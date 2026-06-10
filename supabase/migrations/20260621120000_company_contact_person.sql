-- Ansprechpartner der Firma (optional; E-Mail/Telefon für spätere Erweiterung)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person_email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person_phone TEXT;

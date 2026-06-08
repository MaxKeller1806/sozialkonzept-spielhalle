-- Firmenspezifische Signatur für Zertifikate/Nachweise (nicht global im Template)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS cert_signature_person TEXT,
  ADD COLUMN IF NOT EXISTS cert_signature_position TEXT,
  ADD COLUMN IF NOT EXISTS cert_signature_text TEXT;

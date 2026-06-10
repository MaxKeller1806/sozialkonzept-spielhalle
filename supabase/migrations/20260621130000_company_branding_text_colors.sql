-- Schriftfarben für Branding (Lesbarkeit / Kontrast)

ALTER TABLE companies ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS text_secondary_color TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS menu_text_color TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS button_text_color TEXT;

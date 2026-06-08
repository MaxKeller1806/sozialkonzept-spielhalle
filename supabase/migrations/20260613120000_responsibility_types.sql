-- Fachliche Verantwortlichkeiten (getrennt von Rollen und Mitarbeiterkategorien)

CREATE TABLE IF NOT EXISTS responsibility_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_responsibilities (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  responsibility_type_id BIGINT NOT NULL REFERENCES responsibility_types(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, responsibility_type_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_types_active
  ON responsibility_types (active);

CREATE INDEX IF NOT EXISTS idx_responsibility_types_sort_order
  ON responsibility_types (sort_order);

CREATE INDEX IF NOT EXISTS idx_responsibility_types_active_sort
  ON responsibility_types (active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_company_responsibilities_company
  ON company_responsibilities (company_id);

CREATE INDEX IF NOT EXISTS idx_company_responsibilities_type
  ON company_responsibilities (responsibility_type_id);

CREATE INDEX IF NOT EXISTS idx_company_responsibilities_user
  ON company_responsibilities (user_id);

ALTER TABLE public.responsibility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_responsibilities ENABLE ROW LEVEL SECURITY;

INSERT INTO responsibility_types (name, slug, description, sort_order)
VALUES
  ('Sozialkonzept', 'sozialkonzept', 'Verantwortliche Person für das Sozialkonzept', 10),
  ('Sicherheitskonzept', 'sicherheitskonzept', 'Verantwortliche Person für das Sicherheitskonzept', 20),
  ('Datenschutz', 'datenschutz', 'Verantwortliche Person für den Datenschutz', 30),
  ('Geldwäsche', 'geldwaesche', 'Verantwortliche Person für Geldwäsche-Prävention', 40),
  ('Arbeitsschutz', 'arbeitsschutz', 'Verantwortliche Person für Arbeitsschutz', 50),
  ('Brandschutz', 'brandschutz', 'Verantwortliche Person für Brandschutz', 60),
  ('Erste Hilfe', 'erste-hilfe', 'Verantwortliche Person für Erste Hilfe', 70)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

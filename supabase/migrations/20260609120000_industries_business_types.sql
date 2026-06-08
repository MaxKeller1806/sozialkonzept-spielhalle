-- Branchen / Betriebstypen für Superuser-Firmenverwaltung
-- Idempotent, bestehende Firmen bleiben mit NULL-Werten lauffähig.

CREATE TABLE IF NOT EXISTS industries (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_types (
  id BIGSERIAL PRIMARY KEY,
  industry_id BIGINT NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (industry_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_industries_active_sort
  ON industries (active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_business_types_industry
  ON business_types (industry_id, active, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_business_types_industry_slug
  ON business_types (industry_id, slug);

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS industry_id BIGINT REFERENCES industries(id) ON DELETE SET NULL;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS business_type_id BIGINT REFERENCES business_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_industry
  ON companies (industry_id);

CREATE INDEX IF NOT EXISTS idx_companies_business_type
  ON companies (business_type_id);

-- Vorbereitung für spätere Seminar-/Kategorie-Empfehlungen (noch ohne App-Logik)
CREATE TABLE IF NOT EXISTS industry_master_course_recommendations (
  id BIGSERIAL PRIMARY KEY,
  industry_id BIGINT NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  master_course_id TEXT NOT NULL REFERENCES master_courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (industry_id, master_course_id)
);

CREATE TABLE IF NOT EXISTS business_type_master_course_recommendations (
  id BIGSERIAL PRIMARY KEY,
  business_type_id BIGINT NOT NULL REFERENCES business_types(id) ON DELETE CASCADE,
  master_course_id TEXT NOT NULL REFERENCES master_courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_type_id, master_course_id)
);

CREATE TABLE IF NOT EXISTS business_type_employee_category_templates (
  id BIGSERIAL PRIMARY KEY,
  business_type_id BIGINT NOT NULL REFERENCES business_types(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_master_course_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_type_master_course_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_type_employee_category_templates ENABLE ROW LEVEL SECURITY;

-- Branchen (idempotent)
INSERT INTO industries (name, slug, description, active, sort_order)
VALUES
  ('Glücksspiel', 'gluecksspiel', 'Spielhallen, Wettbüros und verwandte Betriebe', TRUE, 10),
  ('Gastronomie', 'gastronomie', 'Restaurants, Bars und Gastronomiebetriebe', TRUE, 20),
  ('Hotellerie', 'hotellerie', 'Hotels, Pensionen und Beherbergung', TRUE, 30),
  ('Allgemein', 'allgemein', 'Sonstige Branchen und Betriebe', TRUE, 90)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Betriebstypen (idempotent über industry_id + slug)
INSERT INTO business_types (industry_id, name, slug, description, active, sort_order)
SELECT i.id, v.name, v.slug, v.description, TRUE, v.sort_order
FROM industries i
JOIN (VALUES
  ('gluecksspiel', 'Spielhalle', 'spielhalle', 'Spielhalle / Gastro-Spielothek', 10),
  ('gluecksspiel', 'Wettbüro', 'wettbuero', 'Wettannahmestelle / Wettbüro', 20),
  ('gastronomie', 'Restaurant', 'restaurant', 'Restaurant', 10),
  ('gastronomie', 'Bar', 'bar', 'Bar / Lounge', 20),
  ('gastronomie', 'Bowlingcenter', 'bowlingcenter', 'Bowlingcenter', 30),
  ('gastronomie', 'Eventlocation', 'eventlocation', 'Eventlocation / Veranstaltungsbetrieb', 40),
  ('hotellerie', 'Hotel', 'hotel', 'Hotel', 10),
  ('hotellerie', 'Pension', 'pension', 'Pension / Gästehaus', 20),
  ('hotellerie', 'Ferienanlage', 'ferienanlage', 'Ferienanlage / Resort', 30),
  ('allgemein', 'Sonstiger Betrieb', 'sonstiger-betrieb', 'Allgemeiner Betrieb ohne spezifische Branchenzuordnung', 10)
) AS v(industry_slug, name, slug, description, sort_order)
  ON i.slug = v.industry_slug
ON CONFLICT (industry_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

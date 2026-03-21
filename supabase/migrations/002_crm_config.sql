-- CRM: tabele konfiguracyjne

-- Mapowanie kolekcji na światy
CREATE TABLE IF NOT EXISTS world_mapping (
  id          serial      PRIMARY KEY,
  collection  text        NOT NULL,
  world       text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE world_mapping ENABLE ROW LEVEL SECURITY;

-- Tylko service_role
CREATE POLICY "world_mapping_service_role"
  ON world_mapping
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Lista wykluczeń (np. pracownicy, testerzy)
CREATE TABLE IF NOT EXISTS exclusions (
  id          serial      PRIMARY KEY,
  email       text        UNIQUE NOT NULL,
  reason      text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE exclusions ENABLE ROW LEVEL SECURITY;

-- Tylko service_role
CREATE POLICY "exclusions_service_role"
  ON exclusions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

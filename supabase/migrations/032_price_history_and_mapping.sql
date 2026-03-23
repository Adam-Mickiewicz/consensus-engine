-- Matryca cen produktów per kategoria
CREATE TABLE IF NOT EXISTS price_history (
  id          serial          PRIMARY KEY,
  category_id text            NOT NULL,
  date_from   date            NOT NULL,
  date_to     date,
  avg_price   numeric(10,2)   NOT NULL,
  created_at  timestamptz     DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_category_date
  ON price_history (category_id, date_from);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_history_select"
  ON price_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "price_history_insert"
  ON price_history FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "price_history_update"
  ON price_history FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "price_history_delete"
  ON price_history FOR DELETE TO service_role USING (true);

-- Słownik mapowania nazw produktów na kategorie cenowe
CREATE TABLE IF NOT EXISTS category_mapping (
  id          serial  PRIMARY KEY,
  keyword     text    NOT NULL UNIQUE,   -- fragment nazwy produktu (lowercase)
  category_id text    NOT NULL,          -- np. SKARPETY, KUBEK_500ML
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE category_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_mapping_select"
  ON category_mapping FOR SELECT TO authenticated USING (true);

CREATE POLICY "category_mapping_insert"
  ON category_mapping FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "category_mapping_update"
  ON category_mapping FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "category_mapping_delete"
  ON category_mapping FOR DELETE TO service_role USING (true);

-- Seed słownika startowego
INSERT INTO category_mapping (keyword, category_id) VALUES
  ('stopki',            'SKARPETY_STOPKI'),
  ('skarpety',          'SKARPETY'),
  ('koszulka damska',   'KOSZULKA_DAMSKA'),
  ('koszulka męska',    'KOSZULKA_MESKA'),
  ('koszulka meska',    'KOSZULKA_MESKA'),
  ('koszulka unisex',   'KOSZULKA_UNISEX'),
  ('kubek 500',         'KUBEK_500ML'),
  ('kubek_500',         'KUBEK_500ML'),
  ('torba na książki',  'TORBA_NA_KSIAZKI'),
  ('torba na ksiazki',  'TORBA_NA_KSIAZKI'),
  ('torba',             'TORBA'),
  ('kubek',             'KUBEK'),
  ('bluza',             'BLUZA'),
  ('czapka',            'CZAPKA'),
  ('szalik',            'SZALIK'),
  ('brelok',            'BRELOK'),
  ('magnes',            'MAGNES'),
  ('kartka',            'KARTKA'),
  ('kalendarz',         'KALENDARZ')
ON CONFLICT (keyword) DO NOTHING;

-- Nowe kolumny w client_product_events
ALTER TABLE client_product_events
  ADD COLUMN IF NOT EXISTS price_at_purchase  numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_category_id  text;

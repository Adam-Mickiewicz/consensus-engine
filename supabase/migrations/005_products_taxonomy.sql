CREATE TABLE IF NOT EXISTS products (
  ean                 bigint          PRIMARY KEY,
  name                text            NOT NULL,
  variant             text,
  collection          text,
  product_group       text,
  tags_granularne     text[],
  tags_domenowe       text[],
  filary_marki        text[],
  okazje              text[],
  segment_prezentowy  text,
  evergreen           boolean         DEFAULT false,
  price_avg           numeric(8,2),
  available           boolean         DEFAULT true,
  created_at          timestamptz     DEFAULT now(),
  updated_at          timestamptz     DEFAULT now()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert"
  ON products FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "products_update"
  ON products FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "products_delete"
  ON products FOR DELETE TO service_role USING (true);

CREATE TABLE IF NOT EXISTS promotions (
  id              serial      PRIMARY KEY,
  promo_name      text        NOT NULL,
  promo_type      text[],
  discount_type   text,
  discount_value  text,
  category_list   text,
  product_list    text,
  requires_code   boolean     DEFAULT false,
  code_name       text,
  free_shipping   boolean     DEFAULT false,
  start_date      date,
  end_date        date,
  season          text[],
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_select"
  ON promotions FOR SELECT TO authenticated USING (true);

CREATE POLICY "promotions_insert"
  ON promotions FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "promotions_update"
  ON promotions FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "promotions_delete"
  ON promotions FOR DELETE TO service_role USING (true);

CREATE TABLE IF NOT EXISTS client_product_events (
  id            bigserial   PRIMARY KEY,
  client_id     text        REFERENCES clients_360(client_id) ON DELETE CASCADE,
  ean           bigint      REFERENCES products(ean) ON DELETE SET NULL,
  product_name  text,
  order_date    timestamptz,
  quantity      integer     DEFAULT 1,
  line_total    numeric(8,2),
  season        text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpe_client_id   ON client_product_events (client_id);
CREATE INDEX IF NOT EXISTS idx_cpe_ean         ON client_product_events (ean);
CREATE INDEX IF NOT EXISTS idx_cpe_order_date  ON client_product_events (order_date);

ALTER TABLE client_product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpe_select"
  ON client_product_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "cpe_insert"
  ON client_product_events FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "cpe_update"
  ON client_product_events FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "cpe_delete"
  ON client_product_events FOR DELETE TO service_role USING (true);

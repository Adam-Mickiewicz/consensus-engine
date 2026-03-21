CREATE TABLE IF NOT EXISTS sync_log (
  id              serial      PRIMARY KEY,
  source          text        NOT NULL CHECK (source IN ('taxonomy','promotions')),
  status          text        NOT NULL CHECK (status IN ('success','error')),
  rows_upserted   integer     DEFAULT 0,
  error_message   text,
  triggered_at    timestamptz DEFAULT now()
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_log_select"
  ON sync_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "sync_log_insert"
  ON sync_log FOR INSERT TO service_role WITH CHECK (true);

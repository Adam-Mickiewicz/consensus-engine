CREATE TABLE IF NOT EXISTS client_taxonomy_summary (
  client_id           text        PRIMARY KEY REFERENCES clients_360(client_id) ON DELETE CASCADE,
  top_tags_granularne text[],
  top_tags_domenowe   text[],
  top_filary_marki    text[],
  top_okazje          text[],
  top_segment         text,
  evergreen_ratio     numeric(4,2),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE client_taxonomy_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cts_select"
  ON client_taxonomy_summary FOR SELECT TO authenticated USING (true);

CREATE POLICY "cts_insert"
  ON client_taxonomy_summary FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "cts_update"
  ON client_taxonomy_summary FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "cts_delete"
  ON client_taxonomy_summary FOR DELETE TO service_role USING (true);

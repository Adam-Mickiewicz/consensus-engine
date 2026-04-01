-- ============================================
-- TABELA: user_dashboard_config
-- ============================================
CREATE TABLE IF NOT EXISTS user_dashboard_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'default',
  config_name text NOT NULL DEFAULT 'Mój dashboard',
  widgets jsonb NOT NULL DEFAULT '[]',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, config_name)
);

ALTER TABLE user_dashboard_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON user_dashboard_config FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- TABELA: segment_snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS segment_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  client_id text NOT NULL,
  legacy_segment text,
  risk_level text,
  ltv numeric,
  orders_count integer,
  UNIQUE(snapshot_date, client_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON segment_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_client ON segment_snapshots(client_id);

ALTER TABLE segment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON segment_snapshots FOR ALL USING (true) WITH CHECK (true);


-- ============================================
-- FUNCTION: take_segment_snapshot
-- ============================================
CREATE OR REPLACE FUNCTION take_segment_snapshot()
RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO segment_snapshots (snapshot_date, client_id, legacy_segment, risk_level, ltv, orders_count)
  SELECT CURRENT_DATE, client_id, legacy_segment, risk_level, ltv, orders_count
  FROM clients_360
  ON CONFLICT (snapshot_date, client_id) DO UPDATE SET
    legacy_segment = EXCLUDED.legacy_segment,
    risk_level = EXCLUDED.risk_level,
    ltv = EXCLUDED.ltv,
    orders_count = EXCLUDED.orders_count;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('snapshot_date', CURRENT_DATE, 'rows', v_count);
END;
$$;


-- ============================================
-- FUNCTION: get_segment_migration
-- ============================================
CREATE OR REPLACE FUNCTION get_segment_migration(p_from_date date, p_to_date date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT
      s1.legacy_segment AS from_segment,
      s2.legacy_segment AS to_segment,
      COUNT(*) AS client_count,
      COALESCE(SUM(s2.ltv), 0) AS total_ltv
    FROM segment_snapshots s1
    JOIN segment_snapshots s2
      ON s2.client_id = s1.client_id AND s2.snapshot_date = p_to_date
    WHERE s1.snapshot_date = p_from_date
    GROUP BY s1.legacy_segment, s2.legacy_segment
    ORDER BY client_count DESC
  ) t
$$;


-- ============================================
-- FUNCTION: get_compare_audiences
-- ============================================
CREATE OR REPLACE FUNCTION get_compare_audiences(
  p_group_a_segments text[] DEFAULT NULL,
  p_group_a_risks text[] DEFAULT NULL,
  p_group_a_worlds text[] DEFAULT NULL,
  p_group_b_segments text[] DEFAULT NULL,
  p_group_b_risks text[] DEFAULT NULL,
  p_group_b_worlds text[] DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql STABLE AS $$
DECLARE
  result_a json;
  result_b json;
BEGIN
  SELECT json_build_object(
    'client_count', COUNT(*),
    'total_ltv', COALESCE(SUM(ltv), 0),
    'avg_ltv', COALESCE(AVG(ltv), 0),
    'avg_orders', COALESCE(AVG(orders_count), 0),
    'avg_frequency', COALESCE(AVG(
      CASE WHEN first_order IS NOT NULL AND last_order IS NOT NULL AND last_order > first_order
        THEN orders_count::numeric / NULLIF(EXTRACT(YEAR FROM age(last_order::date, first_order::date)), 0)
        ELSE NULL
      END
    ), 0),
    'segment_distribution', (
      SELECT json_agg(json_build_object('segment', legacy_segment, 'count', cnt))
      FROM (SELECT legacy_segment, COUNT(*) as cnt FROM clients_360
            WHERE (p_group_a_segments IS NULL OR legacy_segment = ANY(p_group_a_segments))
              AND (p_group_a_risks IS NULL OR risk_level = ANY(p_group_a_risks))
              AND (p_group_a_worlds IS NULL OR top_domena = ANY(p_group_a_worlds))
            GROUP BY legacy_segment ORDER BY cnt DESC) x
    ),
    'risk_distribution', (
      SELECT json_agg(json_build_object('risk', risk_level, 'count', cnt))
      FROM (SELECT risk_level, COUNT(*) as cnt FROM clients_360
            WHERE (p_group_a_segments IS NULL OR legacy_segment = ANY(p_group_a_segments))
              AND (p_group_a_risks IS NULL OR risk_level = ANY(p_group_a_risks))
              AND (p_group_a_worlds IS NULL OR top_domena = ANY(p_group_a_worlds))
            GROUP BY risk_level ORDER BY cnt DESC) x
    )
  ) INTO result_a
  FROM clients_360
  WHERE (p_group_a_segments IS NULL OR legacy_segment = ANY(p_group_a_segments))
    AND (p_group_a_risks IS NULL OR risk_level = ANY(p_group_a_risks))
    AND (p_group_a_worlds IS NULL OR top_domena = ANY(p_group_a_worlds));

  SELECT json_build_object(
    'client_count', COUNT(*),
    'total_ltv', COALESCE(SUM(ltv), 0),
    'avg_ltv', COALESCE(AVG(ltv), 0),
    'avg_orders', COALESCE(AVG(orders_count), 0),
    'avg_frequency', COALESCE(AVG(
      CASE WHEN first_order IS NOT NULL AND last_order IS NOT NULL AND last_order > first_order
        THEN orders_count::numeric / NULLIF(EXTRACT(YEAR FROM age(last_order::date, first_order::date)), 0)
        ELSE NULL
      END
    ), 0),
    'segment_distribution', (
      SELECT json_agg(json_build_object('segment', legacy_segment, 'count', cnt))
      FROM (SELECT legacy_segment, COUNT(*) as cnt FROM clients_360
            WHERE (p_group_b_segments IS NULL OR legacy_segment = ANY(p_group_b_segments))
              AND (p_group_b_risks IS NULL OR risk_level = ANY(p_group_b_risks))
              AND (p_group_b_worlds IS NULL OR top_domena = ANY(p_group_b_worlds))
            GROUP BY legacy_segment ORDER BY cnt DESC) x
    ),
    'risk_distribution', (
      SELECT json_agg(json_build_object('risk', risk_level, 'count', cnt))
      FROM (SELECT risk_level, COUNT(*) as cnt FROM clients_360
            WHERE (p_group_b_segments IS NULL OR legacy_segment = ANY(p_group_b_segments))
              AND (p_group_b_risks IS NULL OR risk_level = ANY(p_group_b_risks))
              AND (p_group_b_worlds IS NULL OR top_domena = ANY(p_group_b_worlds))
            GROUP BY risk_level ORDER BY cnt DESC) x
    )
  ) INTO result_b
  FROM clients_360
  WHERE (p_group_b_segments IS NULL OR legacy_segment = ANY(p_group_b_segments))
    AND (p_group_b_risks IS NULL OR risk_level = ANY(p_group_b_risks))
    AND (p_group_b_worlds IS NULL OR top_domena = ANY(p_group_b_worlds));

  RETURN json_build_object('group_a', result_a, 'group_b', result_b);
END;
$$;

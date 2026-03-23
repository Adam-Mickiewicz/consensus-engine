-- Parameterized overview function for filtered CRM analytics.
-- Filters clients by segment, risk, world, date range, and occasion.

CREATE OR REPLACE FUNCTION get_crm_overview(
  p_date_from  date    DEFAULT NULL,
  p_date_to    date    DEFAULT NULL,
  p_segment    text    DEFAULT NULL,
  p_risk       text    DEFAULT NULL,
  p_world      text    DEFAULT NULL,
  p_occasion   text    DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH fc AS (
    SELECT c.client_id, c.legacy_segment, c.risk_level, c.ulubiony_swiat, c.ltv
    FROM clients_360 c
    WHERE (p_segment  IS NULL OR c.legacy_segment  = p_segment)
      AND (p_risk     IS NULL OR c.risk_level      = p_risk)
      AND (p_world    IS NULL OR c.ulubiony_swiat   = p_world)
      AND (
        (p_date_from IS NULL AND p_date_to IS NULL AND p_occasion IS NULL)
        OR EXISTS (
          SELECT 1 FROM client_product_events e
          WHERE e.client_id = c.client_id
            AND (p_date_from IS NULL OR e.order_date::date >= p_date_from)
            AND (p_date_to   IS NULL OR e.order_date::date <= p_date_to)
            AND (p_occasion  IS NULL OR e.season = p_occasion)
        )
      )
  ),
  totals AS (
    SELECT
      COUNT(*)                                                                 AS total_clients,
      COALESCE(SUM(ltv), 0)                                                   AS total_ltv,
      COALESCE(AVG(ltv), 0)                                                   AS avg_ltv,
      COUNT(*) FILTER (WHERE legacy_segment IN ('Diamond','Platinum')
                         AND risk_level IN ('HighRisk','Lost'))                AS vip_count
    FROM fc
  ),
  segs AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'legacy_segment', legacy_segment,
        'count',   cnt,
        'sum_ltv', ROUND(sum_ltv::numeric),
        'avg_ltv', ROUND(avg_ltv::numeric)
      ) ORDER BY CASE legacy_segment
        WHEN 'Diamond'   THEN 1 WHEN 'Platinum' THEN 2
        WHEN 'Gold'      THEN 3 WHEN 'Returning' THEN 4
        WHEN 'New'       THEN 5 ELSE 6 END
    ), '[]'::jsonb) AS data
    FROM (
      SELECT legacy_segment, COUNT(*) AS cnt, SUM(ltv) AS sum_ltv, AVG(ltv) AS avg_ltv
      FROM fc WHERE legacy_segment IS NOT NULL
      GROUP BY legacy_segment
    ) s
  ),
  risks AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('risk_level', risk_level, 'count', cnt)
      ORDER BY CASE risk_level
        WHEN 'OK' THEN 1 WHEN 'Risk' THEN 2
        WHEN 'HighRisk' THEN 3 WHEN 'Lost' THEN 4 ELSE 5 END
    ), '[]'::jsonb) AS data
    FROM (
      SELECT risk_level, COUNT(*) AS cnt
      FROM fc WHERE risk_level IS NOT NULL
      GROUP BY risk_level
    ) r
  ),
  wrlds AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('ulubiony_swiat', ulubiony_swiat, 'count', cnt)
    ), '[]'::jsonb) AS data
    FROM (
      SELECT ulubiony_swiat, COUNT(*) AS cnt
      FROM fc WHERE ulubiony_swiat IS NOT NULL
      GROUP BY ulubiony_swiat
      ORDER BY cnt DESC
      LIMIT 10
    ) w
  )
  SELECT jsonb_build_object(
    'total_clients', t.total_clients,
    'total_ltv',     ROUND(t.total_ltv::numeric),
    'avg_ltv',       ROUND(t.avg_ltv::numeric),
    'vip_count',     t.vip_count,
    'segments',      s.data,
    'risk',          r.data,
    'worlds',        w.data
  )
  FROM totals t, segs s, risks r, wrlds w;
$$;

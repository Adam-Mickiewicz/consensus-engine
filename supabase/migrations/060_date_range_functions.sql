-- ─── get_dashboard_kpis_for_range ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_kpis_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'total_clients',         COUNT(DISTINCT c.id),
    'total_ltv',             COALESCE(SUM(c.total_ltv), 0),
    'avg_ltv',               COALESCE(AVG(c.total_ltv), 0),
    'active_in_range',       COUNT(DISTINCT CASE WHEN c.last_order_date BETWEEN p_from AND p_to THEN c.id END),
    'buyers_in_range',       COUNT(DISTINCT cpe.client_id),
    'repeaters_in_range',    COUNT(DISTINCT CASE WHEN ord_counts.order_count >= 2 THEN cpe.client_id END),
    'at_risk_count',         COUNT(DISTINCT CASE WHEN c.risk_level IN ('Risk','HighRisk') THEN c.id END),
    'at_risk_revenue',       COALESCE(SUM(CASE WHEN c.risk_level IN ('Risk','HighRisk') THEN c.total_ltv ELSE 0 END), 0),
    'winback_vip_count',     COUNT(DISTINCT CASE WHEN c.legacy_segment IN ('Diamond','Platinum') AND c.risk_level IN ('HighRisk','Lost') THEN c.id END),
    'winback_vip_revenue',   COALESCE(SUM(CASE WHEN c.legacy_segment IN ('Diamond','Platinum') AND c.risk_level IN ('HighRisk','Lost') THEN c.total_ltv ELSE 0 END), 0),
    'diamond_count',         COUNT(DISTINCT CASE WHEN c.legacy_segment = 'Diamond' THEN c.id END),
    'second_order_candidates', COUNT(DISTINCT CASE WHEN c.order_count = 1 AND c.last_order_date BETWEEN (p_to::date - 90) AND (p_to::date - 30) THEN c.id END)
  )
  FROM clients_360 c
  LEFT JOIN client_product_events cpe ON cpe.client_id = c.id AND cpe.order_date BETWEEN p_from AND p_to
  LEFT JOIN (
    SELECT client_id, COUNT(DISTINCT order_id) AS order_count
    FROM client_product_events
    WHERE order_date BETWEEN p_from AND p_to
    GROUP BY client_id
  ) ord_counts ON ord_counts.client_id = cpe.client_id
$$;

-- ─── get_revenue_monthly_for_range ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_revenue_monthly_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.month)
  FROM (
    SELECT
      DATE_TRUNC('month', cpe.order_date)::date AS month,
      COALESCE(SUM(cpe.item_value), 0)           AS total_revenue,
      COALESCE(SUM(CASE WHEN c.order_count > 1 THEN cpe.item_value ELSE 0 END), 0) AS repeat_revenue,
      COALESCE(SUM(CASE WHEN c.order_count = 1 THEN cpe.item_value ELSE 0 END), 0) AS new_revenue,
      COALESCE(SUM(CASE WHEN cpe.is_promo THEN cpe.item_value ELSE 0 END), 0)      AS promo_revenue
    FROM client_product_events cpe
    JOIN clients_360 c ON c.id = cpe.client_id
    WHERE cpe.order_date BETWEEN p_from AND p_to
    GROUP BY DATE_TRUNC('month', cpe.order_date)
  ) r
$$;

-- ─── get_promo_share_for_range ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_promo_share_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'total_revenue',         COALESCE(SUM(cpe.item_value), 0),
    'promo_revenue',         COALESCE(SUM(CASE WHEN cpe.is_promo THEN cpe.item_value ELSE 0 END), 0),
    'promo_share_pct',       ROUND(
                               CASE WHEN SUM(cpe.item_value) > 0
                                 THEN SUM(CASE WHEN cpe.is_promo THEN cpe.item_value ELSE 0 END) / SUM(cpe.item_value) * 100
                                 ELSE 0 END, 1),
    'new_product_revenue',   0,
    'new_product_share_pct', 0
  )
  FROM client_product_events cpe
  WHERE cpe.order_date BETWEEN p_from AND p_to
$$;

-- ─── get_product_performance_for_range ───────────────────────────────────────
CREATE OR REPLACE FUNCTION get_product_performance_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.total_revenue DESC)
  FROM (
    SELECT
      p.product_name,
      cpe.ean,
      COUNT(*)                                                        AS times_sold,
      COUNT(*)                                                        AS total_quantity,
      COALESCE(SUM(cpe.item_value), 0)                               AS total_revenue,
      COUNT(DISTINCT cpe.client_id)                                   AS unique_buyers,
      COUNT(DISTINCT CASE WHEN repeat_flag.client_id IS NOT NULL THEN cpe.client_id END) AS repeat_buyers,
      ROUND(
        CASE WHEN COUNT(DISTINCT cpe.client_id) > 0
          THEN COUNT(DISTINCT CASE WHEN repeat_flag.client_id IS NOT NULL THEN cpe.client_id END)::numeric
               / COUNT(DISTINCT cpe.client_id) * 100
          ELSE 0 END, 1)                                             AS buyer_repeat_rate,
      COUNT(CASE WHEN cpe.is_promo THEN 1 END)                       AS promo_sales,
      ROUND(
        CASE WHEN COUNT(*) > 0
          THEN COUNT(CASE WHEN cpe.is_promo THEN 1 END)::numeric / COUNT(*) * 100
          ELSE 0 END, 1)                                             AS promo_share_pct,
      p.collection,
      p.product_group,
      p.available
    FROM client_product_events cpe
    LEFT JOIN products p ON p.ean = cpe.ean
    LEFT JOIN (
      SELECT DISTINCT client_id FROM clients_360 WHERE order_count >= 2
    ) repeat_flag ON repeat_flag.client_id = cpe.client_id
    WHERE cpe.order_date BETWEEN p_from AND p_to
    GROUP BY cpe.ean, p.product_name, p.collection, p.product_group, p.available
  ) r
$$;

-- ─── get_worlds_for_range ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_worlds_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.total_ltv DESC)
  FROM (
    SELECT
      c.world,
      COUNT(DISTINCT cpe.client_id)                                                   AS client_count,
      COALESCE(SUM(cpe.item_value), 0)                                                AS total_ltv,
      COALESCE(AVG(cpe.item_value), 0)                                                AS avg_ltv,
      COUNT(DISTINCT CASE WHEN ord_counts.order_count >= 2 THEN cpe.client_id END)    AS repeat_clients,
      ROUND(
        CASE WHEN COUNT(DISTINCT cpe.client_id) > 0
          THEN COUNT(DISTINCT CASE WHEN ord_counts.order_count >= 2 THEN cpe.client_id END)::numeric
               / COUNT(DISTINCT cpe.client_id) * 100
          ELSE 0 END, 1)                                                              AS repeat_rate,
      COUNT(DISTINCT CASE WHEN c.legacy_segment IN ('Diamond','Platinum') THEN c.id END) AS vip_count,
      COUNT(DISTINCT CASE WHEN c.risk_level = 'Lost' THEN c.id END)                  AS lost_count,
      ROUND(AVG(c.order_count), 1)                                                    AS avg_orders
    FROM client_product_events cpe
    JOIN clients_360 c ON c.id = cpe.client_id
    LEFT JOIN (
      SELECT client_id, COUNT(DISTINCT order_id) AS order_count
      FROM client_product_events
      WHERE order_date BETWEEN p_from AND p_to
      GROUP BY client_id
    ) ord_counts ON ord_counts.client_id = cpe.client_id
    WHERE cpe.order_date BETWEEN p_from AND p_to
      AND c.world IS NOT NULL
    GROUP BY c.world
  ) r
$$;

-- ─── get_data_granulation ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_data_granulation(p_granularity text DEFAULT 'yearly')
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.period)
  FROM (
    SELECT
      CASE p_granularity
        WHEN 'monthly'   THEN TO_CHAR(cpe.order_date, 'YYYY-MM')
        WHEN 'quarterly' THEN TO_CHAR(cpe.order_date, 'YYYY') || '-Q' || TO_CHAR(cpe.order_date, 'Q')
        ELSE                  TO_CHAR(cpe.order_date, 'YYYY')
      END AS period,
      COUNT(DISTINCT cpe.client_id)   AS clients,
      COUNT(DISTINCT cpe.order_id)    AS orders,
      COALESCE(SUM(cpe.item_value), 0) AS revenue,
      ROUND(COALESCE(AVG(cpe.item_value), 0), 2) AS avg_aov
    FROM client_product_events cpe
    GROUP BY 1
  ) r
$$;

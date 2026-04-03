-- ============================================================
-- FIX: Date range SQL functions had wrong column names and
-- mismatched return field names vs materialized views.
--
-- Wrong columns used: c.id, c.total_ltv, c.last_order_date,
--   c.order_count, cpe.item_value, c.world, p.product_name
-- Correct columns:    c.client_id, c.ltv, c.last_order,
--   c.orders_count, cpe.line_total, c.top_domena, p.name
--
-- Return fields also aligned with crm_dashboard_kpis matview
-- so the frontend reads the same keys regardless of date mode.
-- ============================================================


-- ─── get_dashboard_kpis_for_range ────────────────────────────────────────────
-- Returns same field names as crm_dashboard_kpis materialized view.
CREATE OR REPLACE FUNCTION get_dashboard_kpis_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'active_90d',              COUNT(*) FILTER (WHERE last_order::date BETWEEN p_from AND p_to),
    'buyers_90d',              COUNT(*) FILTER (WHERE last_order::date BETWEEN p_from AND p_to),
    'repeaters_90d',           COUNT(*) FILTER (WHERE orders_count > 1 AND last_order::date BETWEEN p_from AND p_to),
    'at_risk_revenue',         COALESCE(SUM(ltv) FILTER (WHERE risk_level IN ('Risk','HighRisk') AND legacy_segment IN ('Diamond','Platinum','Gold')), 0),
    'at_risk_count',           COUNT(*) FILTER (WHERE risk_level IN ('Risk','HighRisk') AND legacy_segment IN ('Diamond','Platinum','Gold')),
    'winback_vip_count',       COUNT(*) FILTER (WHERE risk_level IN ('HighRisk','Lost') AND legacy_segment IN ('Diamond','Platinum')),
    'winback_vip_revenue',     COALESCE(SUM(ltv) FILTER (WHERE risk_level IN ('HighRisk','Lost') AND legacy_segment IN ('Diamond','Platinum')), 0),
    'total_clients',           COUNT(*),
    'total_ltv',               COALESCE(SUM(ltv), 0),
    'avg_ltv',                 COALESCE(AVG(ltv), 0),
    'diamond_count',           COUNT(*) FILTER (WHERE legacy_segment = 'Diamond'),
    'second_order_candidates', COUNT(*) FILTER (
                                 WHERE orders_count = 1
                                 AND last_order::date BETWEEN (p_to - 90) AND (p_to - 30)
                               )
  )
  FROM clients_360
$$;


-- ─── get_revenue_monthly_for_range ───────────────────────────────────────────
-- Returns same field names as crm_revenue_monthly materialized view.
CREATE OR REPLACE FUNCTION get_revenue_monthly_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.month)
  FROM (
    SELECT
      DATE_TRUNC('month', cpe.order_date)::date                                        AS month,
      COALESCE(SUM(cpe.line_total), 0)                                                  AS total_revenue,
      COALESCE(SUM(cpe.line_total) FILTER (WHERE c.orders_count > 1), 0)               AS repeat_revenue,
      COALESCE(SUM(cpe.line_total) FILTER (WHERE c.orders_count = 1), 0)               AS new_revenue,
      COALESCE(SUM(cpe.line_total) FILTER (WHERE cpe.is_promo = true), 0)              AS promo_revenue,
      COUNT(DISTINCT cpe.order_id)                                                       AS order_count,
      COUNT(DISTINCT cpe.client_id)                                                      AS unique_customers
    FROM client_product_events cpe
    JOIN clients_360 c ON c.client_id = cpe.client_id
    WHERE cpe.order_date::date BETWEEN p_from AND p_to
    GROUP BY DATE_TRUNC('month', cpe.order_date)
  ) r
$$;


-- ─── get_promo_share_for_range ────────────────────────────────────────────────
-- Returns same field names as crm_promo_share materialized view.
CREATE OR REPLACE FUNCTION get_promo_share_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'promo_revenue',          COALESCE(SUM(line_total) FILTER (WHERE is_promo = true), 0),
    'total_revenue',          COALESCE(SUM(line_total), 0),
    'promo_share_pct',        ROUND(
                                COALESCE(SUM(line_total) FILTER (WHERE is_promo = true), 0)::numeric /
                                NULLIF(SUM(line_total), 0) * 100, 1),
    'new_product_revenue',    COALESCE(SUM(line_total) FILTER (WHERE is_new_product = true), 0),
    'new_product_share_pct',  ROUND(
                                COALESCE(SUM(line_total) FILTER (WHERE is_new_product = true), 0)::numeric /
                                NULLIF(SUM(line_total), 0) * 100, 1)
  )
  FROM client_product_events
  WHERE order_date::date BETWEEN p_from AND p_to
$$;


-- ─── get_product_performance_for_range ───────────────────────────────────────
-- Returns same field names as crm_product_performance materialized view.
CREATE OR REPLACE FUNCTION get_product_performance_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.total_revenue DESC)
  FROM (
    SELECT
      COALESCE(p.name, cpe.product_name)                                                AS product_name,
      cpe.ean,
      COUNT(*)                                                                           AS times_sold,
      COALESCE(SUM(cpe.quantity), 0)                                                    AS total_quantity,
      COALESCE(SUM(cpe.line_total), 0)                                                  AS total_revenue,
      COUNT(DISTINCT cpe.client_id)                                                      AS unique_buyers,
      COUNT(DISTINCT CASE WHEN c.orders_count >= 2 THEN cpe.client_id END)              AS repeat_buyers,
      ROUND(
        CASE WHEN COUNT(DISTINCT cpe.client_id) > 0
          THEN COUNT(DISTINCT CASE WHEN c.orders_count >= 2 THEN cpe.client_id END)::numeric
               / COUNT(DISTINCT cpe.client_id) * 100
          ELSE 0 END, 1)                                                                AS buyer_repeat_rate,
      COUNT(*) FILTER (WHERE cpe.is_promo = true)                                       AS promo_sales,
      ROUND(
        CASE WHEN COUNT(*) > 0
          THEN COUNT(*) FILTER (WHERE cpe.is_promo = true)::numeric / COUNT(*) * 100
          ELSE 0 END, 1)                                                                AS promo_share_pct,
      p.collection,
      p.product_group,
      p.available
    FROM client_product_events cpe
    LEFT JOIN products p ON p.ean = cpe.ean
    LEFT JOIN clients_360 c ON c.client_id = cpe.client_id
    WHERE cpe.order_date::date BETWEEN p_from AND p_to
    GROUP BY cpe.ean, p.name, cpe.product_name, p.collection, p.product_group, p.available
  ) r
$$;


-- ─── get_worlds_for_range ─────────────────────────────────────────────────────
-- Returns same field names as crm_worlds_performance materialized view.
CREATE OR REPLACE FUNCTION get_worlds_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.client_count DESC)
  FROM (
    SELECT
      c.top_domena                                                                             AS world,
      COUNT(DISTINCT cpe.client_id)                                                            AS client_count,
      COALESCE(SUM(cpe.line_total), 0)                                                         AS total_ltv,
      COALESCE(AVG(cpe.line_total), 0)                                                         AS avg_ltv,
      COUNT(DISTINCT CASE WHEN c.orders_count >= 2 THEN cpe.client_id END)                     AS repeat_clients,
      ROUND(
        CASE WHEN COUNT(DISTINCT cpe.client_id) > 0
          THEN COUNT(DISTINCT CASE WHEN c.orders_count >= 2 THEN cpe.client_id END)::numeric
               / COUNT(DISTINCT cpe.client_id) * 100
          ELSE 0 END, 1)                                                                       AS repeat_rate,
      COUNT(DISTINCT CASE WHEN c.legacy_segment IN ('Diamond','Platinum') THEN c.client_id END) AS vip_count,
      COUNT(DISTINCT CASE WHEN c.risk_level = 'Lost' THEN c.client_id END)                     AS lost_count,
      COALESCE(AVG(c.orders_count), 0)                                                          AS avg_orders
    FROM client_product_events cpe
    JOIN clients_360 c ON c.client_id = cpe.client_id
    WHERE cpe.order_date::date BETWEEN p_from AND p_to
      AND c.top_domena IS NOT NULL
      AND c.top_domena != ''
    GROUP BY c.top_domena
  ) r
$$;


-- ─── get_data_granulation ─────────────────────────────────────────────────────
-- Fix cpe.item_value → cpe.line_total (was broken for daily/weekly/quarterly).
CREATE OR REPLACE FUNCTION get_data_granulation(p_granularity text DEFAULT 'yearly')
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(r ORDER BY r.period)
  FROM (
    SELECT
      CASE p_granularity
        WHEN 'daily'     THEN TO_CHAR(cpe.order_date, 'YYYY-MM-DD')
        WHEN 'weekly'    THEN TO_CHAR(DATE_TRUNC('week', cpe.order_date), 'IYYY-IW')
        WHEN 'monthly'   THEN TO_CHAR(cpe.order_date, 'YYYY-MM')
        WHEN 'quarterly' THEN TO_CHAR(cpe.order_date, 'YYYY') || '-Q' || TO_CHAR(cpe.order_date, 'Q')
        ELSE                  TO_CHAR(cpe.order_date, 'YYYY')
      END                                                     AS period,
      COUNT(DISTINCT cpe.client_id)                           AS clients,
      COUNT(DISTINCT cpe.order_id)                            AS orders,
      COALESCE(SUM(cpe.line_total), 0)                        AS revenue,
      ROUND(COALESCE(AVG(cpe.line_total), 0), 2)              AS avg_aov
    FROM client_product_events cpe
    GROUP BY 1
  ) r
$$;

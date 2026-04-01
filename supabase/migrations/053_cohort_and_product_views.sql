-- ============================================
-- MATERIALIZED VIEW: crm_cohort_retention
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_cohort_retention;
CREATE MATERIALIZED VIEW crm_cohort_retention AS
WITH cohorts AS (
  SELECT
    client_id,
    DATE_TRUNC('month', first_order)::date AS cohort_month,
    orders_count
  FROM clients_360
  WHERE first_order IS NOT NULL
),
order_months AS (
  SELECT DISTINCT
    client_id,
    DATE_TRUNC('month', order_date)::date AS order_month
  FROM client_product_events
  WHERE order_date IS NOT NULL
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(*) AS cohort_size
  FROM cohorts
  GROUP BY cohort_month
),
retention AS (
  SELECT
    c.cohort_month,
    (EXTRACT(YEAR FROM o.order_month) - EXTRACT(YEAR FROM c.cohort_month)) * 12
      + (EXTRACT(MONTH FROM o.order_month) - EXTRACT(MONTH FROM c.cohort_month)) AS months_after,
    COUNT(DISTINCT c.client_id) AS active_clients
  FROM cohorts c
  JOIN order_months o ON o.client_id = c.client_id
  WHERE o.order_month >= c.cohort_month
  GROUP BY c.cohort_month, months_after
)
SELECT
  r.cohort_month,
  cs.cohort_size,
  r.months_after,
  r.active_clients,
  ROUND(r.active_clients::numeric / NULLIF(cs.cohort_size, 0) * 100, 1) AS retention_pct
FROM retention r
JOIN cohort_sizes cs ON cs.cohort_month = r.cohort_month
WHERE r.months_after BETWEEN 0 AND 12
ORDER BY r.cohort_month, r.months_after;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_retention_pk ON crm_cohort_retention (cohort_month, months_after);
GRANT SELECT ON crm_cohort_retention TO anon, authenticated, service_role;


-- ============================================
-- MATERIALIZED VIEW: crm_time_to_second_order
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_time_to_second_order;
CREATE MATERIALIZED VIEW crm_time_to_second_order AS
WITH ranked_orders AS (
  SELECT
    client_id,
    order_date,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY order_date) AS order_num
  FROM (
    SELECT DISTINCT client_id, order_id, MIN(order_date) AS order_date
    FROM client_product_events
    GROUP BY client_id, order_id
  ) orders_unique
),
second_orders AS (
  SELECT
    r1.client_id,
    r1.order_date AS first_order_date,
    r2.order_date AS second_order_date,
    EXTRACT(DAY FROM r2.order_date - r1.order_date)::int AS days_to_second
  FROM ranked_orders r1
  JOIN ranked_orders r2 ON r2.client_id = r1.client_id AND r2.order_num = 2
  WHERE r1.order_num = 1
)
SELECT
  CASE
    WHEN days_to_second <= 7 THEN '0-7d'
    WHEN days_to_second <= 14 THEN '8-14d'
    WHEN days_to_second <= 30 THEN '15-30d'
    WHEN days_to_second <= 60 THEN '31-60d'
    WHEN days_to_second <= 90 THEN '61-90d'
    WHEN days_to_second <= 180 THEN '91-180d'
    WHEN days_to_second <= 365 THEN '181-365d'
    ELSE '365d+'
  END AS bucket,
  COUNT(*) AS client_count,
  ROUND(AVG(days_to_second)) AS avg_days,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_second)::int AS median_days
FROM second_orders
GROUP BY 1
ORDER BY MIN(days_to_second);

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_to_second_pk ON crm_time_to_second_order (bucket);
GRANT SELECT ON crm_time_to_second_order TO anon, authenticated, service_role;


-- ============================================
-- MATERIALIZED VIEW: crm_cohort_by_context
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_cohort_by_context;
CREATE MATERIALIZED VIEW crm_cohort_by_context AS
WITH first_orders AS (
  SELECT DISTINCT ON (cpe.client_id)
    cpe.client_id,
    cpe.order_date,
    cpe.is_promo AS first_order_promo,
    cpe.season AS first_order_season
  FROM client_product_events cpe
  JOIN clients_360 c ON c.client_id = cpe.client_id
  WHERE cpe.order_date = c.first_order
  ORDER BY cpe.client_id, cpe.line_total DESC
)
SELECT
  CASE WHEN first_order_promo THEN 'Promo' ELSE 'Full price' END AS context_type,
  'promo_vs_fullprice' AS context_group,
  COUNT(*) AS cohort_size,
  COUNT(*) FILTER (WHERE c.orders_count > 1) AS repeat_clients,
  ROUND(COUNT(*) FILTER (WHERE c.orders_count > 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS repeat_rate,
  COALESCE(AVG(c.ltv), 0) AS avg_ltv,
  COALESCE(AVG(c.orders_count), 0) AS avg_orders
FROM first_orders fo
JOIN clients_360 c ON c.client_id = fo.client_id
GROUP BY 1, 2

UNION ALL

SELECT
  COALESCE(first_order_season, 'Bez okazji') AS context_type,
  'by_season' AS context_group,
  COUNT(*) AS cohort_size,
  COUNT(*) FILTER (WHERE c.orders_count > 1) AS repeat_clients,
  ROUND(COUNT(*) FILTER (WHERE c.orders_count > 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS repeat_rate,
  COALESCE(AVG(c.ltv), 0) AS avg_ltv,
  COALESCE(AVG(c.orders_count), 0) AS avg_orders
FROM first_orders fo
JOIN clients_360 c ON c.client_id = fo.client_id
GROUP BY 1, 2
ORDER BY context_group, repeat_rate DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_context_pk ON crm_cohort_by_context (context_group, context_type);
GRANT SELECT ON crm_cohort_by_context TO anon, authenticated, service_role;


-- ============================================
-- MATERIALIZED VIEW: crm_product_performance
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_product_performance;
CREATE MATERIALIZED VIEW crm_product_performance AS
SELECT
  cpe.product_name,
  cpe.ean,
  COUNT(*) AS times_sold,
  SUM(cpe.quantity) AS total_quantity,
  COALESCE(SUM(cpe.line_total), 0) AS total_revenue,
  COUNT(DISTINCT cpe.client_id) AS unique_buyers,
  COUNT(DISTINCT cpe.client_id) FILTER (WHERE c.orders_count > 1) AS repeat_buyers,
  ROUND(
    COUNT(DISTINCT cpe.client_id) FILTER (WHERE c.orders_count > 1)::numeric /
    NULLIF(COUNT(DISTINCT cpe.client_id), 0) * 100, 1
  ) AS buyer_repeat_rate,
  COUNT(*) FILTER (WHERE cpe.is_promo = true) AS promo_sales,
  ROUND(
    COUNT(*) FILTER (WHERE cpe.is_promo = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) AS promo_share_pct,
  p.collection,
  p.product_group,
  p.evergreen,
  p.available
FROM client_product_events cpe
JOIN clients_360 c ON c.client_id = cpe.client_id
LEFT JOIN products p ON p.ean = cpe.ean
GROUP BY cpe.product_name, cpe.ean, p.collection, p.product_group, p.evergreen, p.available
ORDER BY total_revenue DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_perf_pk ON crm_product_performance (COALESCE(ean, 0), COALESCE(product_name, ''));
GRANT SELECT ON crm_product_performance TO anon, authenticated, service_role;


-- ============================================
-- MATERIALIZED VIEW: crm_season_performance
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_season_performance;
CREATE MATERIALIZED VIEW crm_season_performance AS
SELECT
  cpe.season,
  EXTRACT(YEAR FROM cpe.order_date)::int AS year,
  COALESCE(SUM(cpe.line_total), 0) AS revenue,
  COUNT(DISTINCT cpe.order_id) AS orders,
  COUNT(DISTINCT cpe.client_id) AS unique_customers,
  COALESCE(AVG(cpe.order_sum), 0) AS avg_order_value,
  COUNT(*) FILTER (WHERE cpe.is_promo = true) AS promo_count,
  COUNT(*) AS total_count
FROM client_product_events cpe
WHERE cpe.season IS NOT NULL AND cpe.season != ''
GROUP BY cpe.season, EXTRACT(YEAR FROM cpe.order_date)
ORDER BY cpe.season, year;

CREATE UNIQUE INDEX IF NOT EXISTS idx_season_perf_pk ON crm_season_performance (COALESCE(season, ''), year);
GRANT SELECT ON crm_season_performance TO anon, authenticated, service_role;


-- ============================================
-- MATERIALIZED VIEW: crm_cross_sell
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_cross_sell;
CREATE MATERIALIZED VIEW crm_cross_sell AS
WITH order_products AS (
  SELECT DISTINCT order_id, product_name
  FROM client_product_events
  WHERE product_name IS NOT NULL
)
SELECT
  a.product_name AS product_a,
  b.product_name AS product_b,
  COUNT(*) AS co_occurrence
FROM order_products a
JOIN order_products b ON a.order_id = b.order_id AND a.product_name < b.product_name
GROUP BY a.product_name, b.product_name
HAVING COUNT(*) >= 5
ORDER BY co_occurrence DESC
LIMIT 500;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_sell_pk ON crm_cross_sell (product_a, product_b);
GRANT SELECT ON crm_cross_sell TO anon, authenticated, service_role;


-- ============================================
-- MATERIALIZED VIEW: crm_repeat_ladder
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_repeat_ladder;
CREATE MATERIALIZED VIEW crm_repeat_ladder AS
SELECT
  CASE
    WHEN orders_count = 1 THEN '1'
    WHEN orders_count = 2 THEN '2'
    WHEN orders_count = 3 THEN '3'
    WHEN orders_count BETWEEN 4 AND 5 THEN '4-5'
    WHEN orders_count BETWEEN 6 AND 9 THEN '6-9'
    WHEN orders_count BETWEEN 10 AND 14 THEN '10-14'
    WHEN orders_count >= 15 THEN '15+'
  END AS bucket,
  COUNT(*) AS clients,
  COALESCE(SUM(ltv), 0) AS total_revenue,
  COALESCE(AVG(ltv / NULLIF(orders_count::numeric, 0)), 0) AS avg_aov,
  COALESCE(AVG(orders_count), 0) AS avg_orders,
  COALESCE(AVG(ltv), 0) AS avg_ltv
FROM clients_360
GROUP BY 1
ORDER BY MIN(orders_count);

CREATE UNIQUE INDEX IF NOT EXISTS idx_repeat_ladder_pk ON crm_repeat_ladder (bucket);
GRANT SELECT ON crm_repeat_ladder TO anon, authenticated, service_role;


-- ============================================
-- Update refresh_crm_views()
-- ============================================
CREATE OR REPLACE FUNCTION refresh_crm_views()
RETURNS void AS $$
BEGIN
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_overview; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_risk; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_worlds; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_occasions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_behavior_segments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohorts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segment_worlds; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_revenue_monthly; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_dashboard_kpis; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_share; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohort_retention; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_time_to_second_order; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohort_by_context; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_product_performance; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_season_performance; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cross_sell; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_repeat_ladder; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

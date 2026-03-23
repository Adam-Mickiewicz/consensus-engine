-- Drop old materialized view (replaced by new views below)
DROP MATERIALIZED VIEW IF EXISTS crm_behavior_segments CASCADE;

-- ────────────────────────────────────────────────────────────────
-- 1. crm_behavior_promo — promo vs full-price per client
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_behavior_promo AS
SELECT
  client_id,
  COUNT(*) FILTER (WHERE is_promo = true)  AS promo_orders,
  COUNT(*) FILTER (WHERE is_promo = false) AS full_price_orders,
  ROUND(COUNT(*) FILTER (WHERE is_promo = true)::numeric / NULLIF(COUNT(*), 0) * 100) AS promo_pct
FROM client_product_events
GROUP BY client_id;

-- ────────────────────────────────────────────────────────────────
-- 2. crm_behavior_basket — basket stats per client
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_behavior_basket AS
SELECT
  client_id,
  ROUND(AVG(order_sum)::numeric, 2) AS avg_basket,
  MAX(order_sum)                     AS max_basket,
  MIN(order_sum)                     AS min_basket,
  ROUND(AVG(quantity))               AS avg_items_per_order
FROM client_product_events
WHERE order_sum IS NOT NULL
GROUP BY client_id;

-- ────────────────────────────────────────────────────────────────
-- 3. crm_behavior_timing — timing patterns per client
--    (window fn must live in subquery before aggregation)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_behavior_timing AS
SELECT
  client_id,
  MODE() WITHIN GROUP (ORDER BY dow)   AS preferred_dow,
  MODE() WITHIN GROUP (ORDER BY month) AS preferred_month,
  ROUND(AVG(days_to_next))             AS avg_days_between_orders
FROM (
  SELECT
    client_id,
    EXTRACT(DOW   FROM order_date)::int AS dow,
    EXTRACT(MONTH FROM order_date)::int AS month,
    EXTRACT(EPOCH FROM (
      LEAD(order_date) OVER (PARTITION BY client_id ORDER BY order_date) - order_date
    )) / 86400 AS days_to_next
  FROM client_product_events
) sub
GROUP BY client_id;

-- ────────────────────────────────────────────────────────────────
-- 4. crm_behavior_loyalty — product diversity per client
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_behavior_loyalty AS
SELECT
  client_id,
  COUNT(DISTINCT ean)          AS unique_products,
  COUNT(DISTINCT product_name) AS unique_titles,
  COUNT(DISTINCT order_id)     AS total_orders,
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT order_id), 0), 1) AS avg_items_per_order,
  COUNT(DISTINCT CASE WHEN is_new_product THEN ean END) AS new_product_purchases
FROM client_product_events
GROUP BY client_id;

-- ────────────────────────────────────────────────────────────────
-- 5. crm_behavior_segments — whole-database aggregates (single row)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_behavior_segments AS
WITH
promo_per_client AS (
  SELECT
    client_id,
    ROUND(COUNT(*) FILTER (WHERE is_promo = true)::numeric / NULLIF(COUNT(*), 0) * 100) AS promo_pct
  FROM client_product_events
  GROUP BY client_id
),
basket_per_client AS (
  SELECT
    client_id,
    AVG(order_sum) AS avg_basket
  FROM client_product_events
  WHERE order_sum IS NOT NULL
  GROUP BY client_id
),
order_gaps AS (
  SELECT
    EXTRACT(EPOCH FROM (
      LEAD(order_date) OVER (PARTITION BY client_id ORDER BY order_date) - order_date
    )) / 86400 AS gap_days
  FROM client_product_events
),
promo_agg AS (
  SELECT
    COUNT(*)                              AS total_clients,
    COUNT(*) FILTER (WHERE promo_pct > 80) AS promo_hunters_count,
    COUNT(*) FILTER (WHERE promo_pct < 20) AS full_price_count,
    COUNT(*) FILTER (WHERE promo_pct BETWEEN 20 AND 80) AS mixed_count
  FROM promo_per_client
),
basket_agg AS (
  SELECT
    ROUND(AVG(avg_basket)::numeric, 2)                                     AS overall_avg_basket,
    COUNT(*) FILTER (WHERE avg_basket < 50)                                AS basket_lt50,
    COUNT(*) FILTER (WHERE avg_basket >= 50  AND avg_basket < 100)         AS basket_50_100,
    COUNT(*) FILTER (WHERE avg_basket >= 100 AND avg_basket < 200)         AS basket_100_200,
    COUNT(*) FILTER (WHERE avg_basket >= 200)                              AS basket_200plus
  FROM basket_per_client
),
gaps_agg AS (
  SELECT
    ROUND(AVG(gap_days))                                           AS avg_days_between_orders,
    COUNT(*) FILTER (WHERE gap_days < 30)                          AS gaps_lt30,
    COUNT(*) FILTER (WHERE gap_days >= 30  AND gap_days < 90)      AS gaps_30_90,
    COUNT(*) FILTER (WHERE gap_days >= 90  AND gap_days < 180)     AS gaps_90_180,
    COUNT(*) FILTER (WHERE gap_days >= 180 AND gap_days < 365)     AS gaps_180_365,
    COUNT(*) FILTER (WHERE gap_days >= 365)                        AS gaps_365plus
  FROM order_gaps
  WHERE gap_days IS NOT NULL
),
dow_agg AS (
  SELECT json_agg(
    json_build_object('dow', dow, 'cnt', cnt) ORDER BY cnt DESC
  ) AS dow_distribution
  FROM (
    SELECT EXTRACT(DOW FROM order_date)::int AS dow, COUNT(*) AS cnt
    FROM client_product_events
    GROUP BY dow
  ) d
),
month_agg AS (
  SELECT json_agg(
    json_build_object('month', month, 'cnt', cnt) ORDER BY cnt DESC
  ) AS month_distribution
  FROM (
    SELECT EXTRACT(MONTH FROM order_date)::int AS month, COUNT(*) AS cnt
    FROM client_product_events
    GROUP BY month
  ) m
),
heatmap_agg AS (
  SELECT json_agg(
    json_build_object('dow', dow, 'month', month, 'cnt', cnt)
  ) AS heatmap
  FROM (
    SELECT
      EXTRACT(DOW   FROM order_date)::int AS dow,
      EXTRACT(MONTH FROM order_date)::int AS month,
      COUNT(*)                            AS cnt
    FROM client_product_events
    GROUP BY dow, month
  ) h
)
SELECT
  pa.total_clients,
  pa.promo_hunters_count,
  pa.full_price_count,
  pa.mixed_count,
  ROUND(pa.promo_hunters_count::numeric / NULLIF(pa.total_clients, 0) * 100) AS promo_hunters_pct,
  ROUND(pa.full_price_count::numeric    / NULLIF(pa.total_clients, 0) * 100) AS full_price_pct,
  ROUND(pa.mixed_count::numeric         / NULLIF(pa.total_clients, 0) * 100) AS mixed_pct,
  ba.overall_avg_basket,
  ba.basket_lt50,
  ba.basket_50_100,
  ba.basket_100_200,
  ba.basket_200plus,
  ga.avg_days_between_orders,
  ga.gaps_lt30,
  ga.gaps_30_90,
  ga.gaps_90_180,
  ga.gaps_180_365,
  ga.gaps_365plus,
  da.dow_distribution,
  ma.month_distribution,
  ha.heatmap
FROM promo_agg pa, basket_agg ba, gaps_agg ga, dow_agg da, month_agg ma, heatmap_agg ha;

-- ────────────────────────────────────────────────────────────────
-- 6. crm_behavior_cobuying — products bought together
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_behavior_cobuying AS
SELECT
  a.product_name AS product_a,
  b.product_name AS product_b,
  COUNT(*)       AS co_purchases
FROM client_product_events a
JOIN client_product_events b
  ON a.order_id = b.order_id
 AND a.product_name < b.product_name
GROUP BY a.product_name, b.product_name
HAVING COUNT(*) > 5
ORDER BY co_purchases DESC;

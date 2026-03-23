-- ────────────────────────────────────────────────────────────────
-- 1. crm_occasion_retention — retencja per okazja rok do roku
--    (uses self-join — much faster than correlated subquery)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_occasion_retention AS
WITH occasion_years AS (
  SELECT
    client_id,
    season                              AS occasion,
    EXTRACT(YEAR FROM order_date)::int  AS year
  FROM client_product_events
  WHERE season IS NOT NULL
  GROUP BY client_id, season, year
),
retention AS (
  SELECT
    oy.occasion,
    oy.year,
    COUNT(DISTINCT oy.client_id)  AS clients,
    COUNT(DISTINCT ny.client_id)  AS returned_next_year
  FROM occasion_years oy
  LEFT JOIN occasion_years ny
    ON  ny.client_id = oy.client_id
    AND ny.occasion  = oy.occasion
    AND ny.year      = oy.year + 1
  GROUP BY oy.occasion, oy.year
)
SELECT
  occasion,
  year,
  clients,
  returned_next_year,
  ROUND(returned_next_year::numeric / NULLIF(clients, 0) * 100, 1) AS retention_pct
FROM retention
ORDER BY occasion, year;

-- ────────────────────────────────────────────────────────────────
-- 2. crm_occasion_loyal — klienci kupujący tę samą okazję 2+ lata
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_occasion_loyal AS
SELECT
  client_id,
  season                                                        AS occasion,
  COUNT(DISTINCT EXTRACT(YEAR FROM order_date)::int)            AS years_active,
  MIN(order_date)                                               AS first_purchase,
  MAX(order_date)                                               AS last_purchase,
  ROUND(SUM(order_sum)::numeric, 2)                             AS total_ltv
FROM client_product_events
WHERE season IS NOT NULL AND order_sum IS NOT NULL
GROUP BY client_id, season
HAVING COUNT(DISTINCT EXTRACT(YEAR FROM order_date)::int) >= 2
ORDER BY years_active DESC, total_ltv DESC;

-- ────────────────────────────────────────────────────────────────
-- 3. crm_occasion_first — pierwsza okazja zakupowa nowych klientów
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_occasion_first AS
WITH first_orders AS (
  SELECT client_id, season AS occasion, order_sum
  FROM (
    SELECT
      client_id,
      season,
      order_sum,
      ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY order_date) AS rn
    FROM client_product_events
    WHERE order_sum IS NOT NULL
  ) sub
  WHERE rn = 1 AND season IS NOT NULL
),
agg AS (
  SELECT
    occasion,
    COUNT(DISTINCT client_id)            AS new_clients,
    ROUND(AVG(order_sum)::numeric, 2)    AS avg_first_basket
  FROM first_orders
  GROUP BY occasion
)
SELECT
  occasion,
  new_clients,
  avg_first_basket,
  ROUND(new_clients::numeric / NULLIF(SUM(new_clients) OVER (), 0) * 100, 1) AS pct_of_new
FROM agg
ORDER BY new_clients DESC;

-- ────────────────────────────────────────────────────────────────
-- 4. crm_occasion_ltv — LTV per okazja
--    avg_client_ltv = avg of each client's TOTAL lifetime value
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_occasion_ltv AS
WITH client_total_ltv AS (
  SELECT client_id, SUM(order_sum) AS client_ltv
  FROM client_product_events
  WHERE order_sum IS NOT NULL
  GROUP BY client_id
)
SELECT
  e.season                                                           AS occasion,
  COUNT(DISTINCT e.client_id)                                        AS clients,
  COUNT(DISTINCT e.order_id)                                         AS orders,
  ROUND(SUM(e.order_sum)::numeric / NULLIF(COUNT(DISTINCT e.order_id), 0), 2) AS avg_basket,
  ROUND(AVG(ctl.client_ltv)::numeric, 2)                             AS avg_client_ltv
FROM client_product_events e
JOIN client_total_ltv ctl ON ctl.client_id = e.client_id
WHERE e.season IS NOT NULL AND e.order_sum IS NOT NULL
GROUP BY e.season
ORDER BY avg_client_ltv DESC;

-- ────────────────────────────────────────────────────────────────
-- 5. crm_occasion_drift — klienci kupujący na wiele okazji (2+)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_occasion_drift AS
SELECT
  client_id,
  ARRAY_AGG(DISTINCT season ORDER BY season) AS occasions,
  COUNT(DISTINCT season)                      AS occasion_count,
  MIN(order_date)                             AS first_order,
  MAX(order_date)                             AS last_order
FROM client_product_events
WHERE season IS NOT NULL
GROUP BY client_id
HAVING COUNT(DISTINCT season) >= 2
ORDER BY occasion_count DESC;

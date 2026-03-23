-- ────────────────────────────────────────────────────────────────
-- 1. crm_segment_collectors
--    Klienci kupujący systematycznie nowości z danego świata
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_segment_collectors AS
SELECT
  e.client_id,
  c.ulubiony_swiat,
  COUNT(DISTINCT e.ean)      AS unique_products,
  COUNT(DISTINCT e.order_id) AS total_orders,
  ROUND(COUNT(DISTINCT e.ean)::numeric / NULLIF(COUNT(DISTINCT e.order_id), 0), 2) AS products_per_order,
  MIN(e.order_date)          AS first_order,
  MAX(e.order_date)          AS last_order
FROM client_product_events e
JOIN clients_360 c USING (client_id)
WHERE c.ulubiony_swiat IS NOT NULL
GROUP BY e.client_id, c.ulubiony_swiat
HAVING COUNT(DISTINCT e.ean) >= 5 AND COUNT(DISTINCT e.order_id) >= 3
ORDER BY unique_products DESC;

-- ────────────────────────────────────────────────────────────────
-- 2. crm_segment_single_product
--    Klienci którzy kupili dokładnie jeden produkt (jeden EAN)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_segment_single_product AS
SELECT
  client_id,
  MAX(product_name)        AS product_name,
  MAX(ean)                 AS ean,
  COUNT(*)                 AS purchase_count,
  ROUND(SUM(order_sum)::numeric, 2) AS total_spent,
  MIN(order_date)          AS first_order,
  MAX(order_date)          AS last_order
FROM client_product_events
WHERE order_sum IS NOT NULL
GROUP BY client_id
HAVING COUNT(DISTINCT ean) = 1
ORDER BY purchase_count DESC;

-- ────────────────────────────────────────────────────────────────
-- 3. crm_segment_world_evolution
--    Klienci z wieloma światami (worlds_list JSONB w clients_360)
--    Uwaga: w DB nie ma kolumny "swiat" w client_product_events;
--           światy są przechowywane w clients_360.worlds_list (jsonb)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_segment_world_evolution AS
SELECT
  c.client_id,
  ARRAY(
    SELECT jsonb_array_elements_text(c.worlds_list)
    ORDER BY 1
  )                                  AS all_worlds,
  jsonb_array_length(c.worlds_list)  AS world_count,
  c.first_order,
  c.last_order
FROM clients_360 c
WHERE c.worlds_list IS NOT NULL
  AND jsonb_array_length(c.worlds_list) >= 2
ORDER BY world_count DESC;

-- ────────────────────────────────────────────────────────────────
-- 4. crm_segment_churn_risk
--    Model predykcyjny churnu — scoring per klient
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_segment_churn_risk AS
SELECT
  c.client_id,
  c.legacy_segment,
  c.risk_level,
  c.ltv,
  c.last_order,
  (CURRENT_DATE - c.last_order::date)::integer     AS days_inactive,
  c.orders_count,
  ROUND(c.ltv / NULLIF(c.orders_count, 0), 2)      AS avg_order_value,
  CASE
    WHEN c.risk_level = 'Lost'     AND c.legacy_segment IN ('Diamond', 'Platinum')                     THEN 'KRYTYCZNY'
    WHEN c.risk_level = 'HighRisk' AND c.legacy_segment IN ('Diamond', 'Platinum', 'Gold')             THEN 'WYSOKI'
    WHEN c.risk_level IN ('Lost', 'HighRisk')        AND c.orders_count >= 3                           THEN 'ŚREDNI'
    WHEN c.risk_level = 'Risk'                                                                         THEN 'NISKI'
    ELSE 'OK'
  END AS churn_priority,
  ROUND(
    (
      CASE c.legacy_segment
        WHEN 'Diamond'  THEN 40
        WHEN 'Platinum' THEN 30
        WHEN 'Gold'     THEN 20
        WHEN 'Returning'THEN 10
        ELSE 5
      END
      +
      CASE c.risk_level
        WHEN 'Lost'     THEN 40
        WHEN 'HighRisk' THEN 30
        WHEN 'Risk'     THEN 15
        ELSE 0
      END
      +
      LEAST(c.orders_count * 2, 20)
    )::numeric,
    0
  ) AS churn_score
FROM clients_360 c
ORDER BY churn_score DESC;

-- ────────────────────────────────────────────────────────────────
-- 5. crm_segment_summary — jeden wiersz z agregratami
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW crm_segment_summary AS
SELECT
  (SELECT COUNT(*) FROM crm_segment_collectors)                                          AS collectors_count,
  (SELECT COUNT(*) FROM crm_segment_single_product)                                      AS single_product_count,
  (SELECT COUNT(*) FROM crm_segment_world_evolution)                                     AS multi_world_count,
  (SELECT COUNT(*) FROM crm_segment_churn_risk WHERE churn_priority = 'KRYTYCZNY')       AS critical_churn,
  (SELECT COUNT(*) FROM crm_segment_churn_risk WHERE churn_priority = 'WYSOKI')          AS high_churn,
  (SELECT ROUND(AVG(churn_score), 1) FROM crm_segment_churn_risk)                        AS avg_churn_score;

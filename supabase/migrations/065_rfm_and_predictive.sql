-- ============================================
-- RFM scoring + predictive columns + matviews
-- ============================================

-- RFM columns
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS rfm_recency_score int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS rfm_frequency_score int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS rfm_monetary_score int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS rfm_total_score int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS rfm_segment text;

-- Predictive columns
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS purchase_probability_30d numeric;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS predicted_ltv_12m numeric;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS predicted_next_order date;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS avg_days_between_orders numeric;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS days_since_last_order int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS customer_health_score int;


-- ============================================
-- FUNCTION: recalculate_rfm_scores
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_rfm_scores()
RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
BEGIN
  WITH metrics AS (
    SELECT
      client_id,
      EXTRACT(DAY FROM NOW() - last_order)::int AS recency_days,
      orders_count AS frequency,
      ltv AS monetary
    FROM clients_360
    WHERE last_order IS NOT NULL
  ),
  quintiles AS (
    SELECT
      client_id,
      recency_days,
      frequency,
      monetary,
      NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
      NTILE(5) OVER (ORDER BY frequency ASC)     AS f_score,
      NTILE(5) OVER (ORDER BY monetary ASC)      AS m_score
    FROM metrics
  )
  UPDATE clients_360 c SET
    rfm_recency_score   = q.r_score,
    rfm_frequency_score = q.f_score,
    rfm_monetary_score  = q.m_score,
    rfm_total_score     = q.r_score + q.f_score + q.m_score,
    rfm_segment = CASE
      WHEN q.r_score >= 4 AND q.f_score >= 4 AND q.m_score >= 4 THEN 'Champions'
      WHEN q.f_score >= 4 AND q.m_score >= 3                     THEN 'Loyal'
      WHEN q.r_score >= 3 AND q.f_score >= 2 AND q.m_score >= 2  THEN 'Potential Loyal'
      WHEN q.r_score >= 4 AND q.f_score <= 2                     THEN 'Recent'
      WHEN q.r_score >= 3 AND q.f_score <= 2                     THEN 'Promising'
      WHEN q.r_score = 3  AND q.f_score = 3                      THEN 'Need Attention'
      WHEN q.r_score = 2  AND q.f_score >= 2                     THEN 'About to Sleep'
      WHEN q.r_score <= 2 AND q.f_score >= 4 AND q.m_score >= 4  THEN 'Cant Lose'
      WHEN q.r_score <= 2 AND q.f_score >= 3 AND q.m_score >= 3  THEN 'At Risk'
      WHEN q.r_score = 1  AND q.f_score = 1                      THEN 'Lost'
      WHEN q.r_score <= 2 AND q.f_score <= 2                     THEN 'Hibernating'
      ELSE 'Other'
    END,
    days_since_last_order = q.recency_days
  FROM quintiles q
  WHERE c.client_id = q.client_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('updated', v_count, 'timestamp', NOW());
END;
$$;


-- ============================================
-- FUNCTION: recalculate_predictive_scores
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_predictive_scores()
RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
BEGIN
  -- avg_days_between_orders + days_since_last_order
  UPDATE clients_360 SET
    avg_days_between_orders = CASE
      WHEN orders_count > 1 AND first_order IS NOT NULL AND last_order IS NOT NULL
      THEN EXTRACT(DAY FROM last_order - first_order)::numeric / NULLIF(orders_count - 1, 0)
      ELSE NULL
    END,
    days_since_last_order = EXTRACT(DAY FROM NOW() - last_order)::int;

  -- predicted_next_order
  UPDATE clients_360 SET
    predicted_next_order = CASE
      WHEN avg_days_between_orders IS NOT NULL AND avg_days_between_orders > 0
      THEN (last_order + (avg_days_between_orders || ' days')::interval)::date
      ELSE NULL
    END
  WHERE avg_days_between_orders IS NOT NULL;

  -- purchase_probability_30d (0-100)
  UPDATE clients_360 SET
    purchase_probability_30d = GREATEST(0, LEAST(100, ROUND(
      CASE
        WHEN orders_count = 1 THEN
          CASE
            WHEN days_since_last_order <= 30  THEN 15
            WHEN days_since_last_order <= 60  THEN 8
            WHEN days_since_last_order <= 90  THEN 4
            ELSE 1
          END
        WHEN avg_days_between_orders IS NOT NULL AND avg_days_between_orders > 0 THEN
          GREATEST(0, LEAST(95,
            CASE
              WHEN predicted_next_order IS NULL THEN 10
              WHEN predicted_next_order <= CURRENT_DATE THEN
                GREATEST(5, 70 - (EXTRACT(DAY FROM CURRENT_DATE - predicted_next_order) * 1.5))
              WHEN predicted_next_order <= CURRENT_DATE + 30 THEN
                60 + (30 - EXTRACT(DAY FROM predicted_next_order - CURRENT_DATE)) * 1.2
              ELSE
                GREATEST(3, 30 - EXTRACT(DAY FROM predicted_next_order - CURRENT_DATE) * 0.3)
            END
            + LEAST(15, orders_count * 0.8)
            + CASE risk_level
                WHEN 'OK'       THEN 5
                WHEN 'Risk'     THEN -5
                WHEN 'HighRisk' THEN -15
                WHEN 'Lost'     THEN -25
                ELSE 0
              END
          ))
        ELSE 5
      END
    , 1)))
  WHERE last_order IS NOT NULL;

  -- predicted_ltv_12m
  UPDATE clients_360 SET
    predicted_ltv_12m = ROUND(
      CASE
        WHEN orders_count = 1 THEN
          ltv * 0.15
        WHEN orders_count >= 2 THEN
          -- yearly frequency × avg basket × retention factor
          (orders_count::numeric / GREATEST(EXTRACT(DAY FROM last_order - first_order) / 365.0, 1))
          * (ltv / NULLIF(orders_count, 0))
          * CASE risk_level
              WHEN 'OK'       THEN 0.85
              WHEN 'Risk'     THEN 0.55
              WHEN 'HighRisk' THEN 0.25
              WHEN 'Lost'     THEN 0.05
              ELSE 0.5
            END
        ELSE
          ltv * 0.1
      END
    , 2)
  WHERE ltv IS NOT NULL AND ltv > 0;

  -- customer_health_score (0-100)
  UPDATE clients_360 SET
    customer_health_score = GREATEST(0, LEAST(100, ROUND(
      COALESCE((rfm_total_score - 3.0) / 12.0 * 100, 20) * 0.5
      + COALESCE(purchase_probability_30d, 5) * 0.3
      + CASE
          WHEN days_since_last_order <= 30  THEN 100
          WHEN days_since_last_order <= 90  THEN 70
          WHEN days_since_last_order <= 180 THEN 40
          WHEN days_since_last_order <= 365 THEN 15
          ELSE 0
        END * 0.2
    )))
  WHERE last_order IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('updated', v_count, 'timestamp', NOW());
END;
$$;


-- ============================================
-- FUNCTION: get_ean_gaps
-- ============================================
CREATE OR REPLACE FUNCTION get_ean_gaps(p_limit int DEFAULT 500)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT
      product_name,
      COUNT(*) AS event_count,
      COUNT(DISTINCT client_id) AS unique_buyers,
      '' AS ean_do_uzupelnienia
    FROM client_product_events
    WHERE ean IS NULL AND product_name IS NOT NULL
    GROUP BY product_name
    ORDER BY COUNT(*) DESC
    LIMIT p_limit
  ) t
$$;


-- ============================================
-- MATERIALIZED VIEW: crm_rfm_distribution
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_rfm_distribution;
CREATE MATERIALIZED VIEW crm_rfm_distribution AS
SELECT
  rfm_segment,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS total_ltv,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(orders_count), 0) AS avg_orders,
  COALESCE(AVG(days_since_last_order), 0) AS avg_recency,
  COALESCE(AVG(purchase_probability_30d), 0) AS avg_probability,
  COALESCE(SUM(predicted_ltv_12m), 0) AS total_predicted_ltv
FROM clients_360
WHERE rfm_segment IS NOT NULL
GROUP BY rfm_segment
ORDER BY total_ltv DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rfm_dist_pk ON crm_rfm_distribution(rfm_segment);


-- ============================================
-- MATERIALIZED VIEW: crm_customer_journey
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_customer_journey;
CREATE MATERIALIZED VIEW crm_customer_journey AS
WITH ranked_orders AS (
  SELECT
    client_id,
    order_id,
    MIN(order_date) AS order_date,
    SUM(line_total) AS order_value,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY MIN(order_date)) AS order_number
  FROM client_product_events
  GROUP BY client_id, order_id
),
order_products AS (
  SELECT
    cpe.client_id,
    cpe.order_id,
    ro.order_number,
    p.product_group,
    c.top_domena
  FROM client_product_events cpe
  JOIN ranked_orders ro ON ro.client_id = cpe.client_id AND ro.order_id = cpe.order_id
  LEFT JOIN products p ON p.ean = cpe.ean
  LEFT JOIN clients_360 c ON c.client_id = cpe.client_id
  WHERE ro.order_number <= 5
)
SELECT
  order_number,
  product_group,
  top_domena AS world,
  COUNT(DISTINCT client_id) AS client_count,
  COUNT(*) AS item_count
FROM order_products
WHERE product_group IS NOT NULL
GROUP BY order_number, product_group, top_domena
HAVING COUNT(DISTINCT client_id) >= 5
ORDER BY order_number, client_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_pk
  ON crm_customer_journey(order_number, COALESCE(product_group, ''), COALESCE(world, ''));


-- ============================================
-- MATERIALIZED VIEW: crm_journey_transitions
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_journey_transitions;
CREATE MATERIALIZED VIEW crm_journey_transitions AS
WITH ranked_orders AS (
  SELECT
    client_id,
    order_id,
    MIN(order_date) AS order_date,
    SUM(line_total) AS order_value,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY MIN(order_date)) AS order_number
  FROM client_product_events
  GROUP BY client_id, order_id
),
order_top_group AS (
  SELECT DISTINCT ON (ro.client_id, ro.order_number)
    ro.client_id,
    ro.order_number,
    ro.order_value,
    EXTRACT(DAY FROM ro.order_date - LAG(ro.order_date) OVER (PARTITION BY ro.client_id ORDER BY ro.order_number))::int AS days_since_prev,
    p.product_group
  FROM ranked_orders ro
  JOIN client_product_events cpe ON cpe.client_id = ro.client_id AND cpe.order_id = ro.order_id
  LEFT JOIN products p ON p.ean = cpe.ean
  WHERE ro.order_number <= 5 AND p.product_group IS NOT NULL
  ORDER BY ro.client_id, ro.order_number, cpe.line_total DESC
)
SELECT
  o1.product_group AS from_group,
  o1.order_number AS from_order,
  o2.product_group AS to_group,
  o2.order_number AS to_order,
  COUNT(*) AS transition_count,
  ROUND(AVG(o2.days_since_prev)) AS avg_days_between,
  ROUND(AVG(o2.order_value), 2) AS avg_order_value
FROM order_top_group o1
JOIN order_top_group o2 ON o2.client_id = o1.client_id AND o2.order_number = o1.order_number + 1
GROUP BY o1.product_group, o1.order_number, o2.product_group, o2.order_number
HAVING COUNT(*) >= 3
ORDER BY from_order, transition_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_journey_trans_pk
  ON crm_journey_transitions(from_order, COALESCE(from_group,''), to_order, COALESCE(to_group,''));


-- ============================================
-- Individual refresh RPCs
-- ============================================
CREATE OR REPLACE FUNCTION refresh_view_rfm_distribution() RETURNS void AS $$
BEGIN
  SET statement_timeout = '0';
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_rfm_distribution;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_view_customer_journey() RETURNS void AS $$
BEGIN
  SET statement_timeout = '0';
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_customer_journey;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_view_journey_transitions() RETURNS void AS $$
BEGIN
  SET statement_timeout = '0';
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_journey_transitions;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- Update refresh_crm_views
-- ============================================
CREATE OR REPLACE FUNCTION refresh_crm_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_revenue_monthly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_dashboard_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_share;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohort_retention;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_time_to_second_order;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohort_by_context;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_product_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_season_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cross_sell;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_scorecard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_opportunity_queue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_dependency;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_rfm_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_customer_journey;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_journey_transitions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'refresh error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

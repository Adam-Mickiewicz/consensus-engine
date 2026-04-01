-- ============================================
-- MATERIALIZED VIEW: crm_promo_scorecard
-- Performance każdej promocji z tabeli promotions
-- Wersja uproszczona (bez repeat_after_90d)
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_promo_scorecard;
CREATE MATERIALIZED VIEW crm_promo_scorecard AS
SELECT
  p.id,
  p.promo_name,
  p.promo_type,
  p.discount_type,
  p.discount_min,
  p.discount_max,
  p.free_shipping,
  p.start_date,
  p.end_date,
  p.season,
  p.code_name,
  COALESCE(stats.revenue, 0) AS promo_revenue,
  COALESCE(stats.orders, 0) AS promo_orders,
  COALESCE(stats.customers, 0) AS promo_customers,
  COALESCE(stats.new_customers, 0) AS new_customers_in_promo,
  COALESCE(stats.avg_ov, 0) AS avg_order_value
FROM promotions p
LEFT JOIN LATERAL (
  SELECT
    SUM(cpe.line_total) AS revenue,
    COUNT(DISTINCT cpe.order_id) AS orders,
    COUNT(DISTINCT cpe.client_id) AS customers,
    COUNT(DISTINCT cpe.client_id) FILTER (
      WHERE c.first_order >= p.start_date AND c.first_order <= p.end_date + INTERVAL '1 day'
    ) AS new_customers,
    AVG(cpe.order_sum) AS avg_ov
  FROM client_product_events cpe
  JOIN clients_360 c ON c.client_id = cpe.client_id
  WHERE cpe.order_date >= p.start_date
    AND cpe.order_date <= p.end_date + INTERVAL '1 day'
) stats ON true
ORDER BY p.start_date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_scorecard_pk
  ON crm_promo_scorecard (id);


-- ============================================
-- MATERIALIZED VIEW: crm_opportunity_queue
-- Gotowe segmenty do akcji CRM
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_opportunity_queue;
CREATE MATERIALIZED VIEW crm_opportunity_queue AS

-- 1. VIP reactivation (Diamond/Platinum Lost/HighRisk)
SELECT
  'vip_reactivation' AS opportunity_type,
  'VIP do reanimacji' AS label,
  'Diamond/Platinum w statusie Lost lub HighRisk' AS description,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS revenue_potential,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
  'critical' AS urgency,
  1 AS sort_order
FROM clients_360
WHERE legacy_segment IN ('Diamond', 'Platinum')
  AND risk_level IN ('Lost', 'HighRisk')

UNION ALL

-- 2. 2nd order conversion (New, 30-90d window)
SELECT
  'second_order' AS opportunity_type,
  'Konwersja na 2. zamówienie' AS label,
  'Klienci po 1. zakupie w oknie 30-90 dni' AS description,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS revenue_potential,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
  'high' AS urgency,
  2 AS sort_order
FROM clients_360
WHERE orders_count = 1
  AND last_order > NOW() - INTERVAL '90 days'
  AND last_order <= NOW() - INTERVAL '30 days'

UNION ALL

-- 3. Falling frequency (Platinum/Gold, risk level = Risk)
SELECT
  'falling_frequency' AS opportunity_type,
  'Spadająca częstotliwość' AS label,
  'Platinum/Gold z rosnącym ryzykiem' AS description,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS revenue_potential,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
  'high' AS urgency,
  3 AS sort_order
FROM clients_360
WHERE legacy_segment IN ('Platinum', 'Gold')
  AND risk_level = 'Risk'

UNION ALL

-- 4. Returning at risk (Returning + Risk/HighRisk)
SELECT
  'returning_at_risk' AS opportunity_type,
  'Returning zagrożeni odejściem' AS label,
  'Returning z podwyższonym ryzykiem' AS description,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS revenue_potential,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
  'medium' AS urgency,
  4 AS sort_order
FROM clients_360
WHERE legacy_segment = 'Returning'
  AND risk_level IN ('Risk', 'HighRisk')

UNION ALL

-- 5. Dormant loyals (orders > 5, last_order > 180d)
SELECT
  'dormant_loyals' AS opportunity_type,
  'Uśpieni lojalni' AS label,
  'Klienci z 5+ zamówieniami, nieaktywni 180+ dni' AS description,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS revenue_potential,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
  'medium' AS urgency,
  5 AS sort_order
FROM clients_360
WHERE orders_count >= 5
  AND last_order < NOW() - INTERVAL '180 days'

UNION ALL

-- 6. Recent high-value (kupili w 30d, LTV > 1000)
SELECT
  'recent_high_value' AS opportunity_type,
  'Świeżo aktywni VIP' AS label,
  'Kupili w ostatnich 30d, LTV > 1000 zł' AS description,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS revenue_potential,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
  'low' AS urgency,
  6 AS sort_order
FROM clients_360
WHERE last_order > NOW() - INTERVAL '30 days'
  AND ltv > 1000

ORDER BY sort_order;

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_queue_pk
  ON crm_opportunity_queue (opportunity_type);


-- ============================================
-- MATERIALIZED VIEW: crm_promo_dependency
-- Segmentacja klientów wg uzależnienia od promo
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_promo_dependency;
CREATE MATERIALIZED VIEW crm_promo_dependency AS
SELECT * FROM (
  WITH client_promo_stats AS (
    SELECT
      client_id,
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE is_promo = true) AS promo_orders,
      ROUND(
        COUNT(*) FILTER (WHERE is_promo = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1
      ) AS promo_pct
    FROM (
      SELECT DISTINCT client_id, order_id, BOOL_OR(is_promo) AS is_promo
      FROM client_product_events
      GROUP BY client_id, order_id
    ) orders_agg
    GROUP BY client_id
  )
  SELECT
    CASE
      WHEN promo_pct = 0 OR promo_pct IS NULL THEN 'never_promo'
      WHEN promo_pct <= 33 THEN 'low_promo'
      WHEN promo_pct <= 66 THEN 'mixed'
      WHEN promo_pct <= 90 THEN 'promo_led'
      ELSE 'promo_addicted'
    END AS dependency_segment,
    COUNT(*) AS client_count,
    COALESCE(SUM(c.ltv), 0) AS total_ltv,
    COALESCE(AVG(c.ltv), 0) AS avg_ltv,
    COALESCE(AVG(c.orders_count), 0) AS avg_orders,
    COALESCE(AVG(promo_pct), 0) AS avg_promo_pct
  FROM client_promo_stats cps
  JOIN clients_360 c ON c.client_id = cps.client_id
  GROUP BY 1
) sub
ORDER BY
  CASE dependency_segment
    WHEN 'never_promo' THEN 1
    WHEN 'low_promo' THEN 2
    WHEN 'mixed' THEN 3
    WHEN 'promo_led' THEN 4
    WHEN 'promo_addicted' THEN 5
  END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_dependency_pk
  ON crm_promo_dependency (dependency_segment);


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
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_scorecard; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_opportunity_queue; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_dependency; EXCEPTION WHEN OTHERS THEN NULL; END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

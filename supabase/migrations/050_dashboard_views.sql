-- ============================================
-- WIDOK: crm_dashboard_kpis
-- Agregowane KPI dla Executive Dashboard
-- ============================================
DROP VIEW IF EXISTS crm_dashboard_kpis;
CREATE VIEW crm_dashboard_kpis AS
SELECT
  COUNT(*) FILTER (WHERE last_order > NOW() - INTERVAL '90 days') AS active_90d,
  COUNT(*) FILTER (WHERE orders_count > 1 AND last_order > NOW() - INTERVAL '90 days') AS repeaters_90d,
  COUNT(*) FILTER (WHERE last_order > NOW() - INTERVAL '90 days') AS buyers_90d,
  COALESCE(SUM(ltv) FILTER (WHERE risk_level IN ('Risk', 'HighRisk') AND legacy_segment IN ('Diamond', 'Platinum', 'Gold')), 0) AS at_risk_revenue,
  COUNT(*) FILTER (WHERE risk_level IN ('Risk', 'HighRisk') AND legacy_segment IN ('Diamond', 'Platinum', 'Gold')) AS at_risk_count,
  COUNT(*) FILTER (WHERE risk_level IN ('HighRisk', 'Lost') AND legacy_segment IN ('Diamond', 'Platinum')) AS winback_vip_count,
  COALESCE(SUM(ltv) FILTER (WHERE risk_level IN ('HighRisk', 'Lost') AND legacy_segment IN ('Diamond', 'Platinum')), 0) AS winback_vip_revenue,
  COUNT(*) AS total_clients,
  COALESCE(SUM(ltv), 0) AS total_ltv,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COUNT(*) FILTER (WHERE legacy_segment = 'Diamond') AS diamond_count,
  COUNT(*) FILTER (
    WHERE orders_count = 1
    AND last_order > NOW() - INTERVAL '90 days'
    AND last_order <= NOW() - INTERVAL '30 days'
  ) AS second_order_candidates
FROM clients_360;


-- ============================================
-- WIDOK: crm_segment_risk_matrix
-- ============================================
DROP VIEW IF EXISTS crm_segment_risk_matrix;
CREATE VIEW crm_segment_risk_matrix AS
SELECT
  legacy_segment,
  risk_level,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS total_ltv,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(orders_count), 0) AS avg_orders
FROM clients_360
GROUP BY legacy_segment, risk_level
ORDER BY
  CASE legacy_segment WHEN 'Diamond' THEN 1 WHEN 'Platinum' THEN 2 WHEN 'Gold' THEN 3 WHEN 'Returning' THEN 4 WHEN 'New' THEN 5 END,
  CASE risk_level WHEN 'OK' THEN 1 WHEN 'Risk' THEN 2 WHEN 'HighRisk' THEN 3 WHEN 'Lost' THEN 4 END;


-- ============================================
-- WIDOK: crm_revenue_monthly
-- ============================================
DROP VIEW IF EXISTS crm_revenue_monthly;
CREATE VIEW crm_revenue_monthly AS
SELECT
  DATE_TRUNC('month', cpe.order_date)::date AS month,
  COALESCE(SUM(cpe.line_total), 0) AS total_revenue,
  COALESCE(SUM(cpe.line_total) FILTER (WHERE c.orders_count > 1), 0) AS repeat_revenue,
  COALESCE(SUM(cpe.line_total) FILTER (WHERE c.orders_count = 1), 0) AS new_revenue,
  COALESCE(SUM(cpe.line_total) FILTER (WHERE cpe.is_promo = true), 0) AS promo_revenue,
  COUNT(DISTINCT cpe.order_id) AS order_count,
  COUNT(DISTINCT cpe.client_id) AS unique_customers
FROM client_product_events cpe
JOIN clients_360 c ON c.client_id = cpe.client_id
WHERE cpe.order_date > NOW() - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', cpe.order_date)
ORDER BY month;


-- ============================================
-- WIDOK: crm_lifecycle_funnel
-- ============================================
DROP VIEW IF EXISTS crm_lifecycle_funnel;
CREATE VIEW crm_lifecycle_funnel AS
SELECT
  CASE
    WHEN orders_count = 1 THEN '1_new'
    WHEN orders_count BETWEEN 2 AND 3 THEN '2_returning'
    WHEN orders_count BETWEEN 4 AND 7 THEN '3_gold'
    WHEN orders_count BETWEEN 8 AND 14 THEN '4_platinum'
    WHEN orders_count >= 15 THEN '5_diamond'
  END AS stage,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS total_ltv,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(orders_count), 0) AS avg_orders
FROM clients_360
GROUP BY 1
ORDER BY 1;


-- ============================================
-- WIDOK: crm_worlds_performance
-- ============================================
DROP VIEW IF EXISTS crm_worlds_performance;
CREATE VIEW crm_worlds_performance AS
SELECT
  c.top_domena AS world,
  COUNT(*) AS client_count,
  COALESCE(SUM(c.ltv), 0) AS total_ltv,
  COALESCE(AVG(c.ltv), 0) AS avg_ltv,
  COUNT(*) FILTER (WHERE c.orders_count > 1) AS repeat_clients,
  ROUND(
    COUNT(*) FILTER (WHERE c.orders_count > 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) AS repeat_rate,
  COUNT(*) FILTER (WHERE c.legacy_segment IN ('Diamond', 'Platinum')) AS vip_count,
  COUNT(*) FILTER (WHERE c.risk_level = 'Lost') AS lost_count,
  COALESCE(AVG(c.orders_count), 0) AS avg_orders
FROM clients_360 c
WHERE c.top_domena IS NOT NULL AND c.top_domena != ''
GROUP BY c.top_domena
ORDER BY client_count DESC;


-- ============================================
-- WIDOK: crm_promo_share
-- ============================================
DROP VIEW IF EXISTS crm_promo_share;
CREATE VIEW crm_promo_share AS
SELECT
  COALESCE(SUM(line_total) FILTER (WHERE is_promo = true), 0) AS promo_revenue,
  COALESCE(SUM(line_total), 0) AS total_revenue,
  ROUND(
    COALESCE(SUM(line_total) FILTER (WHERE is_promo = true), 0)::numeric /
    NULLIF(SUM(line_total), 0) * 100, 1
  ) AS promo_share_pct,
  COALESCE(SUM(line_total) FILTER (WHERE is_new_product = true), 0) AS new_product_revenue,
  ROUND(
    COALESCE(SUM(line_total) FILTER (WHERE is_new_product = true), 0)::numeric /
    NULLIF(SUM(line_total), 0) * 100, 1
  ) AS new_product_share_pct
FROM client_product_events
WHERE order_date > NOW() - INTERVAL '90 days';

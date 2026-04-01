-- Convert crm_revenue_monthly to a materialized view for instant queries.
-- Regular view requires full JOIN scan every call (~5s). Materialized = pre-computed (~10ms).
-- Must be refreshed after data imports (add to existing refresh_crm_views function).

DROP VIEW IF EXISTS crm_revenue_monthly;

CREATE MATERIALIZED VIEW crm_revenue_monthly AS
SELECT
  DATE_TRUNC('month', cpe.order_date)::date AS month,
  COALESCE(SUM(cpe.line_total), 0) AS total_revenue,
  COALESCE(SUM(cpe.line_total) FILTER (WHERE c.orders_count > 1), 0) AS repeat_revenue,
  COALESCE(SUM(cpe.line_total) FILTER (WHERE c.orders_count = 1), 0) AS new_revenue,
  COALESCE(SUM(cpe.line_total) FILTER (WHERE cpe.is_promo = true), 0) AS promo_revenue
FROM client_product_events cpe
JOIN clients_360 c ON c.client_id = cpe.client_id
WHERE cpe.order_date > NOW() - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', cpe.order_date)
ORDER BY month;

-- Index for fast ORDER BY month queries
CREATE INDEX IF NOT EXISTS crm_revenue_monthly_month_idx ON crm_revenue_monthly (month DESC);

-- Grant read access to the API roles
GRANT SELECT ON crm_revenue_monthly TO anon, authenticated, service_role;

-- Also convert crm_dashboard_kpis to materialized (currently 2.6s on 151k rows)
DROP VIEW IF EXISTS crm_dashboard_kpis;

CREATE MATERIALIZED VIEW crm_dashboard_kpis AS
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

GRANT SELECT ON crm_dashboard_kpis TO anon, authenticated, service_role;

-- Also convert crm_promo_share (scans 477k events)
DROP VIEW IF EXISTS crm_promo_share;

CREATE MATERIALIZED VIEW crm_promo_share AS
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

GRANT SELECT ON crm_promo_share TO anon, authenticated, service_role;

-- Update refresh function to include new materialized views
CREATE OR REPLACE FUNCTION refresh_crm_views() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_risk;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_worlds;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_occasions;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_behavior_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohorts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segment_worlds;
  REFRESH MATERIALIZED VIEW crm_revenue_monthly;
  REFRESH MATERIALIZED VIEW crm_dashboard_kpis;
  REFRESH MATERIALIZED VIEW crm_promo_share;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

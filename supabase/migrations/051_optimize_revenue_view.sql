-- Rebuild crm_revenue_monthly without expensive COUNT(DISTINCT) columns
-- Those columns caused 4-8s query time and timeouts
DROP VIEW IF EXISTS crm_revenue_monthly;
CREATE VIEW crm_revenue_monthly AS
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

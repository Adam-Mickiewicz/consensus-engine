-- ============================================
-- Kolumny: gift_score, gift_label, lead_score, lead_temperature
-- ============================================
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS gift_score int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS gift_label text;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS lead_score int;
ALTER TABLE clients_360 ADD COLUMN IF NOT EXISTS lead_temperature text;


-- ============================================
-- FUNCTION: recalculate_gift_scores
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_gift_scores()
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_count int;
BEGIN
  WITH client_gift_signals AS (
    SELECT
      cpe.client_id,
      COUNT(*) AS total_events,
      COUNT(*) FILTER (WHERE UPPER(cpe.season) IN (
        'MIKOLAJKI','GWIAZDKA','WALENTYNKI','DZIEN_MATKI','DZIEN_OJCA',
        'DZIEN_KOBIET','DZIEN_CHLOPAKA','DZIEN_NAUCZYCIELA','DZIEN_DZIECKA'
      )) AS gift_season_events,
      COUNT(*) FILTER (WHERE p.segment_prezentowy IS NOT NULL AND p.segment_prezentowy != '') AS prezent_product_events,
      COUNT(*) FILTER (WHERE p.okazje IS NOT NULL AND array_length(p.okazje, 1) > 0) AS occasion_product_events,
      COUNT(DISTINCT p.product_group) AS unique_product_groups,
      COUNT(*) FILTER (WHERE
        LOWER(cpe.product_name) LIKE '%zestaw%'
        OR LOWER(cpe.product_name) LIKE '%gift%'
        OR LOWER(cpe.product_name) LIKE '%box%'
        OR LOWER(cpe.product_name) LIKE '%prezent%'
        OR LOWER(cpe.product_name) LIKE '%pakiet%'
      ) AS gift_box_events,
      COUNT(DISTINCT p.segment_prezentowy) FILTER (WHERE p.segment_prezentowy IS NOT NULL) AS unique_gift_segments
    FROM client_product_events cpe
    LEFT JOIN products p ON p.ean = cpe.ean
    GROUP BY cpe.client_id
  ),
  scored AS (
    SELECT
      gs.client_id,
      GREATEST(0, LEAST(100, ROUND(
        CASE WHEN gs.total_events > 0 THEN LEAST(100, gs.gift_season_events::numeric / gs.total_events * 100 * 1.5) ELSE 0 END * 0.30
        + CASE WHEN gs.total_events > 0 THEN LEAST(100, gs.prezent_product_events::numeric / gs.total_events * 100 * 2) ELSE 0 END * 0.25
        + CASE WHEN gs.total_events > 0 THEN LEAST(100, gs.occasion_product_events::numeric / gs.total_events * 100 * 1.5) ELSE 0 END * 0.15
        + LEAST(100, gs.unique_product_groups * 15) * 0.10
        + CASE WHEN gs.total_events > 0 THEN LEAST(100, gs.gift_box_events::numeric / gs.total_events * 100 * 5) ELSE 0 END * 0.10
        + LEAST(100, gs.unique_gift_segments * 25) * 0.10
      ))) AS score
    FROM client_gift_signals gs
  )
  UPDATE clients_360 c SET
    gift_score = s.score,
    gift_label = CASE
      WHEN s.score > 60 THEN 'Głównie prezenty'
      WHEN s.score > 30 THEN 'Mix: siebie + prezenty'
      ELSE 'Głównie dla siebie'
    END
  FROM scored s
  WHERE c.client_id = s.client_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('updated', v_count, 'timestamp', NOW());
END;
$$;


-- ============================================
-- FUNCTION: recalculate_lead_scores
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_lead_scores()
RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
  v_current_month int;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  WITH season_matches AS (
    SELECT client_id,
      BOOL_OR(
        (UPPER(season) IN ('MIKOLAJKI','GWIAZDKA') AND v_current_month BETWEEN 10 AND 12)
        OR (UPPER(season) = 'WALENTYNKI' AND v_current_month BETWEEN 1 AND 2)
        OR (UPPER(season) = 'DZIEN_KOBIET' AND v_current_month BETWEEN 2 AND 3)
        OR (UPPER(season) IN ('DZIEN_MATKI','DZIEN_OJCA') AND v_current_month BETWEEN 4 AND 6)
        OR (UPPER(season) = 'WIELKANOC' AND v_current_month BETWEEN 3 AND 4)
        OR (UPPER(season) = 'DZIEN_DZIECKA' AND v_current_month = 6)
        OR (UPPER(season) = 'DZIEN_CHLOPAKA' AND v_current_month BETWEEN 9 AND 10)
        OR (UPPER(season) = 'DZIEN_NAUCZYCIELA' AND v_current_month = 10)
        OR (UPPER(season) = 'BLACK_WEEK' AND v_current_month = 11)
      ) AS in_season
    FROM client_product_events
    WHERE season IS NOT NULL AND season != ''
    GROUP BY client_id
  ),
  scored AS (
    SELECT
      c.client_id,
      GREATEST(0, LEAST(100, ROUND(
        COALESCE(c.purchase_probability_30d, 5) * 0.40
        + CASE
            WHEN c.days_since_last_order <= 7 THEN 100
            WHEN c.days_since_last_order <= 30 THEN 80
            WHEN c.days_since_last_order <= 60 THEN 55
            WHEN c.days_since_last_order <= 90 THEN 35
            WHEN c.days_since_last_order <= 180 THEN 15
            ELSE 3
          END * 0.20
        + LEAST(100, c.orders_count * 8) * 0.15
        + LEAST(100, c.ltv::numeric / 3.6) * 0.10
        + CASE WHEN COALESCE(sm.in_season, false) THEN 80 ELSE 10 END * 0.15
      ))) AS score
    FROM clients_360 c
    LEFT JOIN season_matches sm ON sm.client_id = c.client_id
    WHERE c.last_order IS NOT NULL
  )
  UPDATE clients_360 c SET
    lead_score = s.score,
    lead_temperature = CASE
      WHEN s.score >= 70 THEN 'Hot'
      WHEN s.score >= 45 THEN 'Warm'
      WHEN s.score >= 20 THEN 'Cool'
      ELSE 'Cold'
    END
  FROM scored s
  WHERE c.client_id = s.client_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('updated', v_count, 'timestamp', NOW());
END;
$$;


-- ============================================
-- MATERIALIZED VIEW: crm_launch_monitor
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_launch_monitor;
CREATE MATERIALIZED VIEW crm_launch_monitor AS
SELECT
  p.ean,
  p.name AS product_name,
  p.launch_date,
  p.product_group,
  p.collection,
  EXTRACT(DAY FROM NOW() - p.launch_date::timestamp)::int AS days_since_launch,
  COUNT(DISTINCT cpe.order_id) AS orders,
  COUNT(DISTINCT cpe.client_id) AS unique_buyers,
  COUNT(DISTINCT cpe.client_id) FILTER (WHERE c.orders_count = 1) AS new_customer_buyers,
  COUNT(DISTINCT cpe.client_id) FILTER (WHERE c.orders_count > 1) AS repeat_customer_buyers,
  COALESCE(SUM(cpe.line_total), 0) AS total_revenue,
  COALESCE(SUM(cpe.quantity), 0) AS total_quantity,
  ROUND(
    COUNT(DISTINCT cpe.client_id) FILTER (WHERE c.orders_count > 1)::numeric /
    NULLIF(COUNT(DISTINCT cpe.client_id), 0) * 100, 1
  ) AS repeat_buyer_pct
FROM products p
LEFT JOIN client_product_events cpe ON cpe.ean = p.ean
LEFT JOIN clients_360 c ON c.client_id = cpe.client_id
WHERE p.launch_date IS NOT NULL
  AND p.launch_date >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY p.ean, p.name, p.launch_date, p.product_group, p.collection
ORDER BY p.launch_date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_launch_monitor_pk ON crm_launch_monitor(ean);


-- ============================================
-- MATERIALIZED VIEW: crm_lead_distribution
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_lead_distribution;
CREATE MATERIALIZED VIEW crm_lead_distribution AS
SELECT
  lead_temperature,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS total_ltv,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(purchase_probability_30d), 0) AS avg_probability,
  COALESCE(AVG(lead_score), 0) AS avg_lead_score,
  COALESCE(SUM(predicted_ltv_12m), 0) AS predicted_revenue
FROM clients_360
WHERE lead_temperature IS NOT NULL
GROUP BY lead_temperature
ORDER BY avg_lead_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_dist_pk ON crm_lead_distribution(lead_temperature);


-- ============================================
-- MATERIALIZED VIEW: crm_gift_distribution
-- ============================================
DROP MATERIALIZED VIEW IF EXISTS crm_gift_distribution;
CREATE MATERIALIZED VIEW crm_gift_distribution AS
SELECT
  gift_label,
  COUNT(*) AS client_count,
  COALESCE(SUM(ltv), 0) AS total_ltv,
  COALESCE(AVG(ltv), 0) AS avg_ltv,
  COALESCE(AVG(orders_count), 0) AS avg_orders,
  COALESCE(AVG(gift_score), 0) AS avg_gift_score
FROM clients_360
WHERE gift_label IS NOT NULL
GROUP BY gift_label
ORDER BY avg_gift_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_dist_pk ON crm_gift_distribution(gift_label);


-- ============================================
-- Refresh functions
-- ============================================
CREATE OR REPLACE FUNCTION refresh_view_launch_monitor() RETURNS void AS $$
BEGIN SET statement_timeout = '0'; REFRESH MATERIALIZED VIEW CONCURRENTLY crm_launch_monitor; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_view_lead_distribution() RETURNS void AS $$
BEGIN SET statement_timeout = '0'; REFRESH MATERIALIZED VIEW CONCURRENTLY crm_lead_distribution; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_view_gift_distribution() RETURNS void AS $$
BEGIN SET statement_timeout = '0'; REFRESH MATERIALIZED VIEW CONCURRENTLY crm_gift_distribution; END;
$$ LANGUAGE plpgsql;

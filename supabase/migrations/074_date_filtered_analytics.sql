-- ─── Date-filtered analytics functions ──────────────────────────────────────
-- Each function filters clients_360 by last_order date range, then computes
-- metrics only for clients active in that period.
-- Used by CRM pages when a date range is selected (fallback: matviews).

-- Promo dependency filtered by client activity
CREATE OR REPLACE FUNCTION get_promo_dependency_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::json)
  FROM (
    WITH active_clients AS (
      SELECT client_id FROM clients_360 WHERE last_order::date BETWEEN p_from AND p_to
    ),
    client_promo_stats AS (
      SELECT
        cpe.client_id,
        COUNT(DISTINCT cpe.order_id) AS total_orders,
        COUNT(DISTINCT cpe.order_id) FILTER (WHERE cpe.is_promo = true) AS promo_orders,
        ROUND(
          COUNT(DISTINCT cpe.order_id) FILTER (WHERE cpe.is_promo = true)::numeric /
          NULLIF(COUNT(DISTINCT cpe.order_id), 0) * 100, 1
        ) AS promo_pct
      FROM client_product_events cpe
      JOIN active_clients ac ON ac.client_id = cpe.client_id
      GROUP BY cpe.client_id
    )
    SELECT
      CASE
        WHEN cps.promo_pct = 0 OR cps.promo_pct IS NULL THEN 'never_promo'
        WHEN cps.promo_pct <= 33 THEN 'low_promo'
        WHEN cps.promo_pct <= 66 THEN 'mixed'
        WHEN cps.promo_pct <= 90 THEN 'promo_led'
        ELSE 'promo_addicted'
      END AS dependency_segment,
      COUNT(*) AS client_count,
      COALESCE(SUM(c.ltv), 0) AS total_ltv,
      COALESCE(AVG(c.ltv), 0) AS avg_ltv,
      COALESCE(AVG(c.orders_count), 0) AS avg_orders,
      COALESCE(AVG(cps.promo_pct), 0) AS avg_promo_pct,
      CASE
        WHEN cps.promo_pct = 0 OR cps.promo_pct IS NULL THEN 1
        WHEN cps.promo_pct <= 33 THEN 2
        WHEN cps.promo_pct <= 66 THEN 3
        WHEN cps.promo_pct <= 90 THEN 4
        ELSE 5
      END AS sort_order
    FROM client_promo_stats cps
    JOIN clients_360 c ON c.client_id = cps.client_id
    GROUP BY 1, 7
  ) t
$$;


-- Lifecycle funnel filtered by client activity
CREATE OR REPLACE FUNCTION get_lifecycle_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.stage), '[]'::json)
  FROM (
    SELECT
      CASE
        WHEN orders_count = 1              THEN '1_new'
        WHEN orders_count BETWEEN 2 AND 3  THEN '2_returning'
        WHEN orders_count BETWEEN 4 AND 7  THEN '3_gold'
        WHEN orders_count BETWEEN 8 AND 14 THEN '4_platinum'
        WHEN orders_count >= 15            THEN '5_diamond'
      END AS stage,
      COUNT(*)                     AS client_count,
      COALESCE(SUM(ltv), 0)        AS total_ltv,
      COALESCE(AVG(ltv), 0)        AS avg_ltv,
      COALESCE(AVG(orders_count), 0) AS avg_orders
    FROM clients_360
    WHERE last_order::date BETWEEN p_from AND p_to
    GROUP BY 1
  ) t
$$;


-- RFM distribution filtered by client activity
CREATE OR REPLACE FUNCTION get_rfm_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.total_ltv DESC), '[]'::json)
  FROM (
    SELECT
      rfm_segment,
      COUNT(*)                                           AS client_count,
      COALESCE(SUM(ltv), 0)                             AS total_ltv,
      COALESCE(AVG(ltv), 0)                             AS avg_ltv,
      COALESCE(AVG(orders_count), 0)                    AS avg_orders,
      COALESCE(AVG(days_since_last_order), 0)           AS avg_recency,
      COALESCE(AVG(purchase_probability_30d), 0)        AS avg_probability,
      COALESCE(SUM(predicted_ltv_12m), 0)               AS total_predicted_ltv
    FROM clients_360
    WHERE rfm_segment IS NOT NULL
      AND last_order::date BETWEEN p_from AND p_to
    GROUP BY rfm_segment
  ) t
$$;


-- Segment × Risk matrix filtered
CREATE OR REPLACE FUNCTION get_segment_risk_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      legacy_segment,
      risk_level,
      COUNT(*)                     AS client_count,
      COALESCE(SUM(ltv), 0)        AS total_ltv,
      COALESCE(AVG(ltv), 0)        AS avg_ltv,
      COALESCE(AVG(orders_count), 0) AS avg_orders
    FROM clients_360
    WHERE last_order::date BETWEEN p_from AND p_to
    GROUP BY legacy_segment, risk_level
    ORDER BY
      CASE legacy_segment WHEN 'Diamond' THEN 1 WHEN 'Platinum' THEN 2 WHEN 'Gold' THEN 3 WHEN 'Returning' THEN 4 WHEN 'New' THEN 5 ELSE 6 END,
      CASE risk_level      WHEN 'OK' THEN 1      WHEN 'Risk' THEN 2      WHEN 'HighRisk' THEN 3      WHEN 'Lost' THEN 4 ELSE 5 END
  ) t
$$;


-- Worlds (domeny) performance filtered
CREATE OR REPLACE FUNCTION get_worlds_clients_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.client_count DESC), '[]'::json)
  FROM (
    SELECT
      top_domena AS world,
      COUNT(*)                                                                          AS client_count,
      COALESCE(SUM(ltv), 0)                                                            AS total_ltv,
      COALESCE(AVG(ltv), 0)                                                            AS avg_ltv,
      COUNT(*) FILTER (WHERE orders_count > 1)                                         AS repeat_clients,
      ROUND(COUNT(*) FILTER (WHERE orders_count > 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS repeat_rate,
      COUNT(*) FILTER (WHERE legacy_segment IN ('Diamond','Platinum'))                 AS vip_count,
      COUNT(*) FILTER (WHERE risk_level = 'Lost')                                      AS lost_count,
      COALESCE(AVG(orders_count), 0)                                                   AS avg_orders
    FROM clients_360
    WHERE top_domena IS NOT NULL AND top_domena != ''
      AND last_order::date BETWEEN p_from AND p_to
    GROUP BY top_domena
  ) t
$$;


-- Lead distribution filtered
CREATE OR REPLACE FUNCTION get_lead_distribution_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.avg_lead_score DESC), '[]'::json)
  FROM (
    SELECT
      lead_temperature,
      COUNT(*)                                      AS client_count,
      COALESCE(SUM(ltv), 0)                        AS total_ltv,
      COALESCE(AVG(ltv), 0)                        AS avg_ltv,
      COALESCE(AVG(purchase_probability_30d), 0)   AS avg_probability,
      COALESCE(AVG(lead_score), 0)                 AS avg_lead_score,
      COALESCE(SUM(predicted_ltv_12m), 0)          AS predicted_revenue
    FROM clients_360
    WHERE lead_temperature IS NOT NULL
      AND last_order::date BETWEEN p_from AND p_to
    GROUP BY lead_temperature
  ) t
$$;


-- Gift distribution filtered
CREATE OR REPLACE FUNCTION get_gift_distribution_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.avg_gift_score DESC), '[]'::json)
  FROM (
    SELECT
      gift_label,
      COUNT(*)                        AS client_count,
      COALESCE(SUM(ltv), 0)          AS total_ltv,
      COALESCE(AVG(ltv), 0)          AS avg_ltv,
      COALESCE(AVG(orders_count), 0) AS avg_orders,
      COALESCE(AVG(gift_score), 0)   AS avg_gift_score
    FROM clients_360
    WHERE gift_label IS NOT NULL
      AND last_order::date BETWEEN p_from AND p_to
    GROUP BY gift_label
  ) t
$$;


-- Opportunity queue filtered
CREATE OR REPLACE FUNCTION get_opportunities_for_range(p_from date, p_to date)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::json)
  FROM (
    SELECT 'vip_reactivation'::text AS opportunity_type,
      'VIP do reanimacji'::text AS label,
      'Diamond/Platinum w statusie Utraceni lub Wysokie ryzyko'::text AS description,
      COUNT(*) AS client_count, COALESCE(SUM(ltv), 0) AS revenue_potential,
      COALESCE(AVG(ltv), 0) AS avg_ltv,
      COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int AS avg_days_inactive,
      'critical'::text AS urgency, 1 AS sort_order
    FROM clients_360
    WHERE legacy_segment IN ('Diamond','Platinum') AND risk_level IN ('Lost','HighRisk')
      AND last_order::date BETWEEN p_from AND p_to

    UNION ALL

    SELECT 'second_order', 'Konwersja na 2. zamówienie',
      'Klienci po 1. zakupie w oknie 30-90 dni', COUNT(*), COALESCE(SUM(ltv), 0),
      COALESCE(AVG(ltv), 0),
      COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int,
      'high', 2
    FROM clients_360
    WHERE orders_count = 1
      AND last_order::date BETWEEN p_from AND p_to
      AND last_order <= NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT 'falling_frequency', 'Spadająca częstotliwość',
      'Platinum/Gold z rosnącym ryzykiem', COUNT(*), COALESCE(SUM(ltv), 0),
      COALESCE(AVG(ltv), 0),
      COALESCE(AVG(EXTRACT(DAY FROM NOW() - last_order)), 0)::int,
      'high', 3
    FROM clients_360
    WHERE legacy_segment IN ('Platinum','Gold') AND risk_level = 'Risk'
      AND last_order::date BETWEEN p_from AND p_to
  ) t
$$;

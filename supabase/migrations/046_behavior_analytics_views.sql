-- ─── Migration 046: Behavioral Analytics Materialized Views ──────────────────
-- Tworzy 5 widoków zmaterializowanych dla analityki behawioralnej.
-- crm_behavior_segments istniał jako zwykły VIEW (migr.033) — dropujemy go.

DROP VIEW              IF EXISTS crm_behavior_segments CASCADE;
DROP MATERIALIZED VIEW IF EXISTS crm_behavior_segments;
DROP MATERIALIZED VIEW IF EXISTS crm_behavior_seasons;
DROP MATERIALIZED VIEW IF EXISTS crm_behavior_promos;
DROP MATERIALIZED VIEW IF EXISTS crm_behavior_product_groups;
DROP MATERIALIZED VIEW IF EXISTS crm_behavior_tags;

-- ── 1. Segmentacja: metryki per (segment × risk × domena) ────────────────────
CREATE MATERIALIZED VIEW crm_behavior_segments AS
SELECT
  c.legacy_segment,
  c.risk_level,
  c.top_domena,
  COUNT(*)                                                    AS klientow,
  ROUND(AVG(c.ltv)::numeric, 2)                               AS avg_ltv,
  ROUND(SUM(c.ltv)::numeric, 2)                               AS sum_ltv,
  ROUND(AVG(c.orders_count)::numeric, 2)                      AS avg_orders,
  COUNT(*) FILTER (WHERE t.total_events > 0)                  AS z_zakupami,
  COUNT(*) FILTER (WHERE t.promo_count > 0)                   AS promo_buyers,
  COUNT(*) FILTER (WHERE t.free_shipping_orders > 0)          AS free_shipping_buyers,
  ROUND(AVG(t.new_products_ratio)::numeric, 2)                AS avg_new_products_ratio,
  ROUND(AVG(t.evergreen_ratio)::numeric, 2)                   AS avg_evergreen_ratio,
  ROUND(AVG(t.free_shipping_orders)::numeric, 2)              AS avg_free_shipping,
  ROUND(AVG(t.total_events)::numeric, 2)                      AS avg_events
FROM clients_360 c
LEFT JOIN client_taxonomy_summary t ON t.client_id = c.client_id
WHERE c.legacy_segment IS NOT NULL
GROUP BY c.legacy_segment, c.risk_level, c.top_domena;

CREATE UNIQUE INDEX idx_crm_beh_seg
  ON crm_behavior_segments (legacy_segment, risk_level, COALESCE(top_domena, ''));

-- ── 2. Sezonowość: klienci i zakupy per (segment × risk × domena × sezon) ────
CREATE MATERIALIZED VIEW crm_behavior_seasons AS
SELECT
  c.legacy_segment,
  c.risk_level,
  c.top_domena,
  s.season,
  COUNT(DISTINCT c.client_id)  AS klientow,
  SUM(s.cnt)                   AS zakupow
FROM clients_360 c
JOIN client_taxonomy_summary t ON t.client_id = c.client_id
JOIN LATERAL (
  SELECT key AS season, value::int AS cnt
  FROM jsonb_each_text(t.seasons_counts)
  WHERE value::int > 0
) s ON true
WHERE c.legacy_segment IS NOT NULL
  AND t.seasons_counts IS NOT NULL
  AND t.seasons_counts != '{}'::jsonb
GROUP BY c.legacy_segment, c.risk_level, c.top_domena, s.season;

CREATE INDEX idx_crm_beh_seasons
  ON crm_behavior_seasons (legacy_segment, season);

-- ── 3. Promocje: klienci per (segment × promo_name) ─────────────────────────
CREATE MATERIALIZED VIEW crm_behavior_promos AS
SELECT
  c.legacy_segment,
  c.risk_level,
  c.top_domena,
  ph->>'promo_name'                       AS promo_name,
  ph->>'signal'                           AS signal,   -- pole to 'signal', nie 'best_signal'
  (ph->>'free_shipping')::boolean         AS free_shipping,
  ph->>'promo_code_used'                  AS promo_code_used,
  COUNT(DISTINCT c.client_id)             AS klientow,
  SUM((ph->>'orders_count')::int)         AS total_orders
FROM clients_360 c
JOIN client_taxonomy_summary t  ON t.client_id = c.client_id
JOIN LATERAL jsonb_array_elements(t.promo_history) ph ON true
WHERE c.legacy_segment IS NOT NULL
  AND jsonb_array_length(t.promo_history) > 0
GROUP BY
  c.legacy_segment, c.risk_level, c.top_domena,
  ph->>'promo_name', ph->>'signal',
  (ph->>'free_shipping')::boolean, ph->>'promo_code_used';

CREATE INDEX idx_crm_beh_promos
  ON crm_behavior_promos (legacy_segment, promo_name);

-- ── 4. Kategorie produktowe: klienci per (segment × product_group) ───────────
CREATE MATERIALIZED VIEW crm_behavior_product_groups AS
SELECT
  c.legacy_segment,
  c.risk_level,
  c.top_domena,
  pg.product_group,
  COUNT(DISTINCT c.client_id)  AS klientow,
  SUM(pg.cnt)                  AS zakupow
FROM clients_360 c
JOIN client_taxonomy_summary t ON t.client_id = c.client_id
JOIN LATERAL (
  SELECT key AS product_group, value::int AS cnt
  FROM jsonb_each_text(t.product_groups_counts)
  WHERE value::int > 0
) pg ON true
WHERE c.legacy_segment IS NOT NULL
  AND t.product_groups_counts IS NOT NULL
  AND t.product_groups_counts != '{}'::jsonb
GROUP BY c.legacy_segment, c.risk_level, c.top_domena, pg.product_group;

CREATE INDEX idx_crm_beh_pg
  ON crm_behavior_product_groups (legacy_segment, product_group);

-- ── 5. Tagi per (segment × risk × tag_type) — dla zakładki DNA ───────────────
CREATE MATERIALIZED VIEW crm_behavior_tags AS
SELECT c.legacy_segment, c.risk_level, 'granularne'::text AS tag_type,
       tg.tag, COUNT(DISTINCT c.client_id) AS klientow
FROM clients_360 c
JOIN client_taxonomy_summary t ON t.client_id = c.client_id
JOIN LATERAL (
  SELECT key AS tag FROM jsonb_each_text(t.tags_granularne_counts) WHERE value::int > 0
) tg ON true
WHERE c.legacy_segment IS NOT NULL
GROUP BY c.legacy_segment, c.risk_level, tg.tag

UNION ALL

SELECT c.legacy_segment, c.risk_level, 'domenowe'::text,
       td.tag, COUNT(DISTINCT c.client_id)
FROM clients_360 c
JOIN client_taxonomy_summary t ON t.client_id = c.client_id
JOIN LATERAL (
  SELECT key AS tag FROM jsonb_each_text(t.tags_domenowe_counts) WHERE value::int > 0
) td ON true
WHERE c.legacy_segment IS NOT NULL
GROUP BY c.legacy_segment, c.risk_level, td.tag

UNION ALL

SELECT c.legacy_segment, c.risk_level, 'okazje'::text,
       ok.tag, COUNT(DISTINCT c.client_id)
FROM clients_360 c
JOIN client_taxonomy_summary t ON t.client_id = c.client_id
JOIN LATERAL (
  SELECT key AS tag FROM jsonb_each_text(t.okazje_counts) WHERE value::int > 0
) ok ON true
WHERE c.legacy_segment IS NOT NULL
GROUP BY c.legacy_segment, c.risk_level, ok.tag;

CREATE INDEX idx_crm_beh_tags
  ON crm_behavior_tags (legacy_segment, risk_level, tag_type);

-- ── 6. Zaktualizuj refresh_crm_views() ──────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_crm_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_overview;
  REFRESH MATERIALIZED VIEW crm_segments;
  REFRESH MATERIALIZED VIEW crm_risk;
  REFRESH MATERIALIZED VIEW crm_worlds;
  REFRESH MATERIALIZED VIEW crm_occasions;
  REFRESH MATERIALIZED VIEW crm_cohorts;
  REFRESH MATERIALIZED VIEW crm_segment_worlds;
  REFRESH MATERIALIZED VIEW crm_tag_stats;
  REFRESH MATERIALIZED VIEW crm_behavior_segments;
  REFRESH MATERIALIZED VIEW crm_behavior_seasons;
  REFRESH MATERIALIZED VIEW crm_behavior_promos;
  REFRESH MATERIALIZED VIEW crm_behavior_product_groups;
  REFRESH MATERIALIZED VIEW crm_behavior_tags;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Zmaterializowane widoki dla analityki CRM — skalowalne agregaty bez pełnego skanu tabel

-- Widok 1: ogólny przegląd (jeden wiersz)
CREATE MATERIALIZED VIEW crm_overview AS
SELECT
  COUNT(*) as total_clients,
  SUM(ltv) as total_ltv,
  AVG(ltv) as avg_ltv,
  COUNT(*) FILTER (WHERE winback_priority ILIKE '%VIP%') as vip_count
FROM clients_360;

CREATE UNIQUE INDEX ON crm_overview ((true));

-- Widok 2: podział na segmenty
CREATE MATERIALIZED VIEW crm_segments AS
SELECT legacy_segment, COUNT(*) as count, SUM(ltv) as sum_ltv, AVG(ltv) as avg_ltv
FROM clients_360
GROUP BY legacy_segment;

CREATE UNIQUE INDEX ON crm_segments (legacy_segment);

-- Widok 3: podział na poziomy ryzyka
CREATE MATERIALIZED VIEW crm_risk AS
SELECT risk_level, COUNT(*) as count
FROM clients_360
GROUP BY risk_level;

CREATE UNIQUE INDEX ON crm_risk (risk_level);

-- Widok 4: ulubione światy
CREATE MATERIALIZED VIEW crm_worlds AS
SELECT ulubiony_swiat, COUNT(*) as count
FROM clients_360
WHERE ulubiony_swiat IS NOT NULL
GROUP BY ulubiony_swiat
ORDER BY count DESC;

CREATE UNIQUE INDEX ON crm_worlds (ulubiony_swiat);

-- Widok 5: sezony z client_product_events
CREATE MATERIALIZED VIEW crm_occasions AS
SELECT season, COUNT(*) as event_count, COUNT(DISTINCT client_id) as client_count
FROM client_product_events
WHERE season IS NOT NULL
GROUP BY season
ORDER BY client_count DESC;

CREATE UNIQUE INDEX ON crm_occasions (season);

-- Widok 6: zachowania per segment (behavior page)
CREATE MATERIALIZED VIEW crm_behavior_segments AS
SELECT
  legacy_segment,
  COUNT(*) as count,
  AVG(purchase_frequency_yearly) as avg_frequency,
  COUNT(*) FILTER (WHERE orders_count >= 2) as repeat_count
FROM clients_360
GROUP BY legacy_segment;

CREATE UNIQUE INDEX ON crm_behavior_segments (legacy_segment);

-- Widok 7: kohorty miesięczne per segment (cohorts page)
CREATE MATERIALIZED VIEW crm_cohorts AS
SELECT
  to_char(first_order, 'YYYY-MM') as cohort,
  legacy_segment,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE orders_count >= 2) as repeat_count,
  AVG(
    CASE WHEN orders_count >= 2 AND last_order IS NOT NULL
      THEN EXTRACT(EPOCH FROM (last_order - first_order)) / (86400.0 * GREATEST(orders_count - 1, 1))
      ELSE NULL
    END
  ) as avg_days_to_second
FROM clients_360
WHERE first_order IS NOT NULL
GROUP BY to_char(first_order, 'YYYY-MM'), legacy_segment;

CREATE INDEX ON crm_cohorts (cohort);
CREATE INDEX ON crm_cohorts (legacy_segment);

-- Widok 8: heatmapa segment × świat (worlds page)
CREATE MATERIALIZED VIEW crm_segment_worlds AS
SELECT legacy_segment, ulubiony_swiat, COUNT(*) as count
FROM clients_360
WHERE ulubiony_swiat IS NOT NULL
GROUP BY legacy_segment, ulubiony_swiat;

CREATE INDEX ON crm_segment_worlds (legacy_segment);
CREATE UNIQUE INDEX ON crm_segment_worlds (legacy_segment, ulubiony_swiat);

-- Funkcja do odświeżania wszystkich widoków po ETL
CREATE OR REPLACE FUNCTION refresh_crm_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_risk;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_worlds;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_occasions;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_behavior_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohorts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segment_worlds;
END;
$$ LANGUAGE plpgsql;

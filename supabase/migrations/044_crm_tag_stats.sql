-- Migracja 044: Materialized view crm_tag_stats
-- Prekomputuje liczebność tagów ze wszystkich rekordów client_taxonomy_summary.
-- Zastępuje pobieranie 150k rekordów w worlds/page.tsx jednym małym zapytaniem.

CREATE MATERIALIZED VIEW crm_tag_stats AS
SELECT
  tag,
  'granularne' AS tag_type,
  COUNT(*) AS client_count
FROM client_taxonomy_summary, unnest(top_tags_granularne) AS tag
GROUP BY tag

UNION ALL

SELECT
  tag,
  'domenowe' AS tag_type,
  COUNT(*) AS client_count
FROM client_taxonomy_summary, unnest(top_tags_domenowe) AS tag
GROUP BY tag

UNION ALL

SELECT
  tag,
  'filary' AS tag_type,
  COUNT(*) AS client_count
FROM client_taxonomy_summary, unnest(top_filary_marki) AS tag
GROUP BY tag

UNION ALL

SELECT
  tag,
  'okazje' AS tag_type,
  COUNT(*) AS client_count
FROM client_taxonomy_summary, unnest(top_okazje) AS tag
GROUP BY tag;

CREATE INDEX idx_crm_tag_stats_type ON crm_tag_stats(tag_type);

-- Dodaj crm_tag_stats do refresh_crm_views()
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

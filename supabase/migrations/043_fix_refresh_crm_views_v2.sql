-- Migracja 043: Upewnia się że refresh_crm_views() nie zawiera
-- crm_behavior_segments (usunięty w 033 jako MATERIALIZED VIEW).
-- Bezpieczna do re-aplikacji (CREATE OR REPLACE).

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migracja 033 zastąpiła crm_behavior_segments materialized view zwykłym VIEW.
-- Aktualizujemy refresh_crm_views() żeby nie próbować odświeżać już nieistniejącego
-- materialized view (co powodowało błąd przy wywołaniu endpointu /api/crm/refresh-views).

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

-- Migracja 056: Indywidualne funkcje refresh dla każdego materialized view.
-- Pozwalają na refresh pojedynczych widoków omijając timeout refresh_crm_views().
-- Każda funkcja jest SECURITY DEFINER z SET statement_timeout = '0'.

CREATE OR REPLACE FUNCTION refresh_view_promo_share()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_share;
  RETURN 'OK: crm_promo_share';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_dashboard_kpis()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_dashboard_kpis;
  RETURN 'OK: crm_dashboard_kpis';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_product_performance()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_product_performance;
  RETURN 'OK: crm_product_performance';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_lifecycle_funnel()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_segments;
  RETURN 'OK: crm_segments';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_time_to_second_order()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_time_to_second_order;
  RETURN 'OK: crm_time_to_second_order';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_cohort_retention()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cohort_retention;
  RETURN 'OK: crm_cohort_retention';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_promo_scorecard()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_promo_scorecard;
  RETURN 'OK: crm_promo_scorecard';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_opportunity_queue()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_opportunity_queue;
  RETURN 'OK: crm_opportunity_queue';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_revenue_monthly()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_revenue_monthly;
  RETURN 'OK: crm_revenue_monthly';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_repeat_ladder()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_repeat_ladder;
  RETURN 'OK: crm_repeat_ladder';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_season_performance()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_season_performance;
  RETURN 'OK: crm_season_performance';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_cross_sell()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_cross_sell;
  RETURN 'OK: crm_cross_sell';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_overview()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_overview;
  RETURN 'OK: crm_overview';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_risk()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY crm_risk;
  RETURN 'OK: crm_risk';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

-- Komentarz: Użycie — wywołaj każdą funkcję osobno przez RPC:
-- SELECT refresh_view_promo_share();
-- SELECT refresh_view_dashboard_kpis();
-- itd.

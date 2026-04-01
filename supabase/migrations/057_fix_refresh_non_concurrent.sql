-- Migracja 057: Naprawia refresh functions dla widoków bez unikalnego indeksu.
-- Używa zwykłego REFRESH (bez CONCURRENTLY) — blokuje widok na czas refresh,
-- ale to jednorazowy fix i jest akceptowalne.

CREATE OR REPLACE FUNCTION refresh_view_promo_share()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_promo_share;
  RETURN 'OK: crm_promo_share';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_dashboard_kpis()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_dashboard_kpis;
  RETURN 'OK: crm_dashboard_kpis';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_revenue_monthly()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_revenue_monthly;
  RETURN 'OK: crm_revenue_monthly';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_overview()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_overview;
  RETURN 'OK: crm_overview';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_product_performance()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_product_performance;
  RETURN 'OK: crm_product_performance';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_time_to_second_order()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_time_to_second_order;
  RETURN 'OK: crm_time_to_second_order';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_cohort_retention()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_cohort_retention;
  RETURN 'OK: crm_cohort_retention';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_promo_scorecard()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_promo_scorecard;
  RETURN 'OK: crm_promo_scorecard';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_opportunity_queue()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_opportunity_queue;
  RETURN 'OK: crm_opportunity_queue';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_repeat_ladder()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_repeat_ladder;
  RETURN 'OK: crm_repeat_ladder';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_season_performance()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_season_performance;
  RETURN 'OK: crm_season_performance';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_cross_sell()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_cross_sell;
  RETURN 'OK: crm_cross_sell';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

CREATE OR REPLACE FUNCTION refresh_view_promo_dependency()
RETURNS text AS $$
BEGIN
  REFRESH MATERIALIZED VIEW crm_promo_dependency;
  RETURN 'OK: crm_promo_dependency';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET statement_timeout = '0';

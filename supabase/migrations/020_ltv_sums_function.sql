CREATE OR REPLACE FUNCTION get_ltv_sums()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'ltv_360', (SELECT COALESCE(SUM(ltv), 0) FROM clients_360),
    'ltv_events', (SELECT COALESCE(SUM(line_total), 0) FROM client_product_events)
  );
$$;

CREATE OR REPLACE FUNCTION recalculate_all_ltv()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE clients_360 c
  SET ltv = sub.ltv,
      updated_at = NOW()
  FROM (
    SELECT client_id, COALESCE(ROUND(SUM(line_total)::numeric, 2), 0) as ltv
    FROM client_product_events
    GROUP BY client_id
  ) sub
  WHERE c.client_id = sub.client_id;

  SELECT json_build_object(
    'updated', (SELECT COUNT(*) FROM clients_360),
    'total_ltv', (SELECT ROUND(SUM(ltv)::numeric, 2) FROM clients_360)
  );
$$;

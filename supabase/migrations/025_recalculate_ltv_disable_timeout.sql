CREATE OR REPLACE FUNCTION recalculate_all_ltv()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Wyłącz statement_timeout dla tej sesji (SECURITY DEFINER uruchamia jako owner)
  PERFORM set_config('statement_timeout', '0', false);

  UPDATE clients_360 c
  SET ltv = sub.ltv,
      updated_at = NOW()
  FROM (
    SELECT client_id, COALESCE(ROUND(SUM(line_total)::numeric, 2), 0) AS ltv
    FROM client_product_events
    GROUP BY client_id
  ) sub
  WHERE c.client_id = sub.client_id;

  RETURN (
    SELECT json_build_object(
      'updated', (SELECT COUNT(*) FROM clients_360),
      'total_ltv', (SELECT ROUND(SUM(ltv)::numeric, 2) FROM clients_360)
    )
  );
END;
$$;

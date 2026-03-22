CREATE OR REPLACE FUNCTION recalculate_all_ltv()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE clients_360 c
  SET ltv = sub.ltv,
      updated_at = NOW()
  FROM (
    SELECT client_id,
      ROUND(SUM(order_sum)::numeric, 2) AS ltv
    FROM (
      SELECT DISTINCT client_id, order_id, order_sum
      FROM client_product_events
      WHERE order_id IS NOT NULL AND order_sum IS NOT NULL
    ) unique_orders
    GROUP BY client_id
  ) sub
  WHERE c.client_id = sub.client_id;

  SELECT json_build_object(
    'updated', (SELECT COUNT(*) FROM clients_360),
    'total_ltv', (SELECT ROUND(SUM(ltv)::numeric, 2) FROM clients_360)
  );
$$;

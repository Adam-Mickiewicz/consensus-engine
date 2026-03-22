-- Jednorazowe przeliczenie LTV bezpośrednio przez psql (bez limitu timeout API)
SET statement_timeout = 0;

UPDATE clients_360 c
SET ltv = sub.ltv,
    updated_at = NOW()
FROM (
  SELECT client_id, COALESCE(ROUND(SUM(line_total)::numeric, 2), 0) AS ltv
  FROM client_product_events
  GROUP BY client_id
) sub
WHERE c.client_id = sub.client_id;

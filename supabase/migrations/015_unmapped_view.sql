CREATE OR REPLACE VIEW unmapped_products AS
SELECT
  product_name,
  COUNT(*) AS purchase_count
FROM client_product_events
WHERE ean IS NULL
  AND product_name IS NOT NULL
GROUP BY product_name
ORDER BY purchase_count DESC;

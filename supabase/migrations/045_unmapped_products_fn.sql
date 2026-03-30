-- Funkcja zwracająca produkty bez mapowania EAN (fallback name-matching)
CREATE OR REPLACE FUNCTION get_unmapped_products()
RETURNS TABLE(
  product_name  TEXT,
  klientow      BIGINT,
  zakupow       BIGINT,
  wartosc       NUMERIC,
  matched_name  TEXT,
  matched_ean   BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cpe.product_name::TEXT,
    COUNT(DISTINCT cpe.client_id)::BIGINT          AS klientow,
    COUNT(*)::BIGINT                               AS zakupow,
    ROUND(SUM(cpe.line_total)::numeric, 2)         AS wartosc,
    (SELECT p.name
     FROM products p
     WHERE LOWER(p.name) = LOWER(cpe.product_name)
        OR LOWER(cpe.product_name) LIKE '%' || LOWER(p.name) || '%'
     LIMIT 1)::TEXT                                AS matched_name,
    (SELECT p.ean
     FROM products p
     WHERE LOWER(p.name) = LOWER(cpe.product_name)
        OR LOWER(cpe.product_name) LIKE '%' || LOWER(p.name) || '%'
     LIMIT 1)::BIGINT                              AS matched_ean
  FROM client_product_events cpe
  LEFT JOIN products p ON p.ean = cpe.ean
  WHERE p.ean IS NULL
    AND cpe.product_name IS NOT NULL
    AND cpe.product_name != ''
  GROUP BY cpe.product_name
  ORDER BY COUNT(DISTINCT cpe.client_id) DESC
$$;

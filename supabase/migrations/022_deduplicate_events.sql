-- Zwiększ timeout dla tej operacji (domyślny jest za krótki dla 422K wierszy)
SET statement_timeout = '300s';

-- Usuń duplikaty zachowując najstarszy rekord (min id) per klucz biznesowy.
-- Używamy ROW_NUMBER() + DELETE...USING zamiast NOT IN — wydajniejsze na dużych tabelach.
WITH dupes AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(order_id, client_id || '_' || COALESCE(ean::text,'null') || '_' || order_date::date::text || '_' || COALESCE(product_name,'')),
        ean,
        product_name
      ORDER BY id
    ) AS rn
  FROM client_product_events
)
DELETE FROM client_product_events
USING dupes
WHERE client_product_events.id = dupes.id AND dupes.rn > 1;

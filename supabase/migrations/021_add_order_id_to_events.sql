-- Dodaj kolumnę order_id
ALTER TABLE client_product_events ADD COLUMN IF NOT EXISTS order_id text;

-- Dodaj unikalny constraint żeby uniemożliwić duplikaty
ALTER TABLE client_product_events
DROP CONSTRAINT IF EXISTS unique_order_product;

ALTER TABLE client_product_events
ADD CONSTRAINT unique_order_product
UNIQUE (order_id, ean, product_name);

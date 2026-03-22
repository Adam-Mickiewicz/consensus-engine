ALTER TABLE client_product_events
ADD COLUMN IF NOT EXISTS order_sum numeric(12,2);

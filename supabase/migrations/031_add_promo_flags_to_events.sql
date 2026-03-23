-- Dodaj flagi promocyjne i nowości produktu do client_product_events
ALTER TABLE client_product_events
  ADD COLUMN IF NOT EXISTS is_promo       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new_product boolean DEFAULT false;

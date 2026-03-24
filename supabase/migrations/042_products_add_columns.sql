-- Add new taxonomy columns to products table
-- variant, collection, product_group, segment_prezentowy already exist in 005_products_taxonomy.sql
-- Adding launch_date (previously missing)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS launch_date date;

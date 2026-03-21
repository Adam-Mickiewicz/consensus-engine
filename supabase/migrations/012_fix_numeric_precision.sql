ALTER TABLE clients_360 ALTER COLUMN ltv TYPE numeric(12,2);
ALTER TABLE clients_360 ALTER COLUMN purchase_frequency_yearly TYPE numeric(8,2);
ALTER TABLE client_product_events ALTER COLUMN line_total TYPE numeric(12,2);
ALTER TABLE products ALTER COLUMN price_avg TYPE numeric(12,2);

ALTER TABLE store_orders
ADD COLUMN IF NOT EXISTS shipping_latitude numeric(10, 7);

ALTER TABLE store_orders
ADD COLUMN IF NOT EXISTS shipping_longitude numeric(10, 7);

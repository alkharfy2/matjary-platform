-- migrations/add_fake_order_blocker.sql
-- P1: Fake Order Blocker — platform_customers + store_customer_blocks

CREATE TABLE IF NOT EXISTS platform_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  rejected_orders INTEGER NOT NULL DEFAULT 0,
  trust_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_order_at TIMESTAMPTZ
);

CREATE INDEX idx_platform_customers_phone ON platform_customers(phone);
CREATE INDEX idx_platform_customers_trust ON platform_customers(trust_score);

CREATE TABLE IF NOT EXISTS store_customer_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, customer_phone)
);

CREATE INDEX idx_customer_blocks_store ON store_customer_blocks(store_id);
CREATE INDEX idx_customer_blocks_phone ON store_customer_blocks(customer_phone);

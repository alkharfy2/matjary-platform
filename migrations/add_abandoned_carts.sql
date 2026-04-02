-- migrations/add_abandoned_carts.sql
-- P1: Abandoned Cart Recovery

CREATE TABLE IF NOT EXISTS store_abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  recovery_status TEXT NOT NULL DEFAULT 'pending',
  recovery_sent_at TIMESTAMPTZ,
  recovered_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_abandoned_carts_store ON store_abandoned_carts(store_id);
CREATE INDEX idx_abandoned_carts_status ON store_abandoned_carts(recovery_status);
CREATE INDEX idx_abandoned_carts_phone ON store_abandoned_carts(customer_phone);

-- ============================================================
-- Migration: Wallet & Order Fee System
-- Date: 2026-03-06
-- ============================================================

-- 1. إضافة رصيد المحفظة للتاجر
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 2. إضافة علامة الخصم على الطلبات (منع الخصم المكرر)
ALTER TABLE store_orders
  ADD COLUMN IF NOT EXISTS is_fee_deducted BOOLEAN NOT NULL DEFAULT false;

-- 3. جدول معاملات المحفظة
CREATE TABLE IF NOT EXISTS merchant_wallet_transactions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID          NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id      UUID          REFERENCES stores(id) ON DELETE SET NULL,
  order_id      UUID          REFERENCES store_orders(id) ON DELETE SET NULL,
  type          TEXT          NOT NULL,          -- 'top_up' | 'order_fee'
  amount        DECIMAL(12,2) NOT NULL,          -- موجب للشحن، سالب للخصم
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after  DECIMAL(12,2) NOT NULL,
  reference     TEXT,                            -- kashier transactionId أو orderNumber
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_merchant ON merchant_wallet_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_store    ON merchant_wallet_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order    ON merchant_wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created  ON merchant_wallet_transactions(created_at);

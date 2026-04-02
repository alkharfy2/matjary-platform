-- P2: AI Features Migration
-- جدول لتتبع استخدام AI لكل متجر
CREATE TABLE IF NOT EXISTS store_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,  -- 'store_builder' | 'product_description' | 'ad_copy' | 'insights'
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_store_date ON store_ai_usage(store_id, created_at);

-- إضافة عمود ai_generated للمتاجر
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;

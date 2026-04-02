-- P4-B Migration: Enhanced Reviews + Order Tracking Support
-- Run with: node scripts/run-migration.mjs migrations/p4b_reviews_tracking.sql

-- 1. Add new columns to store_reviews
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS customer_account_id UUID;
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS merchant_reply TEXT;
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS merchant_reply_at TIMESTAMPTZ;
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0 NOT NULL;

-- 2. Index for verified purchase reviews
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON store_reviews(product_id) WHERE is_verified_purchase = true;

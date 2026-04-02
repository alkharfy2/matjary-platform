-- migrations/p4b_review_requests.sql
-- P4-B: Review Requests Table

-- جدول طلبات التقييم التلقائية
CREATE TABLE IF NOT EXISTS store_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  review_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT store_review_requests_order_unique UNIQUE(order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_requests_store ON store_review_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON store_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON store_review_requests(review_token);

-- Enable RLS
ALTER TABLE store_review_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Merchants can manage their store's review requests
CREATE POLICY "Merchants manage review requests"
  ON store_review_requests
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE merchant_id IN (
        SELECT id FROM merchants WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- Service role policy for API operations
CREATE POLICY "Service role full access review requests"
  ON store_review_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

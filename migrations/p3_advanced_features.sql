-- =============================================
-- P3: Advanced Features Migration
-- =============================================

-- 1. Advanced Coupons — توسيع الجدول الحالي
ALTER TABLE store_coupons
  ADD COLUMN IF NOT EXISTS first_order_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applicable_product_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_category_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_per_customer INTEGER;

-- 2. Store Blog Posts
CREATE TABLE IF NOT EXISTS store_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  excerpt TEXT,
  author TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_store ON store_blog_posts(store_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON store_blog_posts(is_published, published_at);

-- 3. Loyalty Points
CREATE TABLE IF NOT EXISTS store_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'adjusted')),
  order_id UUID REFERENCES store_orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_store ON store_loyalty_points(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON store_loyalty_points(store_id, customer_phone);

-- 4. Affiliates
CREATE TABLE IF NOT EXISTS store_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  pending_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, code)
);
CREATE INDEX IF NOT EXISTS idx_affiliates_store ON store_affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON store_affiliates(store_id, code);

CREATE TABLE IF NOT EXISTS store_affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES store_affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  sale_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aff_sales_store ON store_affiliate_sales(store_id);
CREATE INDEX IF NOT EXISTS idx_aff_sales_affiliate ON store_affiliate_sales(affiliate_id);

-- 5. Supplier Products (Dropshipping)
CREATE TABLE IF NOT EXISTS store_supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES store_products(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  supplier_product_url TEXT,
  supplier_price DECIMAL(10,2) NOT NULL,
  retail_price DECIMAL(10,2) NOT NULL,
  auto_order BOOLEAN NOT NULL DEFAULT false,
  lead_time_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_products_store ON store_supplier_products(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON store_supplier_products(product_id);

-- 6. Shipping Company Accounts
CREATE TABLE IF NOT EXISTS store_shipping_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('bosta', 'aramex', 'jnt', 'mylerz')),
  api_key TEXT NOT NULL,
  api_secret TEXT,
  account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_shipping_accounts_store ON store_shipping_accounts(store_id);

-- 7. Product Translations (Multi-language)
ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';

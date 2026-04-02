-- ═══════════════════════════════════════════════════════════════
-- P4-A: Customer Accounts, OTPs, and Wishlists
-- ═══════════════════════════════════════════════════════════════

-- 1. Customer Accounts table
CREATE TABLE IF NOT EXISTS store_customer_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES store_customers(id),
  phone TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email TEXT,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  default_address JSONB,
  saved_addresses JSONB DEFAULT '[]'::jsonb,
  auth_provider TEXT NOT NULL DEFAULT 'phone',
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_account_store_phone
  ON store_customer_accounts(store_id, phone);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_email
  ON store_customer_accounts(store_id, email);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer
  ON store_customer_accounts(customer_id);

-- 2. Customer OTP table
CREATE TABLE IF NOT EXISTS store_customer_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_otps_lookup
  ON store_customer_otps(phone, store_id);

CREATE INDEX IF NOT EXISTS idx_customer_otps_expires
  ON store_customer_otps(expires_at);

-- 3. Wishlists table
CREATE TABLE IF NOT EXISTS store_wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_account_id UUID NOT NULL REFERENCES store_customer_accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL DEFAULT '',
  price_when_added DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wishlist_item
  ON store_wishlists(store_id, customer_account_id, product_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer
  ON store_wishlists(store_id, customer_account_id);

-- 4. Cleanup: auto-delete expired OTPs (optional cron or manual)
-- DELETE FROM store_customer_otps WHERE expires_at < NOW() - INTERVAL '1 hour';

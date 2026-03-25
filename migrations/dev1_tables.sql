-- ============================================================
-- Dev 1 — Infrastructure Tables Only
-- merchants + stores + platform_plans + platform_activity_log
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. MERCHANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS merchants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  display_name  TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. STORES
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      UUID NOT NULL UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  logo_url         TEXT,
  favicon_url      TEXT,
  theme            JSONB NOT NULL DEFAULT '{
    "primaryColor":   "#000000",
    "secondaryColor": "#ffffff",
    "accentColor":    "#3b82f6",
    "fontFamily":     "Cairo",
    "borderRadius":   "8px",
    "headerStyle":    "simple"
  }'::jsonb,
  settings         JSONB NOT NULL DEFAULT '{
    "currency":       "EGP",
    "language":       "ar",
    "direction":      "rtl",
    "showOutOfStock": false,
    "requirePhone":   true,
    "requireEmail":   false,
    "minOrderAmount": null,
    "maxOrderAmount": null
  }'::jsonb,
  contact_email    TEXT,
  contact_phone    TEXT,
  contact_whatsapp TEXT,
  address          TEXT,
  social_links     JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  plan             TEXT NOT NULL DEFAULT 'free',
  custom_domain    TEXT,
  meta_title       TEXT,
  meta_description TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_slug          ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_merchant      ON stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain);


-- ============================================================
-- 3. PLATFORM PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_plans (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  name_en              TEXT,
  price_monthly        DECIMAL(10,2) NOT NULL,
  price_yearly         DECIMAL(10,2),
  order_fee            DECIMAL(10,4),
  max_products         INTEGER,
  max_orders_per_month INTEGER,
  features             JSONB NOT NULL DEFAULT '[]',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order           INTEGER NOT NULL DEFAULT 0
);


-- ============================================================
-- 4. PLATFORM ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_store    ON platform_activity_log(store_id);
CREATE INDEX IF NOT EXISTS idx_activity_merchant ON platform_activity_log(merchant_id);
CREATE INDEX IF NOT EXISTS idx_activity_created  ON platform_activity_log(created_at);


-- ============================================================
-- SEED: DEFAULT PLANS
-- آمن للتشغيل أكثر من مرة
-- ============================================================
INSERT INTO platform_plans
  (id, name, name_en, price_monthly, price_yearly, order_fee, max_products, max_orders_per_month, features, is_active, sort_order)
VALUES
  (
    'free', 'مجاني', 'Free',
    0, 0, 0.05, 10, 50,
    '["متجر احترافي", "10 منتجات", "50 طلب/شهر", "دعم عبر البريد"]'::jsonb,
    TRUE, 1
  ),
  (
    'basic', 'أساسي', 'Basic',
    99, 950, 0.02, 100, 500,
    '["كل مميزات المجاني", "100 منتج", "500 طلب/شهر", "دومين مخصص", "دعم أولوية"]'::jsonb,
    TRUE, 2
  ),
  (
    'pro', 'احترافي', 'Pro',
    249, 2390, 0, NULL, NULL,
    '["كل مميزات الأساسي", "منتجات غير محدودة", "طلبات غير محدودة", "بدون عمولة", "دعم على مدار الساعة", "تقارير متقدمة"]'::jsonb,
    TRUE, 3
  )
ON CONFLICT (id) DO NOTHING;

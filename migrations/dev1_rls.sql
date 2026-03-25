-- ============================================================
-- Dev 1 — Row Level Security (RLS) Policies
-- merchants + stores + platform_plans + platform_activity_log
--
-- ⚠️  شغّل هذا الملف بعد dev1_tables.sql
--
-- ملاحظات:
-- • التطبيق يتصل عبر Drizzle (postgres role) → يتجاوز RLS تلقائياً
-- • الـ RLS يحمي من الوصول المباشر عبر Supabase REST API
--   (anon key / authenticated key / PostgREST)
-- • service_role يتجاوز RLS تلقائياً (مُستخدم في Storage)
-- ============================================================


-- ============================================================
-- 1. MERCHANTS — حسابات التجار
-- ============================================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- لا وصول عبر anon (لا حاجة — الـ Webhook يتصل عبر Drizzle)
-- authenticated: التاجر يرى بياناته فقط عبر clerk_user_id
CREATE POLICY "merchants_select_own"
  ON merchants FOR SELECT
  TO authenticated
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "merchants_update_own"
  ON merchants FOR UPDATE
  TO authenticated
  USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- INSERT و DELETE: فقط عبر service_role (Clerk Webhook)
-- لا حاجة لسياسة — ممنوع افتراضياً مع تفعيل RLS

-- anon: ممنوع تماماً (لا توجد سياسة = لا وصول)


-- ============================================================
-- 2. STORES — المتاجر
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- anon: يمكنه قراءة المتجر عبر slug (للـ storefront — resolve store)
CREATE POLICY "stores_select_public_active"
  ON stores FOR SELECT
  TO anon
  USING (is_active = true);

-- authenticated: التاجر يرى متجره فقط
CREATE POLICY "stores_select_own"
  ON stores FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- authenticated: التاجر يعدّل متجره فقط
CREATE POLICY "stores_update_own"
  ON stores FOR UPDATE
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- authenticated: التاجر ينشئ متجر واحد فقط (INSERT)
CREATE POLICY "stores_insert_own"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- DELETE: ممنوع من authenticated — فقط عبر service_role/postgres


-- ============================================================
-- 3. PLATFORM PLANS — خطط المنصة
-- ============================================================
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;

-- anon + authenticated: قراءة الخطط النشطة فقط (صفحة التسعير + Onboarding)
CREATE POLICY "plans_select_active_anon"
  ON platform_plans FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "plans_select_active_authenticated"
  ON platform_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- INSERT / UPDATE / DELETE: فقط عبر service_role/postgres (Super Admin APIs)
-- لا توجد سياسة = ممنوع افتراضياً


-- ============================================================
-- 4. PLATFORM ACTIVITY LOG — سجل النشاطات
-- ============================================================
ALTER TABLE platform_activity_log ENABLE ROW LEVEL SECURITY;

-- لا وصول عبر anon (سجل داخلي)

-- authenticated: التاجر يرى نشاطات متجره فقط
CREATE POLICY "activity_log_select_own"
  ON platform_activity_log FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- INSERT / UPDATE / DELETE: فقط عبر service_role/postgres
-- لا توجد سياسة = ممنوع افتراضياً

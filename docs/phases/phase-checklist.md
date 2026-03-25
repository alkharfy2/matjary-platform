# قائمة مهام المراحل - متجري

## المرحلة 1: البنية التحتية ✅

- [x] إنشاء مشروع Next.js 15
- [x] تثبيت كل الحزم
- [x] إعداد TypeScript (strict + noUncheckedIndexedAccess)
- [x] إعداد next.config.ts (Supabase images)
- [x] إنشاء .env.example
- [x] إنشاء drizzle.config.ts

## المرحلة 2: قاعدة البيانات ✅

- [x] إنشاء schema.ts (14 جدول)
- [x] إنشاء DB connection (src/db/index.ts)
- [x] إنشاء seed.ts (خطط المنصة)
- [x] تشغيل db:push و db:seed

## المرحلة 3: المصادقة والـ Middleware ✅

- [x] إنشاء middleware.ts (subdomain routing + Clerk)
- [x] إنشاء Root Layout (ClerkProvider + Cairo font + RTL)
- [x] إنشاء globals.css (Tailwind + theme variables)
- [x] إنشاء صفحات المصادقة (sign-in / sign-up)
- [x] إنشاء Clerk webhook handler
- [x] إنشاء tenant resolution (resolve-store, get-current-store, store-context)

## المرحلة 4: هيكل الصفحات ✅

- [x] (platform) — landing, features, pricing, onboarding
- [x] store/ — home, category, product, cart, checkout, order-success (middleware rewrite)
- [x] (dashboard) — overview, products, orders, categories, customers, coupons, shipping, pages, design, analytics, settings
- [x] (super-admin) — overview, stores, merchants, plans

## المرحلة 5: الأدوات المساعدة ✅

- [x] lib/utils.ts (cn, formatPrice, formatDate, etc.)
- [x] lib/api/response.ts (apiSuccess, apiError)
- [x] lib/api/auth.ts (getAuthenticatedMerchant, verifyStoreOwnership)
- [x] lib/supabase/storage.ts (uploadImage, deleteImage)

## المرحلة 6: التوثيق ✅

- [x] README.md
- [x] docs/SETUP.md
- [x] docs/CONTRIBUTING.md
- [x] docs/architecture/overview.md
- [x] docs/architecture/database-schema.md
- [x] docs/architecture/multi-tenancy.md
- [x] docs/guides/dev1-auth-middleware.md
- [x] docs/guides/dev2-dashboard.md
- [x] docs/guides/dev3-storefront.md
- [x] docs/guides/ai-coding-rules.md
- [x] docs/phases/phase-checklist.md

---

## المهام القادمة (لفريق التطوير)

### Dev 1 - المصادقة والـ API

- [ ] إنشاء API إنشاء متجر (POST /api/stores)
- [ ] ربط Onboarding بـ API
- [ ] تحسين Clerk webhook (error handling)
- [ ] دمج Kashier payment
- [ ] ربط Super Admin بيانات حقيقية
- [ ] إضافة rate limiting
- [ ] API إنشاء order (POST /api/checkout)

### Dev 2 - لوحة التحكم

- [ ] CRUD المنتجات مع رفع صور
- [ ] نظام المتغيرات (variants) في نموذج المنتج
- [ ] CRUD التصنيفات
- [ ] عرض وإدارة الطلبات
- [ ] CRUD الكوبونات
- [ ] CRUD مناطق الشحن
- [ ] CRUD الصفحات الثابتة
- [ ] تخصيص التصميم + رفع الشعار
- [ ] الإحصائيات والتقارير
- [ ] إعدادات المتجر

### Dev 3 - واجهة المتجر

- [ ] الصفحة الرئيسية (hero slides + منتجات)
- [ ] صفحة المنتج كاملة (gallery + variants + add to cart)
- [ ] صفحة التصنيف مع فلترة
- [ ] Zustand cart store
- [ ] صفحة السلة
- [ ] صفحة Checkout (شحن + كوبون + دفع)
- [ ] صفحة نجاح الطلب
- [ ] صفحات ثابتة (page/[slug])
- [ ] SEO (generateMetadata)
- [ ] Responsive design

### مهام مشتركة (Owner: Dev 1 يقود + الباقي يساعد)

- [ ] إعداد Supabase project ← **Dev 1** ينشئ المشروع ويشارك المفاتيح
- [ ] إعداد Clerk project ← **Dev 1** ينشئ التطبيق ويضبط الإعدادات
- [ ] تشغيل db:push على Supabase ← **Dev 1** ينفذ أول مرة
- [ ] إعداد DNS المحلي واختبار subdomains ← **كل مطور** على جهازه
- [ ] إعداد Vercel deployment ← **Dev 1** (بعد اكتمال MVP)
- [ ] إعداد wildcard subdomain على Vercel ← **Dev 1** (بعد اكتمال MVP)

### ملفات مُضافة في المراجعة

- [x] إضافة loading.tsx / error.tsx / not-found.tsx (dashboard + store + root)
- [x] إضافة صفحة store/page/[slug] skeleton
- [x] إضافة API Contracts doc (docs/guides/api-contracts.md)
- [x] إضافة Deployment guide (docs/guides/deployment.md)
- [x] إضافة Components convention (docs/guides/components-convention.md)
- [x] مطابقة database-schema.md مع الكود الفعلي
- [x] تصحيح مسارات (storefront) → store/ في كل التوثيق

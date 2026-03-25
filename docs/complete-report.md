# تقرير شامل — منصة متجري (Matjary Platform)

> **تاريخ التقرير**: 25 مارس 2026
> **نوع المشروع**: منصة SaaS متعددة المستأجرين (Multi-Tenant) لإنشاء المتاجر الإلكترونية
> **السوق المستهدف**: السوق العربي والمصري
> **الترخيص**: خاص — جميع الحقوق محفوظة

---

## الفهرس

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [التقنيات المستخدمة (Tech Stack)](#2-التقنيات-المستخدمة)
3. [البنية المعمارية (Architecture)](#3-البنية-المعمارية)
4. [نظام تعدد المستأجرين (Multi-Tenancy)](#4-نظام-تعدد-المستأجرين)
5. [بنية الروابط (URL Structure)](#5-بنية-الروابط)
6. [بنية المجلدات (Folder Structure)](#6-بنية-المجلدات)
7. [قاعدة البيانات (Database Schema)](#7-قاعدة-البيانات)
8. [عقود الـ API (API Contracts)](#8-عقود-الـ-api)
9. [نظام المصادقة والأمان (Auth & Security)](#9-نظام-المصادقة-والأمان)
10. [نظام الدفع — Kashier Integration](#10-نظام-الدفع)
11. [نظام الاشتراك وبوابة الدفع (Subscription & Payment Gate)](#11-نظام-الاشتراك)
12. [نظام المحفظة ورسوم الطلبات (Wallet & Order Fee)](#12-نظام-المحفظة)
13. [لوحة تحكم التاجر (Dashboard — Dev 2)](#13-لوحة-تحكم-التاجر)
14. [واجهة المتجر (Storefront — Dev 3)](#14-واجهة-المتجر)
15. [لوحة الإدارة العليا (Super Admin)](#15-لوحة-الإدارة-العليا)
16. [اتفاقيات المكونات (Components Convention)](#16-اتفاقيات-المكونات)
17. [قواعد الكود والتطوير](#17-قواعد-الكود-والتطوير)
18. [البيئة والإعداد (Setup)](#18-البيئة-والإعداد)
19. [النشر (Deployment)](#19-النشر)
20. [فريق العمل والمسؤوليات](#20-فريق-العمل)
21. [المراحل المنجزة والمتبقية (Phase Checklist)](#21-المراحل)
22. [المراجعة الأمنية الشاملة](#22-المراجعة-الأمنية)
23. [دليل الاختبار](#23-دليل-الاختبار)
24. [التنبيهات والمشاكل المعروفة](#24-التنبيهات-والمشاكل)
25. [مكتبة المكونات المشتركة (Shared Components Library)](#25-مكتبة-المكونات-المشتركة)
26. [مكونات واجهة المتجر الخاصة (Storefront Components)](#26-مكونات-واجهة-المتجر-الخاصة)
27. [صفحة المميزات (Features Page)](#27-صفحة-المميزات)
28. [أدوات المساعدة المتقدمة (Advanced Utilities)](#28-أدوات-المساعدة-المتقدمة)
29. [صفحات الأخطاء والتحميل (Error & Loading Pages)](#29-صفحات-الأخطاء-والتحميل)
30. [فهارس قاعدة البيانات (Database Indices)](#30-فهارس-قاعدة-البيانات)
31. [استعلامات البيانات (Query Functions)](#31-استعلامات-البيانات)
32. [نظام الثيمات والألوان (Theme & Color System)](#32-نظام-الثيمات-والألوان)
33. [نظام Slug للمنتجات والتصنيفات](#33-نظام-slug)
34. [نظام بناء الروابط (URL Utilities)](#34-نظام-بناء-الروابط)
35. [محرر بلوكات الصفحات (Page Blocks Editor)](#35-محرر-بلوكات-الصفحات)
36. [مكون إشعار الخطة الأكثر شعبية](#36-مكون-إشعار-الخطة-الأكثر-شعبية)
37. [صفحة الـ Fallback للمسارات](#37-صفحة-الـ-fallback-للمسارات)
38. [حالة تحميل صفحة المنتج](#38-حالة-تحميل-صفحة-المنتج)
39. [ملف categories.ts للداشبورد](#39-ملف-categories-للداشبورد)
40. [ملفات المشروع الجذرية (Root Config Files)](#40-ملفات-المشروع-الجذرية)
41. [ملفات Public (الأصول الثابتة)](#41-ملفات-public)
42. [ملفات الهجرة (Migrations)](#42-ملفات-الهجرة)
43. [ملفات التوثيق (Documentation)](#43-ملفات-التوثيق)

---

## 1. نظرة عامة على المشروع

**متجري (Matjary)** هي منصة SaaS متعددة المستأجرين لإنشاء المتاجر الإلكترونية، مبنية على Next.js 15 App Router. كل تاجر يحصل على subdomain فريد (مثل `ahmed.matjary.com`).

### الفكرة الأساسية

```
التاجر → يسجل حساب → ينشئ متجر → يحصل على subdomain
العميل → يزور ahmed.matjary.com → يتصفح المنتجات → يشتري
التاجر → يدير متجره من ahmed.matjary.com/dashboard
المنصة → تدير كل شيء من matjary.com/super-admin
```

### المميزات الرئيسية

- **متعدد المستأجرين**: كل تاجر على subdomain مستقل
- **لوحة تحكم كاملة**: إدارة المنتجات، الطلبات، العملاء، الكوبونات، الشحن، التصميم
- **واجهة متجر ديناميكية**: ثيم قابل للتخصيص لكل متجر
- **سلة تسوق**: Zustand مع localStorage
- **نظام دفع**: Kashier (بطاقات + فودافون كاش + فوري) + الدفع عند الاستلام (COD)
- **نظام اشتراكات**: خطط مدفوعة عبر Kashier
- **نظام محفظة**: شحن الرصيد + خصم رسوم الطلبات تلقائياً
- **لوحة إدارة عليا**: إدارة المتاجر والتجار والخطط

---

## 2. التقنيات المستخدمة

| العنصر | التقنية | الإصدار |
|--------|---------|---------|
| الإطار | Next.js (App Router) | 15.5.12 |
| واجهة المستخدم | React | 19.1.4 |
| اللغة | TypeScript | 5.x (strict mode) |
| قاعدة البيانات | PostgreSQL (Supabase) | — |
| ORM | Drizzle ORM | 0.45.1 |
| المصادقة | Clerk (Email + Google + Phone OTP) | 6.37.5 |
| الدفع | Kashier | — |
| التخزين | Supabase Storage (صور فقط) | 2.97.0 |
| التصميم | Tailwind CSS | 4.x |
| المكونات | shadcn/ui (Radix UI) | — |
| الأيقونات | Lucide React | 0.574.0 |
| حالة العميل | Zustand | 5.0.11 |
| التحقق | Zod | 4.3.6 |
| Webhooks | Svix | 1.85.0 |
| تطهير HTML | sanitize-html | 2.17.1 |
| معرفات فريدة | nanoid | 5.1.6 |
| CSS Utilities | clsx + tailwind-merge + CVA | — |
| النشر | Vercel (wildcard subdomains) | — |

### الحزم الرئيسية (package.json)

```json
{
  "next": "15.5.12",
  "react": "19.1.4",
  "drizzle-orm": "^0.45.1",
  "@clerk/nextjs": "^6.37.5",
  "@supabase/supabase-js": "^2.97.0",
  "zod": "^4.3.6",
  "zustand": "^5.0.11",
  "svix": "^1.85.0",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

### السكربتات

```json
{
  "dev": "cross-env NODE_OPTIONS=--max-http-header-size=32768 next dev",
  "build": "next build",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:seed": "npx tsx --env-file=.env.local src/db/seed.ts",
  "type-check": "tsc --noEmit"
}
```

---

## 3. البنية المعمارية

### الرسم التخطيطي العام

```
                    ┌──────────────────────────┐
                    │     matjary.com           │
                    │   (Platform Marketing)    │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │      middleware.ts        │
                    │  - Extract subdomain      │
                    │  - Set x-store-slug       │
                    │  - Clerk auth check       │
                    └──────────┬───────────────┘
                               │
              ┌───────────────┬┴────────────────┐
              │               │                  │
   No subdomain         Has subdomain      /super-admin
              │               │                  │
    ┌─────────▼──────┐ ┌─────▼───────┐ ┌───────▼────────┐
    │  (platform)    │ │  store/     │ │ (super-admin)  │
    │  Landing page  │ │ Store pages │ │ Admin panel    │
    │  Pricing       │ │ /product/*  │ │ /stores        │
    │  Features      │ │ /cart       │ │ /merchants     │
    │  Onboarding    │ │ /checkout   │ │ /plans         │
    └────────────────┘ │ /dashboard  │ └────────────────┘
                       └─────────────┘
```

### طبقات التطبيق

#### 1. طبقة التوجيه (Routing Layer)

**middleware.ts** — كل request يمر من هنا أولاً:
- يستخرج الـ subdomain من الـ hostname
- يضع `x-store-slug` في الـ headers
- يتحقق من مصادقة Clerk للمسارات المحمية
- يعمل rewrite شفاف من `ahmed.matjary.com/` إلى `/store/`

#### 2. طبقة العرض (Presentation Layer)

4 مجموعات مسارات (Route Groups):

| المجموعة | الغرض | الوصول |
|----------|-------|--------|
| `(platform)` | الموقع التسويقي | عام |
| `store/` | واجهة المتجر (rewrite via middleware) | عام (يحتاج subdomain) |
| `(dashboard)` | لوحة تحكم التاجر | مصادق + مالك المتجر |
| `(super-admin)` | إدارة المنصة | Super Admin فقط |

#### 3. طبقة البيانات (Data Layer)

```
Drizzle ORM ──→ PostgreSQL (Supabase)
                  │
                  ├── merchants (التجار)
                  ├── stores (المتاجر)
                  ├── store_products
                  ├── store_orders
                  ├── store_order_items
                  ├── store_categories
                  ├── store_customers
                  ├── store_shipping_zones
                  ├── store_coupons
                  ├── store_pages
                  ├── store_hero_slides
                  ├── store_reviews
                  ├── platform_plans
                  ├── platform_activity_log
                  └── merchant_wallet_transactions
```

#### 4. طبقة الخدمات الخارجية

```
Clerk ──────→ مصادقة المستخدمين (Email/Google/Phone)
                └── Webhook → إنشاء merchant عند التسجيل

Supabase ───→ Storage (رفع الصور فقط)
                └── Bucket: store-assets/{storeId}/

Kashier ────→ بوابة الدفع (بطاقات + فودافون كاش + فوري)
                ├── دفع الطلبات
                ├── دفع الاشتراكات
                └── شحن المحفظة
```

---

## 4. نظام تعدد المستأجرين

### كيف يعمل

**الخطوة 1**: Middleware يستخرج الـ Subdomain
```typescript
const hostname = request.headers.get('host') // "ahmed.matjary.com"
const subdomain = hostname.replace(`.${rootDomain}`, '') // "ahmed"
response.headers.set('x-store-slug', subdomain)
```

**الخطوة 2**: Layout يقرأ الـ Header
```typescript
export async function getCurrentStore() {
  const headers = await headers()
  const slug = headers.get('x-store-slug')
  return resolveStore(slug) // DB query
}
```

**الخطوة 3**: كل Component يستخدم store.id
```typescript
const store = await getCurrentStore()
const products = await db.select().from(storeProducts)
  .where(eq(storeProducts.storeId, store.id)) // ✅ ALWAYS filter by store_id
```

**الخطوة 4**: Client Components تستخدم Context
```typescript
const { id, name, theme } = useStore() // من StoreProvider
```

### قواعد أمان حاسمة

1. **كل Query يحتوي على store_id** — بدون استثناء
2. **API Routes تتحقق من الملكية** — `verifyStoreOwnership()`
3. **Storage منفصل لكل متجر** — `store-assets/{storeId}/`
4. **Defense-in-Depth في UPDATE/DELETE**:
```typescript
// ✅ آمن
.where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
```

### التوجيه حسب الحالة

```
طلب وارد
    │
    ├── لا يوجد subdomain (matjary.com)
    │   ├── /              → (platform)/page.tsx
    │   ├── /pricing       → (platform)/pricing/page.tsx
    │   ├── /features      → (platform)/features/page.tsx
    │   ├── /auth/*        → auth pages
    │   └── /super-admin/* → (super-admin)/
    │
    └── يوجد subdomain (ahmed.matjary.com)
        ├── /              → store/page.tsx (middleware rewrite)
        ├── /product/*     → store/product/[slug]/page.tsx
        ├── /cart          → store/cart/page.tsx
        ├── /checkout      → store/checkout/page.tsx
        └── /dashboard/*   → (dashboard)/
```

---

## 5. بنية الروابط

```
matjary.com                    → الموقع التسويقي (platform)
matjary.com/pricing            → صفحة الأسعار
matjary.com/features           → صفحة المميزات
matjary.com/onboarding         → إنشاء متجر جديد
ahmed.matjary.com              → واجهة المتجر (storefront)
ahmed.matjary.com/product/x    → صفحة منتج
ahmed.matjary.com/dashboard    → لوحة تحكم التاجر (dashboard)
matjary.com/super-admin        → لوحة الإدارة العليا
```

---

## 6. بنية المجلدات

```
src/
├── middleware.ts               # Subdomain routing + Clerk auth
├── app/
│   ├── layout.tsx              # Root layout (ClerkProvider + Cairo font)
│   ├── globals.css             # Tailwind + store theme variables
│   ├── auth/                   # Sign-in & Sign-up pages
│   ├── api/
│   │   ├── webhooks/clerk/     # Clerk webhook handler
│   │   ├── stores/             # Store CRUD API + /me endpoint
│   │   ├── checkout/           # Checkout API
│   │   ├── coupons/validate/   # Coupon validation
│   │   ├── shipping/calculate/ # Shipping calculation
│   │   ├── shipping/governorates/ # قائمة المحافظات المتاحة للشحن
│   │   ├── storefront/search/  # بحث مباشر في منتجات المتجر (Live Search)
│   │   ├── payments/
│   │   │   ├── kashier/        # Order payment (create + webhook)
│   │   │   ├── subscription/   # Subscription payment (create + webhook + status)
│   │   │   └── wallet/         # Wallet top-up (create + webhook + status)
│   │   ├── dashboard/          # Dashboard APIs (products, orders, etc.)
│   │   ├── admin/              # Super Admin APIs
│   │   └── plans/              # Public plans API
│   ├── (platform)/             # Marketing site (matjary.com)
│   │   ├── page.tsx            # Landing page
│   │   ├── pricing/            # Pricing page
│   │   ├── features/           # صفحة المميزات (8 ميزة رئيسية)
│   │   ├── onboarding/         # Store creation wizard
│   │   ├── subscription-result/ # Payment result page
│   │   └── wallet-result/      # Wallet top-up result page
│   ├── store/                  # Storefront (slug.matjary.com → rewrite to /store)
│   │   ├── page.tsx            # Store homepage
│   │   ├── product/[slug]/     # Product page
│   │   ├── category/[slug]/    # Category page
│   │   ├── cart/               # Shopping cart
│   │   ├── checkout/           # Checkout page
│   │   ├── order-success/      # Order confirmation
│   │   └── page/[slug]/        # Static pages
│   ├── (dashboard)/            # Merchant dashboard (slug.matjary.com/dashboard)
│   │   └── dashboard/
│   │       ├── page.tsx        # Overview
│   │       ├── products/       # Products CRUD
│   │       ├── orders/         # Orders management
│   │       ├── categories/     # Categories CRUD
│   │       ├── customers/      # Customers list
│   │       ├── coupons/        # Coupons CRUD
│   │       ├── shipping/       # Shipping zones CRUD
│   │       ├── pages/          # Static pages CRUD
│   │       ├── design/         # Theme + hero slides
│   │       ├── wallet/         # Wallet page
│   │       ├── analytics/      # Analytics & reports
│   │       └── settings/       # Store settings
│   └── (super-admin)/          # Platform admin (matjary.com/super-admin)
│       └── super-admin/
│           ├── page.tsx        # Overview
│           ├── stores/         # Stores management
│           ├── merchants/      # Merchants list
│           └── plans/          # Plans CRUD
├── components/
│   ├── ui/                     # shadcn/ui (12 مكون: alert, badge, button, card, checkbox, input, modal, select, skeleton, switch, tabs, textarea)
│   ├── patterns/               # 9 أنماط مشتركة: action-toolbar, data-table-shell, empty-state, filter-bar, form-section, page-header, pagination-bar, stat-card, status-pill
│   ├── motion/                 # 5 مكونات حركة: animated-counter, floating-accent, parallax-layer, reveal, stagger-group
│   └── theme/                  # theme-provider (dark/light mode), theme-toggle
├── db/
│   ├── index.ts                # Database connection
│   ├── schema.ts               # All tables (single source of truth)
│   └── seed.ts                 # Seed platform plans
├── lib/
│   ├── utils.ts                # cn(), formatPrice(), formatDate()
│   ├── sanitize-html.ts        # تطهير HTML (منع XSS)
│   ├── theme.ts                # إعدادات الثيم (dark/light/system)
│   ├── theme-color-utils.ts    # أدوات الألوان (contrast, luminance, mix, audit)
│   ├── api/
│   │   ├── auth.ts             # getAuthenticatedMerchant(), verifyStoreOwnership()
│   │   ├── response.ts         # apiSuccess(), apiError(), ApiErrors
│   │   ├── rate-limit.ts       # Rate limiter utility
│   │   └── dashboard/
│   │       ├── products.ts     # categoryBelongsToStore(), resolveUniqueProductSlug(), resolveUniqueProductSku()
│   │       └── categories.ts   # slugifyCategoryName(), resolveUniqueCategorySlug()
│   ├── payments/
│   │   └── kashier.ts          # Kashier helpers (sessions + signature verification)
│   ├── tenant/
│   │   ├── resolve-store.ts    # resolveStore(slug)
│   │   ├── get-current-store.ts # getCurrentStore()
│   │   ├── store-context.tsx   # React context for storefront
│   │   ├── store-path.ts       # storePath() — بناء مسارات المتجر (dev vs production)
│   │   └── urls.ts             # getProtocol(), buildTenantDashboardHref(), buildTenantStorefrontHref(), getRootOrigin()
│   ├── stores/
│   │   └── cart-store.ts       # Zustand cart store
│   ├── supabase/
│   │   └── storage.ts          # uploadImage(), deleteImage()
│   ├── categories/
│   │   └── category-slug.ts    # slugifyCategorySegment(), buildCategorySlugSegment(), parseCategorySlugSegment()
│   ├── products/
│   │   └── product-slug.ts     # slugifyProductName(), buildProductSlugSegment(), parseProductSlugSegment()
│   ├── queries/
│   │   ├── admin-analytics.ts  # Super Admin analytics queries
│   │   ├── dashboard-analytics.ts # Dashboard analytics queries
│   │   ├── dashboard-orders.ts # Dashboard orders queries
│   │   ├── dashboard-products.ts # Dashboard products queries
│   │   ├── platform-plans.ts   # Platform plans queries
│   │   └── storefront.ts       # Storefront data queries
│   ├── ui/
│   │   └── types.ts            # ThemeTokens, DataTableColumn, FilterConfig, StatusTone, PageSectionProps
│   ├── validations/
│   │   ├── store.ts            # Store Zod schemas
│   │   ├── order.ts            # Order/Coupon/Shipping Zod schemas
│   │   ├── customer.ts         # Customer Zod schemas
│   │   ├── subscription.ts     # Subscription Zod schemas
│   │   └── wallet.ts           # Wallet Zod schemas
│   └── queries/
│       └── storefront.ts       # Storefront data queries
└── migrations/
    ├── dev1_tables.sql
    ├── dev1_rls.sql
    ├── add_is_paid_to_stores.sql
    ├── add_wallet_system.sql
    └── ...
```

---

## 7. قاعدة البيانات

### نظرة عامة

**15 جدول** في ملف واحد: `src/db/schema.ts` (Single Source of Truth)

### العلاقات بين الجداول

```
merchants (1) ──→ (1) stores
stores (1) ──→ (N) store_categories
stores (1) ──→ (N) store_products
stores (1) ──→ (N) store_customers
stores (1) ──→ (N) store_orders
stores (1) ──→ (N) store_shipping_zones
stores (1) ──→ (N) store_coupons
stores (1) ──→ (N) store_pages
stores (1) ──→ (N) store_hero_slides
stores (1) ──→ (N) store_reviews

store_orders (1) ──→ (N) store_order_items
store_categories (1) ──→ (N) store_products

merchants (1) ──→ (N) merchant_wallet_transactions
```

### تفاصيل الجداول

#### merchants (التجار)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| clerk_user_id | text | Unique, NOT NULL |
| email | text | NOT NULL |
| display_name | text | nullable |
| phone | text | nullable |
| avatar_url | text | nullable |
| balance | decimal(12,2) | default 0, NOT NULL — رصيد المحفظة |
| is_active | boolean | default true |
| created_at / updated_at | timestamp(tz) | |

#### stores (المتاجر)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| merchant_id | UUID | FK → merchants, Unique |
| name | text | NOT NULL |
| slug | text | Unique, NOT NULL — الـ subdomain |
| category | text | nullable — تصنيف المتجر (ملابس، إلكترونيات، ...) |
| description | text | nullable |
| logo_url / favicon_url | text | nullable |
| theme | jsonb | StoreTheme type |
| settings | jsonb | StoreSettings type |
| contact_email / phone / whatsapp | text | nullable |
| address | text | nullable |
| social_links | jsonb | SocialLinks type |
| is_active | boolean | default true |
| plan | text | default 'free' — free/basic/pro |
| is_paid | boolean | default false — هل دفع الاشتراك |
| subscription_amount | decimal(10,2) | المبلغ المتوقع |
| subscription_paid_at | timestamp(tz) | تاريخ الدفع |
| subscription_transaction_id | text | Kashier transaction ID |
| custom_domain | text | nullable |
| meta_title / meta_description | text | SEO |
| created_at / updated_at | timestamp(tz) | |

#### store_products (المنتجات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| category_id | UUID | FK → store_categories, SET NULL |
| name / slug | text | NOT NULL, Unique per store |
| description / short_description | text | nullable |
| price | decimal(10,2) | NOT NULL |
| compare_at_price | decimal(10,2) | nullable (سعر قبل الخصم) |
| cost_price | decimal(10,2) | nullable |
| sku / barcode | text | nullable |
| images | jsonb | string[], URLs |
| variants | jsonb | ProductVariant[] |
| stock | integer | default 0 |
| track_inventory | boolean | default true |
| is_active / is_featured / is_digital | boolean | |
| weight | decimal(8,2) | nullable |
| tags | text[] | PostgreSQL array |
| seo_title / seo_description | text | nullable |
| sort_order | integer | default 0 |

#### store_orders (الطلبات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| order_number | text | Unique per store |
| customer_id | UUID | FK → store_customers |
| customer_name / phone / email | text | |
| shipping_address | jsonb | ShippingAddress type |
| shipping_latitude | text | nullable — إحداثيات الشحن (خط العرض) |
| shipping_longitude | text | nullable — إحداثيات الشحن (خط الطول) |
| subtotal / shipping_cost / discount / total | decimal(10,2) | |
| coupon_code | text | nullable |
| payment_method | text | 'cod' / 'kashier' |
| payment_status | text | pending/paid/failed/refunded/awaiting_payment |
| order_status | text | pending/confirmed/processing/shipped/delivered/cancelled/refunded |
| notes / internal_notes | text | nullable |
| tracking_number / shipping_company | text | nullable |
| kashier_order_id / kashier_payment_id | text | nullable |
| is_fee_deducted | boolean | default false — خصم رسوم الطلب |
| paid_at / shipped_at / delivered_at / cancelled_at | timestamp(tz) | |

#### store_order_items (عناصر الطلب)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| order_id | UUID | FK → store_orders |
| store_id | UUID | FK → stores |
| product_id | UUID | FK → store_products, SET NULL |
| variant_id | text | nullable |
| name | text | snapshot اسم المنتج |
| price | decimal(10,2) | سعر الوحدة |
| quantity | integer | |
| total | decimal(10,2) | price × quantity |
| variant_options | jsonb | VariantOption[] |
| image | text | snapshot صورة المنتج |

#### store_categories (التصنيفات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| parent_id | UUID | nullable — تصنيفات فرعية |
| name / slug | text | NOT NULL |
| description | text | nullable |
| image_url | text | nullable |
| sort_order | integer | default 0 |
| is_active | boolean | default true |

#### store_customers (العملاء)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| name / phone | text | NOT NULL |
| email | text | nullable |
| address | jsonb | ShippingAddress |
| total_orders | integer | default 0 |
| total_spent | decimal(10,2) | default 0 |
| last_order_at | timestamp(tz) | nullable |
| notes | text | nullable |
| is_blocked | boolean | default false |

#### store_shipping_zones (مناطق الشحن)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| name | text | مثال: "القاهرة والجيزة" |
| governorates | jsonb | string[] |
| shipping_fee | decimal(10,2) | |
| free_shipping_minimum | decimal(10,2) | nullable |
| estimated_days | text | nullable |
| is_active | boolean | default true |
| sort_order | integer | |

#### store_coupons (كوبونات الخصم)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| code | text | Unique per store |
| type | text | 'percentage' / 'fixed' |
| value | decimal(10,2) | |
| min_order_amount / max_discount | decimal(10,2) | nullable |
| usage_limit | integer | nullable |
| used_count | integer | default 0 |
| starts_at / expires_at | timestamp(tz) | nullable |
| is_active | boolean | default true |

#### store_pages (الصفحات الثابتة)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| title / slug | text | NOT NULL |
| content | jsonb | PageBlock[] |
| page_type | text | default 'landing' |
| is_published | boolean | default false |
| seo_title / seo_description | text | nullable |

#### store_hero_slides (بانرات الصفحة الرئيسية)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| title / subtitle | text | nullable |
| image_url | text | NOT NULL |
| link_url / button_text | text | nullable |
| sort_order | integer | |
| is_active | boolean | default true |

#### store_reviews (التقييمات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores |
| product_id | UUID | FK → store_products |
| order_id | UUID | FK → store_orders, SET NULL |
| customer_name | text | NOT NULL |
| customer_phone | text | nullable — رقم هاتف المقيّم |
| rating | integer | 1-5 |
| comment | text | nullable |
| is_approved | boolean | default false |

#### platform_plans (خطط المنصة)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | text | Primary Key — 'free'/'basic'/'pro' |
| name / name_en | text | |
| price_monthly / price_yearly | decimal(10,2) | |
| order_fee | decimal(10,4) | nullable — رسوم كل طلب |
| max_products / max_orders_per_month | integer | nullable = غير محدود |
| features | jsonb | string[] |
| is_most_popular | boolean | default false — علامة "الأكثر شعبية" |
| is_active | boolean | |
| sort_order | integer | |

#### platform_activity_log (سجل النشاط)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id / merchant_id | UUID | nullable, FK |
| action / entity | text | NOT NULL |
| entity_id | text | nullable |
| metadata | jsonb | nullable |
| created_at | timestamp(tz) | |

#### merchant_wallet_transactions (معاملات المحفظة)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| merchant_id | UUID | FK → merchants |
| store_id | UUID | FK → stores, nullable |
| order_id | UUID | FK → store_orders, nullable |
| type | text | 'top_up' / 'order_fee' |
| amount | decimal(12,2) | موجب للشحن، سالب للخصم |
| balance_before / balance_after | decimal(12,2) | |
| reference | text | kashier transactionId أو orderNumber |
| notes | text | nullable |
| created_at | timestamp(tz) | |

### JSONB Types

```typescript
// StoreTheme
{ primaryColor, secondaryColor, accentColor, fontFamily, borderRadius, headerStyle }

// StoreSettings
{ currency, language, direction, showOutOfStock, requirePhone, requireEmail, minOrderAmount, maxOrderAmount }

// SocialLinks
{ facebook?, instagram?, twitter?, tiktok?, youtube?, whatsapp? }

// ShippingAddress
{ governorate, city, area, street, building?, floor?, apartment?, landmark?, postalCode? }

// ProductVariant
{ id, options: VariantOption[], price, compareAtPrice?, sku?, stock, imageUrl?, isActive }

// VariantOption
{ name: string; value: string }

// PageBlock
{ id, type, content, settings, order }
```

---

## 8. عقود الـ API

### الاستجابة الموحدة

```typescript
// نجاح
{ "success": true, "data": { ... } }

// خطأ
{ "success": false, "error": "رسالة الخطأ", "code": "ERROR_CODE" }
```

### API المتاجر (Dev 1)

| Method | Path | الوصف |
|--------|------|-------|
| POST | /api/stores | إنشاء متجر |
| GET | /api/stores/me | بيانات متجر المستخدم الحالي |
| GET | /api/stores/[id] | بيانات المتجر |
| PUT | /api/stores/[id] | تعديل المتجر |

### API المنتجات — Dashboard (Dev 2)

| Method | Path | الوصف |
|--------|------|-------|
| GET | /api/dashboard/products | قائمة + بحث + فلترة |
| POST | /api/dashboard/products | إنشاء منتج |
| GET | /api/dashboard/products/[id] | منتج واحد |
| PUT | /api/dashboard/products/[id] | تعديل |
| DELETE | /api/dashboard/products/[id] | حذف |

### API الطلبات — Dashboard (Dev 2)

| Method | Path | الوصف |
|--------|------|-------|
| GET | /api/dashboard/orders | قائمة طلبات |
| GET | /api/dashboard/orders/[id] | تفاصيل طلب (+ blur logic) |
| PUT | /api/dashboard/orders/[id] | تعديل بيانات الطلب |
| DELETE | /api/dashboard/orders/[id] | حذف طلب |
| PATCH | /api/dashboard/orders/[id]/status | تغيير حالة الطلب |

### API التصنيفات / الكوبونات / الشحن / الصفحات / التصميم / الإعدادات

كلها CRUD بنفس النمط تحت `/api/dashboard/*`

### API Checkout — Storefront (Dev 1)

| Method | Path | الوصف |
|--------|------|-------|
| POST | /api/checkout | إنشاء طلب (COD أو Kashier) |
| POST | /api/coupons/validate | التحقق من صلاحية كوبون |
| POST | /api/shipping/calculate | حساب تكلفة الشحن |
| GET | /api/shipping/governorates | قائمة المحافظات المتاحة للشحن |

### API بحث المنتجات — Storefront

| Method | Path | الوصف |
|--------|------|-------|
| GET | /api/storefront/search?q=...&limit=... | بحث مباشر (Live Search) في منتجات المتجر — حد أدنى 2 حرف، أقصى 20 نتيجة |

### API الدفع — Kashier (Dev 1)

| Method | Path | الوصف |
|--------|------|-------|
| POST | /api/payments/kashier/create | إنشاء جلسة دفع لطلب (retry) |
| POST | /api/payments/kashier/webhook | استقبال إشعار من Kashier |
| POST | /api/payments/subscription/create | إنشاء جلسة دفع اشتراك |
| POST | /api/payments/subscription/webhook | Webhook دفع الاشتراك |
| GET | /api/payments/subscription/status | Polling حالة الاشتراك |
| POST | /api/payments/wallet/create | إنشاء جلسة شحن محفظة |
| POST | /api/payments/wallet/webhook | Webhook شحن المحفظة |
| GET | /api/payments/wallet/status | Polling حالة الشحن |

### API المحفظة — Dashboard

| Method | Path | الوصف |
|--------|------|-------|
| GET | /api/dashboard/wallet | رصيد + رسوم + سجل المعاملات |

### Super Admin APIs

| Method | Path | الوصف |
|--------|------|-------|
| GET | /api/admin/analytics | إحصائيات كاملة |
| GET | /api/admin/stores | قائمة المتاجر + بحث + فلترة |
| GET/PATCH | /api/admin/stores/[id] | تفاصيل/تعديل متجر |
| GET | /api/admin/merchants | قائمة التجار |
| GET/POST | /api/admin/plans | قائمة/إنشاء خطط |
| PUT/DELETE | /api/admin/plans/[id] | تعديل/حذف خطة |

### Public APIs

| Method | Path | الوصف |
|--------|------|-------|
| GET | /api/plans | قائمة الخطط (عام بدون auth) |

---

## 9. نظام المصادقة والأمان

### المصادقة (Clerk)

- **طرق التسجيل**: Email/Password + Google OAuth + Phone OTP
- **Webhook Events**: `user.created`, `user.updated`, `user.deleted`
- **Auto Merchant Creation**: عند تسجيل مستخدم جديد، Clerk webhook ينشئ سجل في `merchants`
- **Retry Logic**: Exponential backoff (100ms, 200ms, 400ms) لعمليات DB في الـ webhook
- **Structured Logging**: JSON-based logging لكل حدث

### مستويات الوصول

| المستوى | الوصول |
|---------|--------|
| عام (Public) | الموقع التسويقي، واجهة المتجر، APIs عامة |
| مصادق (Authenticated) | Checkout، لوحة التحكم (مالك المتجر فقط) |
| Super Admin | لوحة الإدارة العليا (SUPER_ADMIN_CLERK_ID فقط) |

### دوال المصادقة

| الدالة | الاستخدام |
|--------|-----------|
| `getAuthenticatedMerchant()` | ترجع merchant أو null |
| `getDashboardStoreAccessContext()` | ترجع `{ status, merchant, store }` — للصفحات Server Components في الداشبورد مع تحقق slug + ملكية |
| `verifyStoreOwnership()` | ترجع `{ merchant, store }` — للـ API routes مع تحقق الملكية |
| `isSuperAdmin()` | تدعم عدة admins (مفصولة بفاصلة) |

### Rate Limiting

| Endpoint | الحد |
|----------|------|
| POST /api/stores | 5 طلبات / ساعة |
| POST /api/checkout | 20 طلب / دقيقة |
| POST /api/coupons/validate | 30 طلب / دقيقة |
| POST /api/payments/subscription/create | 10 / ساعة |
| POST /api/payments/wallet/create | 10 / ساعة |

**الخوارزمية**: Sliding Window Counter في الذاكرة (In-Memory) مع تنظيف دوري كل 5 دقائق.

### حماية البيانات

- **كل query يحتوي على store_id** (ما عدا merchants, platform_plans, platform_activity_log)
- **Defense-in-Depth**: كل UPDATE/DELETE فيه `and(eq(table.id, id), eq(table.storeId, store.id))`
- **escapeLike()** مستخدم في كل ILIKE (منع SQL injection)
- **Pagination محدود بـ Math.min(50)** (منع DoS)
- **Supabase Storage مُقسّم per-store**
- **Webhook signature verification** (svix + HMAC-SHA256)
- **`deleteImage()` يتحقق من storeId** في المسار

---

## 10. نظام الدفع

### Kashier Integration

**المكتبة**: `src/lib/payments/kashier.ts`

#### الدوال المتاحة:
- `createKashierSession()` — جلسة دفع طلب
- `createSubscriptionSession()` — جلسة دفع اشتراك
- `createWalletSession()` — جلسة شحن محفظة
- `verifyKashierSignature()` — HMAC-SHA256 verification
- `getConfig()` — env vars validation

#### تدفق الدفع:
```
1. العميل يضغط "ادفع" → API ينشئ جلسة Kashier
2. العميل يتحول لصفحة Kashier → يدفع
3. Kashier يرسل webhook → API يحدث حالة الدفع
4. العميل يتحول لصفحة النتيجة → Polling لحد ما الـ webhook يتم
```

#### حماية Webhook:
- HMAC-SHA256 signature verification
- `crypto.timingSafeEqual` لمنع timing attacks
- التحقق من تطابق المبلغ (defense-in-depth)
- Idempotency (تجاهل المعالجة المكررة)

#### المتغيرات البيئية:
```env
KASHIER_MERCHANT_ID=MID-xxx
KASHIER_API_KEY=xxx
KASHIER_API_SECRET=xxx
KASHIER_MODE=test   # test | live
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 11. نظام الاشتراك

### الفكرة

```
التاجر → يسجل → يختار خطة → ينشئ المتجر
├─ خطة مجانية → isPaid = true → الموقع شغال فوراً
└─ خطة مدفوعة → isPaid = false → صفحة "ادفع الأول"
   └─ يدفع عبر Kashier → Webhook → isPaid = true → الموقع يعمل
```

### البوابة (StorePaymentGate)

- تظهر بدل الـ Storefront لو `isPaid = false`
- تعرض اسم الخطة والسعر وزر "ادفع الآن"
- **Dashboard لا يتأثر أبداً** — التاجر يقدر يجهز متجره قبل الدفع

### Polling

صفحة النتيجة تعمل polling كل 2 ثانية لمدة 30 ثانية عبر `GET /api/payments/subscription/status`

### Super Admin Override

يمكن للـ Super Admin تفعيل/تعطيل `isPaid` يدوياً + مزامنة تلقائية عند تغيير الخطة.

---

## 12. نظام المحفظة

### الفكرة

```
التاجر → يشحن محفظته عبر Kashier
عميل يطلب → طلب يظهر في قائمة الطلبات
التاجر يفتح تفاصيل الطلب:
  ├─ رصيد كافي → يتخصم fee تلقائياً → التفاصيل واضحة
  └─ رصيد غير كافي → التفاصيل مضببة (blurred) → "اشحن محفظتك"
```

### الخصم الذري (Atomic Deduction)

```typescript
await db.transaction(async (tx) => {
  // 1. SELECT FOR UPDATE (row-level lock)
  // 2. التحقق من كفاية الرصيد
  // 3. خصم الـ fee
  // 4. تحديث is_fee_deducted = true
  // 5. تسجيل المعاملة
})
```

### صفحة المحفظة (/dashboard/wallet)

- الرصيد الحالي
- رسوم كل طلب (من الخطة)
- نموذج شحن المحفظة (10 - 10,000 جنيه)
- سجل المعاملات

---

## 13. لوحة تحكم التاجر (Dashboard — Dev 2)

### الصفحات

| الصفحة | الوصف |
|--------|-------|
| `/dashboard` | نظرة عامة (Overview) |
| `/dashboard/products` | إدارة المنتجات (CRUD + رفع صور + variants) |
| `/dashboard/products/new` | إنشاء منتج جديد |
| `/dashboard/products/[id]` | تعديل منتج |
| `/dashboard/orders` | إدارة الطلبات (فلترة + تغيير حالة) |
| `/dashboard/orders/[id]` | تفاصيل طلب (عرض + blur logic) |
| `/dashboard/categories` | إدارة التصنيفات |
| `/dashboard/customers` | قائمة العملاء |
| `/dashboard/coupons` | إدارة الكوبونات |
| `/dashboard/shipping` | مناطق الشحن |
| `/dashboard/pages` | الصفحات الثابتة |
| `/dashboard/pages/new` | إنشاء صفحة جديدة |
| `/dashboard/pages/[id]` | عرض تفاصيل صفحة |
| `/dashboard/pages/[id]/edit` | محرر بلوكات الصفحة (Page Blocks Editor) |
| `/dashboard/design` | تخصيص الثيم + hero slides |
| `/dashboard/wallet` | المحفظة |
| `/dashboard/analytics` | إحصائيات ورسوم بيانية |
| `/dashboard/settings` | إعدادات المتجر |

### حالات الطلب

```
pending → confirmed → processing → shipped → delivered
                                          → cancelled
                                          → refunded
```

### نظام المتغيرات (Variants)

```typescript
type ProductVariant = {
  id: string          // nanoid()
  options: { name: string; value: string }[]
  price: number | null
  stock: number
  sku: string | null
}
```

---

## 14. واجهة المتجر (Storefront — Dev 3)

### الصفحات

| الصفحة | الوصف |
|--------|-------|
| `/` (store/) | الصفحة الرئيسية (hero + منتجات مميزة + أحدث) |
| `/product/[slug]` | صفحة المنتج (gallery + variants + add to cart) |
| `/category/[slug]` | صفحة التصنيف مع فلترة |
| `/cart` | سلة التسوق |
| `/checkout` | إتمام الطلب (شحن + كوبون + دفع) |
| `/order-success` | تأكيد الطلب |
| `/page/[slug]` | صفحات ثابتة |
| `/[slug]` | Fallback ذكي — يبحث في التصنيفات/المنتجات/الصفحات ويعمل redirect |

### سلة التسوق (Zustand)

```typescript
// src/lib/stores/cart-store.ts
// محفوظة في localStorage باسم 'matjary-cart'
// تتمسح تلقائياً عند تغيير المتجر (storeId)
// Items مُفهرسة بـ (productId + variantId)
```

### Theme الديناميكي

كل متجر يطبق ألوانه عبر CSS variables:
```css
--store-primary: #000000
--store-secondary: #ffffff
--store-accent: #3b82f6
--store-radius: 8px
--store-font: Cairo
```

### تدفق Checkout

```
1. العميل يملأ بيانات الشحن
2. يختار طريقة الدفع (COD أو Kashier)
3. يدخل كوبون (اختياري)
4. API يحسب: subtotal + shipping - discount = total
5. يُنشئ order + order_items
6. يُنقص المخزون
7. COD → صفحة النجاح | Kashier → redirect للدفع
```

---

## 15. لوحة الإدارة العليا (Super Admin)

### الصفحات

| الصفحة | الوصف | الحالة |
|--------|-------|--------|
| `/super-admin` | Overview — إحصائيات + آخر المتاجر + سجل النشاط | ✅ بيانات حقيقية |
| `/super-admin/stores` | إدارة المتاجر — بحث + فلترة + toggle + pagination | ✅ بيانات حقيقية |
| `/super-admin/merchants` | قائمة التجار — بحث + pagination | ✅ بيانات حقيقية |
| `/super-admin/plans` | إدارة الخطط — CRUD كامل عبر dialogs | ✅ بيانات حقيقية |
| `/super-admin/plans/new` | إنشاء خطة جديدة | ✅ |

### الإحصائيات المعروضة

- إجمالي المتاجر / المتاجر النشطة
- إجمالي التجار
- إجمالي الإيرادات
- توزيع المتاجر حسب الخطة
- آخر 10 متاجر مع اسم التاجر
- آخر 20 نشاط

---

## 16. اتفاقيات المكونات

### تسمية الملفات

| النوع | التسمية | مثال |
|-------|---------|------|
| ملف المكون | `kebab-case.tsx` | `product-card.tsx` |
| اسم المكون | `PascalCase` | `ProductCard` |
| Props type | `ComponentNameProps` | `ProductCardProps` |
| ملف واحد = component واحد | | |

### Server vs Client Components

- **Server Component** (افتراضي) — لجلب البيانات مباشرة
- **`'use client'`** فقط عند: useState, useEffect, onClick, useStore, browser APIs

### Tailwind فقط — لا CSS مخصص

```typescript
import { cn } from '@/lib/utils'
// استخدم cn() لدمج الأصناف الشرطية
```

### RTL-First

```
✅ text-start, ps-4, pe-4, ms-auto, me-2
❌ text-left, pl-4, pr-4, ml-auto, mr-2
```

### Responsive (Mobile-First)

```
sm: 640px+ | md: 768px+ | lg: 1024px+ | xl: 1280px+
```

---

## 17. قواعد الكود والتطوير

### القواعد الحرجة (10 قواعد)

1. **كل query فيه `storeId`** — ما عدا merchants + platform_plans + activity_log
2. **TypeScript strict — لا `any` أبداً** — استخدم `unknown`
3. **Zod v4** — `{ error: '...' }` مش `'...'` و `z.email()` مش `z.string().email()`
4. **رسائل الأخطاء بالعربية** — كل شيء
5. **`apiSuccess()` / `apiError()` / `ApiErrors.*`** — لا `NextResponse.json()` مباشرة
6. **`@/` imports** — لا relative paths
7. **Server Components أولاً** — `'use client'` فقط عند الحاجة
8. **Tailwind v4**: `shadow-xs` مش `shadow-sm`, `rounded-xs` مش `rounded-sm`
9. **RTL-first**: `ps-4 pe-2 ms-auto text-start`
10. **Defense-in-Depth**: كل UPDATE/DELETE فيه `and(eq(id), eq(storeId))`

### Zod v4 — الفروقات عن v3

| v3 (خطأ ❌) | v4 (صح ✅) |
|---|---|
| `z.string().min(5, 'قصير')` | `z.string().min(5, { error: 'قصير' })` |
| `z.string().email()` | `z.email()` |
| `z.string().uuid()` | `z.uuidv4()` |
| `error.flatten()` | `z.prettifyError(error)` |
| `z.object({}).strict()` | `z.strictObject({})` |

### Tailwind v4 — تغييرات Classes

| v3 (خطأ ❌) | v4 (صح ✅) |
|---|---|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |
| `outline-none` | `outline-hidden` |
| `ring` | `ring-3` |
| `bg-[--var]` | `bg-(--var)` |

### أسماء الأعمدة في Drizzle (camelCase)

```
✅ Drizzle (TypeScript): storeId, isActive, isFeatured, compareAtPrice
❌ SQL: store_id, is_active, is_featured, compare_at_price
```

### Imports الشائعة

```typescript
import { db } from '@/db'
import { stores, storeProducts } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { cn, formatPrice, formatDate } from '@/lib/utils'
```

### Git Convention

```
feat: إضافة صفحة المنتجات
fix: إصلاح خطأ في حساب سعر الشحن
refactor: إعادة هيكلة مكون سلة التسوق
docs: تحديث دليل المطور
```

### فروع Git

```
main            ← الإنتاج (محمي)
develop         ← فرع التطوير الرئيسي
feature/xxx     ← فروع الميزات
fix/xxx         ← فروع الإصلاحات
```

---

## 18. البيئة والإعداد

### المتطلبات

| الأداة | الإصدار |
|--------|---------|
| Node.js | 18.18+ (يُفضل 20 LTS) |
| npm | 9+ |
| Git | 2.x |
| VS Code | أحدث |

### خطوات الإعداد

```bash
# 1. استنساخ المشروع
git clone <repo-url>
cd matjary-platform

# 2. تثبيت الحزم
npm install   # .npmrc يحتوي legacy-peer-deps=true

# 3. إعداد المتغيرات البيئية
cp .env.example .env.local

# 4. إعداد DNS المحلي (في ملف hosts)
127.0.0.1   matjary.local
127.0.0.1   ahmed.matjary.local
127.0.0.1   test.matjary.local

# 5. دفع السكيما وتشغيل البذر
npm run db:push
npm run db:seed

# 6. تشغيل خادم التطوير
npm run dev
```

### المتغيرات البيئية المطلوبة

```env
# Supabase
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up

# Kashier
KASHIER_MERCHANT_ID=MID-xxx
KASHIER_API_KEY=xxx
KASHIER_API_SECRET=xxx
KASHIER_MODE=test

# Platform
NEXT_PUBLIC_ROOT_DOMAIN=matjary.local:3000
NEXT_PUBLIC_PROTOCOL=http
NEXT_PUBLIC_APP_URL=http://matjary.local:3000
SUPER_ADMIN_CLERK_ID=user_xxxxx
```

---

## 19. النشر (Deployment)

### Vercel

- **Platform**: Vercel (Pro plan مطلوب لـ wildcard subdomains)
- **CI/CD**: Auto-deploy من GitHub
  - `push` إلى `main` → Production
  - `push` إلى أي فرع → Preview

### إعداد DNS

1. `matjary.com` → A record → `76.76.21.21`
2. `*.matjary.com` → CNAME → `cname.vercel-dns.com`

### الخدمات الخارجية للإنتاج

- Clerk: مفاتيح `live` + Webhook URL
- Supabase: `store-assets` bucket عام + CORS
- Kashier: `KASHIER_MODE=live` + Webhook URL
- Vercel: كل المتغيرات البيئية

---

## 20. فريق العمل

| الدور | المسؤوليات |
|-------|-----------|
| **Product Owner** | رؤية المنتج، الأولويات، مراجعة النتائج |
| **Dev 1** | المصادقة، Middleware، Clerk webhook، APIs الأساسية، Kashier، Super Admin، المحفظة، الاشتراكات |
| **Dev 2** | لوحة تحكم التاجر (Dashboard) بالكامل — المنتجات، الطلبات، التصنيفات، الكوبونات، الشحن، التصميم، الإعدادات |
| **Dev 3** | واجهة المتجر (Storefront) + سلة التسوق + Checkout |

### خريطة التبعيات

```
Dev 1 → يوفر البنية التحتية لـ Dev 2 و Dev 3
Dev 2 → يعتمد على auth helpers + middleware + APIs من Dev 1
Dev 3 → يعتمد على getCurrentStore() + checkout API + shipping/coupons APIs من Dev 1
```

---

## 21. المراحل المنجزة والمتبقية

### ✅ مراحل مكتملة

- **المرحلة 1**: البنية التحتية (Next.js, TypeScript, packages)
- **المرحلة 2**: قاعدة البيانات (schema, connection, seed)
- **المرحلة 3**: المصادقة والـ Middleware
- **المرحلة 4**: هيكل الصفحات (platform, store, dashboard, super-admin)
- **المرحلة 5**: الأدوات المساعدة (utils, auth, response, storage)
- **المرحلة 6**: التوثيق الكامل

### ✅ مهام Dev 1 المنجزة

| المهمة | الحالة | التاريخ |
|--------|--------|---------|
| إصلاح الثغرات الأمنية (M1-M6) | ✅ | 21/02/2026 |
| ربط Onboarding بـ API | ✅ | 21/02/2026 |
| Super Admin Overview (بيانات حقيقية) | ✅ | 21/02/2026 |
| Super Admin Stores (بيانات حقيقية) | ✅ | 21/02/2026 |
| Super Admin Merchants (بيانات حقيقية) | ✅ | 21/02/2026 |
| Super Admin Plans CRUD | ✅ | 21/02/2026 |
| Kashier Payment Integration | ✅ | 22/02/2026 |
| تحسينات Clerk Webhook | ✅ | 22/02/2026 |
| Rate Limiting | ✅ | 22/02/2026 |
| تحسينات L1-L7 | ✅ | 22/02/2026 |
| نظام دفع الاشتراك | ✅ | 03/2026 |
| نظام المحفظة ورسوم الطلبات | ✅ | 07/03/2026 |

### المهام المتبقية — Dev 2

- [ ] CRUD المنتجات مع رفع صور
- [ ] نظام المتغيرات (variants)
- [ ] CRUD التصنيفات
- [ ] عرض وإدارة الطلبات
- [ ] CRUD الكوبونات
- [ ] CRUD مناطق الشحن
- [ ] CRUD الصفحات الثابتة
- [ ] تخصيص التصميم + رفع الشعار
- [ ] الإحصائيات والتقارير
- [ ] إعدادات المتجر

### المهام المتبقية — Dev 3

- [ ] الصفحة الرئيسية (hero + منتجات)
- [ ] صفحة المنتج (gallery + variants + add to cart)
- [ ] صفحة التصنيف مع فلترة
- [ ] Zustand cart store
- [ ] صفحة السلة + Checkout
- [ ] صفحة نجاح الطلب
- [ ] صفحات ثابتة
- [ ] SEO (generateMetadata)
- [ ] Responsive design

---

## 22. المراجعة الأمنية الشاملة

### ملخص النتائج (21/02/2026)

```
✅ ثغرات حرجة (Critical):     0 — لا يوجد
⚠️ ثغرات متوسطة (Medium):     6 — تم إصلاحها جميعاً ✅
💡 تحسينات منخفضة (Low):       7 — تم تنفيذها جميعاً ✅
```

### الحماية المُطبّقة

| الحماية | الحالة |
|---------|--------|
| كل Dashboard routes تستخدم `verifyStoreOwnership()` | ✅ |
| كل Admin routes تستخدم `isSuperAdmin()` | ✅ |
| كل API routes فيها `try/catch` | ✅ |
| كل SELECT queries فيها `storeId` filter | ✅ |
| كل UPDATE/DELETE فيها `and(eq(id), eq(storeId))` | ✅ |
| Zod validation في كل POST/PUT/PATCH | ✅ |
| `escapeLike()` في كل ILIKE | ✅ |
| Pagination محدود بـ 50 | ✅ |
| Supabase Storage per-store | ✅ |
| Webhook signature verification | ✅ |
| Rate limiting على APIs حساسة | ✅ |
| `deleteImage()` storeId check | ✅ |

### حالة كل API Route

| Route | Auth | storeId | Zod | try/catch | الحكم |
|-------|------|---------|-----|-----------|-------|
| dashboard/products | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/products/[id] | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/orders | ✅ | ✅ | — | ✅ | ✅ PASS |
| dashboard/orders/[id] | ✅ | ✅ | — | ✅ | ✅ PASS |
| dashboard/orders/[id]/status | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/categories | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/categories/[id] | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/coupons | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/coupons/[id] | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/shipping | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/shipping/[id] | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/pages | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/pages/[id] | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/design/* | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/customers | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/customers/[id] | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/analytics | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/settings | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/upload | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| dashboard/wallet | ✅ | ✅ | — | ✅ | ✅ PASS |
| admin/* | ✅ | — | ✅ | ✅ | ✅ PASS |
| checkout | عام | ✅ | ✅ | ✅ | ✅ PASS |
| coupons/validate | عام | ✅ | ✅ | ✅ | ✅ PASS |
| shipping/calculate | عام | ✅ | ✅ | ✅ | ✅ PASS |
| stores | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| webhooks/clerk | Svix ✅ | — | — | ✅ | ✅ PASS |
| payments/* | حسب الـ route | ✅ | ✅ | ✅ | ✅ PASS |

---

## 23. دليل الاختبار

### اختبارات يجب تنفيذها

1. **TypeScript + Build**: `npx tsc --noEmit` + `npm run build`
2. **Clerk Webhook**: user.created / updated / deleted
3. **إنشاء متجر (Onboarding)**: التدفق الكامل + validation + slug مكرر
4. **الأمان — عزل المتاجر**: تاجر A لا يقدر يعدل بيانات تاجر B
5. **Checkout + Kashier**: COD + Kashier + webhook + retry
6. **كوبونات + شحن**: validation + free shipping + غير مدعوم
7. **Rate Limiting**: POST /api/stores (5/hr) + POST /api/checkout (20/min)
8. **Super Admin**: حماية الوصول + كل CRUD
9. **Zod Validations**: كل input + رسائل عربية
10. **Middleware + Routing**: main domain + subdomain + nonexistent
11. **Supabase Storage**: رفع + حذف + حماية المسار + أنواع الملفات

---

## 24. التنبيهات والمشاكل المعروفة

### Zod v4 (وليس v3)
- استخدم `{ error: '...' }` بدل `'...'`
- `z.email()` بدل `z.string().email()`
- `z.uuidv4()` بدل `z.string().uuid()`

### Tailwind CSS v4
- لا يوجد `tailwind.config.ts` — CSS-first config عبر `@theme inline`
- الـ border الافتراضي أصبح `currentColor`
- variables: `bg-(--var)` بدل `bg-[--var]`

### Clerk v6 + Next.js 15
- `auth()` يُستدعى بـ `await`
- `--legacy-peer-deps` مطلوب (`.npmrc` موجود)

### Drizzle ORM + Supabase
- `prepare: false` مطلوب لـ connection pooling
- استخدم `drizzle-kit push` مباشرة (مش generate + migrate)

### Wildcard Subdomains
- كل متجر جديد يحتاج إضافة يدوية لملف hosts أثناء التطوير المحلي
- Vercel Pro مطلوب للإنتاج

### React 19
- `--legacy-peer-deps` مطلوب عند تثبيت حزم

---

## 25. مكتبة المكونات المشتركة (Shared Components Library)

### مكونات الواجهة (UI Components) — `src/components/ui/`

12 مكون أساسي مبني على shadcn/ui و Radix UI:

| المكون | الوصف |
|--------|-------|
| `Alert` | تنبيهات ورسائل للمستخدم |
| `Badge` | شارات وعلامات (tags) |
| `Button` | أزرار بأحجام وأنماط متعددة |
| `Card` | بطاقات لعرض المحتوى |
| `Checkbox` | مربعات اختيار |
| `Input` | حقول إدخال نصية |
| `Modal` | نوافذ حوارية (dialogs) |
| `Select` | قوائم منسدلة |
| `Skeleton` | هياكل تحميل (loading placeholders) |
| `Switch` | مفاتيح تبديل (toggles) |
| `Tabs` | علامات تبويب |
| `Textarea` | حقول نص متعددة الأسطر |

### مكونات الأنماط (Pattern Components) — `src/components/patterns/`

9 مكونات لأنماط متكررة في الداشبورد:

| المكون | الوصف |
|--------|-------|
| `ActionToolbar` | شريط أدوات لعمليات CRUD (أزرار الحذف، التعديل، إلخ) |
| `DataTableShell` | غلاف جدول بيانات قابل لإعادة الاستخدام |
| `EmptyState` | حالة فارغة (لا توجد بيانات) مع أيقونة ورسالة |
| `FilterBar` | شريط بحث وفلاتر |
| `FormSection` | غلاف قسم في النموذج (form group) |
| `PageHeader` | ترويسة صفحة بعنوان ووصف وزر إجراء |
| `PaginationBar` | شريط ترقيم الصفحات |
| `StatCard` | بطاقة إحصائيات (KPI) |
| `StatusPill` | شارة حالة ملونة (نجاح/تحذير/خطر/محايد/معلومة) |

### مكونات الحركة (Motion Components) — `src/components/motion/`

5 مكونات للحركة والرسوم المتحركة:

| المكون | الوصف |
|--------|-------|
| `AnimatedCounter` | عداد رقمي متحرك (يعد من الصفر للهدف) |
| `FloatingAccent` | عنصر عائم متحرك للزينة |
| `ParallaxLayer` | تأثير التمرير المتوازي (Parallax scrolling) |
| `Reveal` | كشف العنصر عند التمرير (scroll reveal) |
| `StaggerGroup` | مجموعة عناصر تظهر بالتسلسل (staggered animation) |

### مكونات الثيم (Theme Components) — `src/components/theme/`

| المكون | الوصف |
|--------|-------|
| `ThemeProvider` | موفر سياق الثيم (dark/light/system) |
| `ThemeToggle` | زر تبديل الوضع الداكن/الفاتح |

---

## 26. مكونات واجهة المتجر الخاصة (Storefront Components)

### مكونات المتجر — `src/app/store/_components/`

| المكون | الوصف |
|--------|-------|
| `StoreHeader` | ترويسة المتجر: الشعار، اسم المتجر، تنقل التصنيفات، البحث، تبديل الثيم، عداد السلة |
| `StoreFooter` | تذييل المتجر: اسم المتجر، الوصف، روابط التواصل الاجتماعي، معلومات الاتصال |
| `ProductCard` | بطاقة منتج: الصورة، الاسم، السعر، الخصم، حالة المخزون، شارة المنتج المميز |
| `HeroSlider` | بانر متحرك دوار (auto-rotating) مع صور وأزرار CTA وعناصر تحكم (سابق/تالي) |
| `CartCounter` | أيقونة السلة في الترويسة مع عدد العناصر (client-side) |
| `CartToast` | إشعار منبثق عند إضافة منتج للسلة (قابل للإغلاق بـ Escape) |
| `StoreSearch` | حقل بحث المنتجات (مدمج في الترويسة) |
| `StorePaymentGate` | بوابة تفعيل الاشتراك مع مؤشر تحميل ومعالجة أخطاء |
| `TrustBadges` | شارات الثقة: الدفع عند الاستلام، شحن سريع، إرجاع سهل (مع أيقونات SVG) |

### مكونات صفحة المنتج — `src/app/store/product/[slug]/_components/`

| المكون | الوصف |
|--------|-------|
| `ProductDetails` | صفحة تفاصيل المنتج: السعر/سعر المقارنة، حالة المخزون، اختيار المتغيرات، محدد الكمية، زر الإضافة للسلة، الوصف، شارات الثقة |
| `MobileStickyCart` | زر سلة لاصق في أسفل الشاشة للهواتف |

### مكونات لوحة التحكم الخاصة

| المكون | المسار | الوصف |
|--------|--------|-------|
| `ProductForm` | `(dashboard)/dashboard/products/_components/` | نموذج المنتج الشامل (إنشاء/تعديل): الاسم، الوصف، الأسعار، SKU، المخزون، التصنيف، رفع الصور (5MB)، المتغيرات، SEO |
| `DashboardLayoutShell` | `(dashboard)/` | غلاف تخطيط الداشبورد |
| `SubscriptionBanner` | `(dashboard)/` | بانر تحذيري "متجرك غير مفعّل بعد" مع زر "فعّل متجرك الآن" |
| `StoresFilterBar` | `(super-admin)/super-admin/_components/` | شريط فلترة المتاجر: توزيع الخطط، بحث، تصفية حسب الخطة بألوان |
| `SuperAdminLayoutShell` | `(super-admin)/` | غلاف تخطيط لوحة الإدارة العليا |
| `SuperAdminNav` | `(super-admin)/` | شريط تنقل الإدارة العليا |
| `PlatformHeader` | `(platform)/` | ترويسة الموقع التسويقي |
| `ForbiddenBackButton` | `forbidden/` | زر العودة في صفحة الحظر |

---

## 27. صفحة المميزات (Features Page)

**المسار**: `matjary.com/features` — `src/app/(platform)/features/page.tsx`

صفحة تعرض مميزات المنصة الرئيسية مع 8 بطاقات ميزة:

| الميزة | الوصف |
|--------|-------|
| **واجهة متجر عصرية** | Hero section، بطاقات منتجات، تجربة Checkout سلسة |
| **لوحة تحكم متكاملة** | إدارة المنتجات، الطلبات، العملاء، الصفحات، التصميم |
| **دفع مرن** | دفع إلكتروني (Kashier) أو الدفع عند الاستلام (COD) |
| **عروض وكوبونات** | خصومات مع حدود استخدام |
| **شحن وتوصيل** | مناطق شحن مرتبطة بالتكلفة حسب المحافظة |
| **صفحات ديناميكية** | صفحات من نوعنا، الأسئلة الشائعة، صفحات تسويقية |
| **طبقة UI قابلة للتوسع** | مكونات قابلة لإعادة الاستخدام |
| **تخصيص بصري سهل** | ألوان، headers، hero slides، معاينة مباشرة |

تستخدم مكونات الحركة: `FloatingAccent`, `Reveal`, `StaggerGroup` مع تخطيط RTL عربي وتأثيرات hover على كل بطاقة.

---

## 28. أدوات المساعدة المتقدمة (Advanced Utilities)

### API Helpers — `src/lib/api/dashboard/products.ts`

| الدالة | الوصف |
|--------|-------|
| `categoryBelongsToStore(storeId, categoryId)` | التحقق أن التصنيف ينتمي للمتجر |
| `resolveUniqueProductSlug(storeId, productName, options)` | توليد slug فريد مع لاحقة رقمية عند التكرار |
| `resolveUniqueProductSku(storeId, options)` | توليد SKU فريد عشوائي آمن (PRD-XXXXXXXX) |

### UI Types — `src/lib/ui/types.ts`

```typescript
type ThemeTokens          // ألوان، مسافات، ظلال، توقيتات حركة
type DataTableColumn<T>   // عمود جدول بيانات عام مع دالة عرض
type FilterConfig         // إعدادات الفلاتر (نصية/قوائم)
type StatusTone           // 'success' | 'warning' | 'danger' | 'neutral' | 'info'
type PageSectionProps     // title, description, action, children
```

### Validation Schemas — `src/lib/validations/`

6 ملفات تحقق بـ Zod v4:

| الملف | المحتوى |
|-------|---------|
| `store.ts` | createStoreSchema + schemas متعلقة بالمتاجر |
| `product.ts` | variantOptionSchema, productVariantSchema, createProductSchema, updateProductSchema |
| `order.ts` | shippingAddressSchema, shippingLocationSchema, checkoutItemSchema, checkoutSchema, validateCouponSchema, calculateShippingSchema, updateOrderStatusSchema, createCouponSchema, updateCouponSchema, createShippingZoneSchema, updateShippingZoneSchema, createPageSchema, updatePageSchema, createHeroSlideSchema, updateHeroSlideSchema, createPlanSchema, updatePlanSchema |
| `customer.ts` | updateCustomerSchema |
| `subscription.ts` | Subscription-related schemas |
| `wallet.ts` | Wallet-related schemas |

---

## 29. صفحات الأخطاء والتحميل (Error & Loading Pages)

### صفحات الأخطاء

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| **Global Error** | `src/app/global-error.tsx` | خطأ عام للتطبيق — "تعذّر إكمال العملية" مع زر إعادة المحاولة |
| **Global 404** | `src/app/not-found.tsx` | "الصفحة غير موجودة" مع أيقونة بوصلة ورابط العودة للرئيسية |
| **Forbidden 403** | `src/app/forbidden/page.tsx` | صفحة حظر الوصول مع أيقونة درع ورسائل ذكية حسب السياق (dashboard vs عام) |
| **Store Error** | `src/app/store/error.tsx` | خطأ في واجهة المتجر |
| **Store 404** | `src/app/store/not-found.tsx` | "المتجر غير موجود" |
| **Dashboard Error** | `src/app/(dashboard)/error.tsx` | خطأ في لوحة التحكم |
| **Dashboard 404** | `src/app/(dashboard)/not-found.tsx` | "المتجر غير موجود" مع رابط للـ onboarding |
| **Category 404** | `src/app/store/category/[slug]/not-found.tsx` | "التصنيف غير موجود" مع رابط ديناميكي للصفحة الرئيسية |

### صفحات التحميل (Loading States)

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| **Store Loading** | `src/app/store/loading.tsx` | مؤشر تحميل دوار + "جاري تحميل المتجر..." |
| **Dashboard Loading** | `src/app/(dashboard)/loading.tsx` | مؤشر تحميل دوار + "جاري التحميل..." |

### صفحات خاصة

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| **Forbidden Back Button** | `src/app/forbidden/forbidden-back-button.tsx` | مكون زر العودة في صفحة 403 |

---

## 30. فهارس قاعدة البيانات (Database Indices)

فهارس مُضافة لتحسين أداء الاستعلامات:

### stores
| الفهرس | الأعمدة |
|--------|---------|
| `idx_stores_slug` | slug |
| `idx_stores_merchant` | merchant_id |
| `idx_stores_custom_domain` | custom_domain |

### store_categories
| الفهرس | الأعمدة |
|--------|---------|
| `uniq_category_store_slug` | (store_id, slug) — UNIQUE |
| `idx_categories_store` | store_id |
| `idx_categories_parent` | parent_id |

### store_products
| الفهرس | الأعمدة |
|--------|---------|
| `uniq_product_store_slug` | (store_id, slug) — UNIQUE |
| `idx_products_store` | store_id |
| `idx_products_category` | category_id |
| `idx_products_store_active` | (store_id, is_active) |
| `idx_products_store_featured` | (store_id, is_featured) |

### store_customers
| الفهرس | الأعمدة |
|--------|---------|
| `uniq_customer_store_phone` | (store_id, phone) — UNIQUE |
| `idx_customers_store` | store_id |

### store_orders
| الفهرس | الأعمدة |
|--------|---------|
| `uniq_order_store_number` | (store_id, order_number) — UNIQUE |
| `idx_orders_store` | store_id |
| `idx_orders_store_status` | (store_id, order_status) |
| `idx_orders_store_payment` | (store_id, payment_status) |
| `idx_orders_customer` | customer_id |
| `idx_orders_created` | created_at |

### store_order_items
| الفهرس | الأعمدة |
|--------|---------|
| `idx_order_items_order` | order_id |
| `idx_order_items_store` | store_id |
| `idx_order_items_product` | product_id |

### store_shipping_zones
| الفهرس | الأعمدة |
|--------|---------|
| `idx_shipping_zones_store` | store_id |

### store_coupons
| الفهرس | الأعمدة |
|--------|---------|
| `uniq_coupon_store_code` | (store_id, code) — UNIQUE |
| `idx_coupons_store` | store_id |

### store_pages
| الفهرس | الأعمدة |
|--------|---------|
| `uniq_page_store_slug` | (store_id, slug) — UNIQUE |
| `idx_pages_store` | store_id |

### store_hero_slides
| الفهرس | الأعمدة |
|--------|---------|
| `idx_hero_slides_store` | store_id |

### store_reviews
| الفهرس | الأعمدة |
|--------|---------|
| `idx_reviews_store` | store_id |
| `idx_reviews_product` | product_id |

### merchant_wallet_transactions
| الفهرس | الأعمدة |
|--------|---------|
| `idx_wallet_tx_merchant` | merchant_id |
| `idx_wallet_tx_store` | store_id |
| `idx_wallet_tx_order` | order_id |
| `idx_wallet_tx_created` | created_at |

### platform_activity_log
| الفهرس | الأعمدة |
|--------|---------|
| `idx_activity_store` | store_id |
| `idx_activity_merchant` | merchant_id |
| `idx_activity_created` | created_at |

---

## 31. استعلامات البيانات (Query Functions)

### `src/lib/queries/` — 6 ملفات

| الملف | الوصف |
|-------|-------|
| `admin-analytics.ts` | استعلامات إحصائيات لوحة الإدارة العليا (Super Admin): إجمالي المتاجر، التجار، الإيرادات، توزيع الخطط |
| `dashboard-analytics.ts` | استعلامات إحصائيات لوحة تحكم التاجر: الطلبات، الإيرادات، المنتجات، العملاء |
| `dashboard-orders.ts` | استعلامات طلبات الداشبورد: قائمة الطلبات مع الفلترة والبحث والترتيب |
| `dashboard-products.ts` | استعلامات منتجات الداشبورد: قائمة المنتجات مع البحث والفلترة |
| `platform-plans.ts` | استعلامات خطط المنصة: الخطط النشطة مرتبة حسب sort_order |
| `storefront.ts` | استعلامات واجهة المتجر: المنتجات، التصنيفات، البحث، المنتجات المميزة، أحدث المنتجات |

---

## 32. نظام الثيمات والألوان (Theme & Color System)

### إدارة الثيم — `src/lib/theme.ts`

```typescript
THEME_COOKIE_NAME = 'matjary-theme'      // اسم الكوكي
THEME_COOKIE_MAX_AGE = 365 يوم           // مدة الصلاحية

type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

// الدوال
isThemePreference(value)    // Type guard
parseThemePreference(value) // تحليل مع fallback إلى 'system'
```

### أدوات الألوان — `src/lib/theme-color-utils.ts`

154+ سطر من أدوات الألوان المبنية على معايير WCAG:

| الدالة | الوصف |
|--------|-------|
| `normalizeHexColor(color)` | تحقق وتطبيع ألوان Hex (#RRGGBB أو #RGB) |
| `hexToRgb(hex)` | تحويل Hex إلى RGB |
| `relativeLuminance(r, g, b)` | حساب الإضاءة النسبية (WCAG) |
| `contrastRatio(hex1, hex2)` | حساب نسبة التباين (WCAG) |
| `pickReadableTextColor(bg)` | اختيار لون نص مقروء (فاتح/غامق) بناءً على الخلفية |
| `colorDistance(hex1, hex2)` | المسافة الإقليدية بين لونين |
| `mixHexColors(hex1, hex2, weight)` | مزج لونين بنسبة محددة |
| `auditThemeColors(theme)` | فحص ألوان الثيم (تباين + مسافة) |

### مكونات الثيم — `src/components/theme/`

| المكون | الوصف |
|--------|-------|
| `ThemeProvider` | موفر سياق يدعم 3 أوضاع: system, light, dark — يحفظ الاختيار في كوكي لمدة سنة |
| `ThemeToggle` | زر تبديل بين الوضع الفاتح والداكن |

### CSS Variables — `src/app/globals.css`

```css
/* ألوان المتجر الديناميكية */
--store-primary: #000000
--store-secondary: #ffffff
--store-accent: #3b82f6
--store-radius: 8px
--store-font: Cairo
```

---

## 33. نظام Slug للمنتجات والتصنيفات

### Category Slug — `src/lib/categories/category-slug.ts`

| الدالة | الوصف |
|--------|-------|
| `slugifyCategorySegment(value)` | إنشاء slug آمن من أسماء عربية/إنجليزية (100 حرف max) |
| `decodeCategorySegment(raw)` | فك ترميز URL آمن مع fallback |
| `buildCategorySlugSegment(id, slug)` | بناء صيغة `id-slug` |
| `parseCategorySlugSegment(segment)` | استخراج ID و slug من الـ segment مع تحقق UUID |

### Product Slug — `src/lib/products/product-slug.ts`

| الدالة | الوصف |
|--------|-------|
| `slugifyProductName(value)` | إنشاء slug آمن من اسم المنتج (200 حرف max) |
| `buildProductSlugSegment(id, slug)` | بناء صيغة `id-slug` |
| `parseProductSlugSegment(segment)` | استخراج ID و slug من الـ segment مع تحقق UUID |

---

## 34. نظام بناء الروابط (URL Utilities)

### Multi-Tenant URLs — `src/lib/tenant/urls.ts`

| الدالة | الوصف |
|--------|-------|
| `getProtocol()` | استخراج البروتوكول (http/https) من ENV |
| `getConfiguredRootDomain()` | استخراج النطاق الرئيسي من ENV |
| `hasUsableRootDomain()` | التحقق أن النطاق صالح (ليس localhost أو 127.0.0.1) |
| `normalizeStoreSlug(slug)` | تحقق من صيغة الـ slug (3-30 حرف، أرقام + حروف + شرطات) |
| `buildTenantDashboardHref(slug)` | بناء رابط الداشبورد: `slug.domain.com/dashboard` أو `/dashboard?store=slug` |
| `buildTenantStorefrontHref(slug)` | بناء رابط المتجر: `slug.domain.com` أو `/store?store=slug` |
| `getRootOrigin()` | الحصول على أصل النطاق الرئيسي مع بروتوكول |

### Store Path — `src/lib/tenant/store-path.ts`

بناء مسارات واجهة المتجر (storefront) التي تعمل في بيئتين مختلفتين:

```typescript
storePath('/product/abc', { storeSlug: 'ahmed' })
// Development (no wildcard): /store/product/abc
// Production (subdomain):    /product/abc
```

| الدالة | الوصف |
|--------|-------|
| `storePath(path, options?)` | بناء مسار المتجر مع دعم query params واكتشاف البيئة تلقائياً |

---

## 35. محرر بلوكات الصفحات (Page Blocks Editor)

**المسار**: `/dashboard/pages/[id]/edit`

محرر بصري لبناء الصفحات الثابتة (Landing Pages) باستخدام نظام بلوكات:

### أنواع البلوكات المدعومة

| النوع | الوصف |
|-------|-------|
| `hero` | بانر رئيسي |
| `text` | نص حر |
| `image` | صورة |
| `products` | عرض منتجات |
| `cta` | زر دعوة للإجراء (Call to Action) |

### المكونات

| المكون | المسار | الوصف |
|--------|--------|-------|
| `PageBlocksEditor` | `(dashboard)/dashboard/pages/[id]/edit/_components/page-blocks-editor.tsx` | مكون Client-side لتحرير البلوكات: إضافة، حذف، إعادة ترتيب، تغيير المحتوى والإعدادات |

### البنية

```typescript
type PageBlock = {
  id: string        // معرف فريد (crypto.randomUUID)
  type: 'hero' | 'text' | 'image' | 'products' | 'cta'
  content: Record<string, unknown>   // محتوى البلوك
  settings: Record<string, unknown>  // إعدادات العرض
  order: number     // ترتيب البلوك
}
```

---

## 36. مكون إشعار الخطة الأكثر شعبية (Most Popular Plan Notice)

**المسار**: `(super-admin)/super-admin/plans/_components/most-popular-plan-notice.tsx`

مكون Client-side يُستخدم في إنشاء/تعديل الخطط في لوحة الإدارة العليا:

- يعرض تحذيراً عند تفعيل "الأكثر شعبية" لخطة بينما خطة أخرى تحمل نفس العلامة حالياً
- يوضح أن تفعيل العلامة سيُلغيها تلقائياً من الخطة السابقة
- يعرض تفاصيل الخطة الحالية (الاسم، السعر، الحدود)
- يتعامل مع تنسيق الأسعار بالعربية (ج.م / شهر)

---

## 37. صفحة الـ Fallback للمسارات — `store/[slug]`

**المسار**: `src/app/store/[slug]/page.tsx`

صفحة catch-all ذكية تحاول حل مسارات غير معروفة في واجهة المتجر:

```
ahmed.matjary.com/xyz
    │
    ├── هل xyz تصنيف؟ → redirect إلى /category/xyz
    ├── هل xyz منتج؟ → redirect إلى /product/xyz
    ├── هل xyz صفحة ثابتة؟ → redirect إلى /page/xyz
    └── لا شيء؟ → 404 Not Found
```

تبحث بالتوازي (`Promise.all`) في: التصنيفات، المنتجات، الصفحات الثابتة — وتعمل redirect للمطابقة الأولى.

---

## 38. حالة تحميل صفحة المنتج (Product Loading)

**المسار**: `src/app/store/product/[slug]/loading.tsx`

هيكل تحميل (skeleton) لصفحة المنتج يعرض:
- صورة المنتج الرئيسية (skeleton)
- 4 صور مصغرة (thumbnails)
- اسم المنتج وسعره
- أزرار الكمية والإضافة للسلة
- تصميم responsive (شبكة عمودين على desktop)

---

## 39. ملف `src/lib/api/dashboard/categories.ts`

دوال مساعدة لإدارة Slugs التصنيفات في الداشبورد:

| الدالة | الوصف |
|--------|-------|
| `slugifyCategoryName(value)` | إنشاء slug من اسم التصنيف (عربي/إنجليزي، 100 حرف max) |
| `resolveUniqueCategorySlug(storeId, categoryName, options?)` | توليد slug فريد مع لاحقة رقمية عند التكرار — يدعم استثناء categoryId عند التعديل |

---

## 40. ملفات المشروع الجذرية (Root Config Files)

| الملف | الوصف |
|-------|-------|
| `drizzle.config.ts` | إعداد Drizzle ORM (connection, schema path) |
| `next.config.ts` | إعداد Next.js 15 |
| `tsconfig.json` | إعداد TypeScript (strict mode, `@/` paths) |
| `eslint.config.mjs` | قواعد ESLint |
| `postcss.config.mjs` | إعداد PostCSS لـ Tailwind |
| `package.json` | التبعيات والسكربتات |
| `package-lock.json` | قفل إصدارات التبعيات |
| `.npmrc` | `legacy-peer-deps=true` (مطلوب لـ React 19) |
| `.editorconfig` | إعداد محرر الكود (المسافات، الترميز) |
| `.gitignore` | ملفات مستثناة من Git |
| `.gitattributes` | إعدادات Git attributes |
| `next-env.d.ts` | أنواع Next.js التلقائية |
| `README.md` | ملف تعريف المشروع |

---

## 41. ملفات Public (الأصول الثابتة)

| الملف | الوصف |
|-------|-------|
| `public/placeholder.svg` | صورة بديلة (placeholder) |
| `public/file.svg` | أيقونة ملف |
| `public/globe.svg` | أيقونة كرة أرضية |
| `public/next.svg` | شعار Next.js |
| `public/vercel.svg` | شعار Vercel |
| `public/window.svg` | أيقونة نافذة |

---

## 42. ملفات الهجرة (Migrations)

7 ملفات SQL لهجرة قاعدة البيانات:

| الملف | الوصف |
|-------|-------|
| `migrations/dev1_tables.sql` | إنشاء الجداول الأساسية |
| `migrations/dev1_rls.sql` | سياسات Row-Level Security |
| `migrations/add_is_paid_to_stores.sql` | إضافة عمود isPaid للاشتراكات |
| `migrations/add_wallet_system.sql` | إضافة جدول المحفظة + عمود balance |
| `migrations/add_category_to_stores.sql` | إضافة عمود category للمتاجر |
| `migrations/add_most_popular_to_platform_plans.sql` | إضافة عمود isMostPopular للخطط |
| `migrations/add_order_shipping_coordinates.sql` | إضافة إحداثيات الشحن (latitude/longitude) |

---

## 43. ملفات التوثيق (Documentation)

```
docs/
├── complete-report.md                # التقرير الشامل (هذا الملف)
├── CONTRIBUTING.md                   # دليل المساهمة في المشروع
├── SETUP.md                          # دليل إعداد المشروع
├── architecture/
│   ├── overview.md                   # نظرة عامة على البنية المعمارية
│   ├── database-schema.md            # توثيق قاعدة البيانات
│   └── multi-tenancy.md              # توثيق نظام تعدد المستأجرين
├── DEV-1 Doc/
│   ├── Agent.md                      # توثيق الـ AI Agent
│   ├── dev1-plan.md                  # خطة عمل Dev 1
│   ├── dev1-testing-guide.md         # دليل اختبار Dev 1
│   ├── plan-subscription-payment.md  # خطة نظام الاشتراك
│   └── plan-wallet-order-fee.md      # خطة نظام المحفظة
├── guides/
│   ├── 20-rules-every-developer-must-know.md  # 20 قاعدة للمطورين
│   ├── ai-coding-rules.md            # قواعد الكتابة بالذكاء الاصطناعي
│   ├── api-contracts.md              # عقود الـ API
│   ├── components-convention.md      # اتفاقيات المكونات
│   ├── deployment.md                 # دليل النشر
│   ├── dev1-auth-middleware.md       # دليل المصادقة والـ Middleware
│   ├── dev2-dashboard.md             # دليل لوحة التحكم
│   ├── dev3-storefront.md            # دليل واجهة المتجر
│   └── known-issues-and-warnings.md  # المشاكل والتحذيرات المعروفة
└── phases/
    └── phase-checklist.md            # قائمة مراحل المشروع
```

---

> **نهاية التقرير** — آخر تحديث: 25 مارس 2026

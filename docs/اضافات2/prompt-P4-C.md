# Prompt — تنفيذ P4-C: أدوات زيادة المبيعات (Sales Boosters)

> انسخ كل المحتوى تحت هذا السطر والصقه في محادثة جديدة

---

أنت مطور خبير في Next.js و TypeScript. مطلوب منك تنفيذ **المرحلة P4-C** في منصة **Matjary** — منصة SaaS Multi-Tenant للتجارة الإلكترونية.

المرحلة P4-C تشمل **4 مميزات مترابطة** (أدوات urgency & sales boosting):
1. **حزم المنتجات (Product Bundles)** — جداول جديدة + CRUD + Checkout integration + Storefront display
2. **عداد تنازلي للعروض (Countdown Timer)** — بانر أعلى المتجر + عداد في صفحة المنتج + حقول sale dates
3. **إثبات اجتماعي (Social Proof Popup)** — popup يعرض آخر عمليات الشراء + API
4. **إشعار نفاد المخزون (Stock Alerts)** — تسجيل إشعار + إخطار تلقائي عند عودة المخزون

**دليل التنفيذ التفصيلي موجود في**: `docs/اضافات2/تنفيذ-P4-C-أدوات-زيادة-المبيعات.md`
اقرأه بالكامل أولاً — فيه كل الكود والـ schemas والـ API routes والـ migration جاهزين. نفّذ كل اللي فيه بالظبط.

---

## معلومات المشروع

### الـ Stack

| التقنية | الإصدار | ملاحظات |
|---------|---------|---------|
| Next.js | 15.5.12 | App Router — Server Components default |
| React | 19.1.4 | `'use client'` عند الحاجة فقط |
| TypeScript | 5 | Strict mode |
| Drizzle ORM | 0.45.1 | PostgreSQL (Supabase) |
| Clerk | 6.37.5 | **للتجار فقط** — لا تلمسه |
| Zod | 4.3.6 | **v4 syntax** — `z.object({})` |
| Zustand | 5.0.11 | State management مع `persist` |
| jose | للعملاء | JWT مستقل عن Clerk (P4-A) |
| Tailwind CSS | 4 | RTL-first, Arabic UI |
| lucide-react | 0.574.0 | Icons |
| nanoid | 5.1.6 | ID generation |

### هيكل المجلدات الأساسي

```
src/
├── app/
│   ├── (dashboard)/          # لوحة تحكم التاجر (Clerk auth)
│   │   └── dashboard/
│   │       ├── bundles/      # ❌ جديد P4-C
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/edit/page.tsx
│   │       ├── products/     # ✅ موجود — تعديل: saleStartsAt/saleEndsAt
│   │       ├── reviews/      # ✅ موجود (P4-B)
│   │       └── settings/     # ✅ موجود — تعديل: حقول P4-C
│   ├── (platform)/           # الصفحات العامة
│   ├── (super-admin)/        # إدارة المنصة
│   ├── api/
│   │   ├── checkout/route.ts             # ✅ موجود — تعديل: bundle discount
│   │   ├── dashboard/
│   │   │   ├── bundles/                  # ❌ جديد P4-C
│   │   │   │   ├── route.ts             # GET + POST
│   │   │   │   └── [id]/route.ts        # GET + PUT + DELETE
│   │   │   ├── products/[id]/route.ts    # ✅ موجود — تعديل: auto stock alert trigger
│   │   │   ├── settings/route.ts         # ✅ موجود — تعديل: حقول P4-C
│   │   │   └── stock-alerts/             # ❌ جديد P4-C
│   │   │       └── notify/[productId]/route.ts
│   │   └── storefront/
│   │       ├── bundles/                  # ❌ جديد P4-C
│   │       │   ├── route.ts             # GET active bundles
│   │       │   └── [slug]/route.ts      # GET bundle details
│   │       ├── social-proof/route.ts     # ❌ جديد P4-C
│   │       └── stock-alerts/             # ❌ جديد P4-C
│   │           ├── route.ts             # POST register alert
│   │           └── count/[productId]/route.ts  # GET waiting count
│   ├── auth/                 # Clerk auth (تجار)
│   └── store/                # واجهة المتجر (storefront)
│       ├── layout.tsx            # ✅ تعديل: + CountdownBanner + SocialProofPopup
│       ├── page.tsx              # ✅ تعديل: + BundlesSection
│       ├── product/[slug]/
│       │   ├── page.tsx          # ✅ تعديل: + ProductSaleCountdown + StockAlertForm
│       │   └── _components/
│       │       ├── product-details.tsx    # ✅ موجود
│       │       ├── product-sale-countdown.tsx  # ❌ جديد P4-C
│       │       └── stock-alert-form.tsx   # ❌ جديد P4-C
│       └── _components/
│           ├── product-card.tsx           # ✅ موجود
│           ├── bundle-card.tsx            # ❌ جديد P4-C
│           ├── bundles-section.tsx        # ❌ جديد P4-C
│           ├── countdown-timer.tsx        # ❌ جديد P4-C
│           ├── countdown-banner.tsx       # ❌ جديد P4-C
│           ├── social-proof-popup.tsx     # ❌ جديد P4-C
│           ├── store-header.tsx
│           └── store-footer.tsx
├── components/
│   └── ui/
├── db/
│   ├── index.ts
│   └── schema.ts             # ✅ تعديل: + 3 جداول + StoreSettings P4-C
├── lib/
│   ├── api/
│   │   ├── response.ts       # apiSuccess, ApiErrors, handleApiError
│   │   └── rate-limit.ts     # rateLimit, getClientIp
│   ├── email/
│   │   ├── resend.ts         # sendEmail()
│   │   └── templates/
│   │       └── stock-alert.tsx    # ❌ جديد P4-C (اختياري — يمكن inline HTML)
│   ├── stock-alerts/
│   │   └── notify-stock-alerts.ts # ❌ جديد P4-C
│   ├── stores/
│   │   └── cart-store.ts
│   ├── tenant/
│   │   ├── store-context.tsx
│   │   └── get-current-store.ts
│   ├── validations/
│   │   ├── store.ts           # ✅ تعديل: حقول P4-C
│   │   └── product.ts         # ✅ تعديل: saleStartsAt, saleEndsAt
│   └── utils.ts
└── middleware.ts
```

---

## الأنماط الموجودة (اتبعها بالضبط)

### 1. API Response Pattern

```typescript
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

return apiSuccess({ data: result })              // 200
return apiSuccess({ data: result }, 201)          // 201
return ApiErrors.unauthorized()                   // 401
return ApiErrors.notFound('المنتج')               // 404
return ApiErrors.validation('الاسم مطلوب')         // 422
return apiError('رسالة الخطأ', 400)               // Custom error

// في catch:
return handleApiError(error)
```

### 2. Rate Limit Pattern

```typescript
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const ip = getClientIp(request)
const { allowed } = rateLimit(`stock-alert:${ip}`, { maxRequests: 10, windowSeconds: 300 })
if (!allowed) return apiError('حاول مرة أخرى بعد قليل', 429)
```

### 3. Store Authentication for Dashboard APIs

```typescript
import { verifyStoreOwnership } from '@/lib/api/auth'

const { store } = await verifyStoreOwnership()
if (!store) return ApiErrors.unauthorized()
```

### 4. Store Detection for Storefront APIs

```typescript
import { getCurrentStore } from '@/lib/tenant/get-current-store'

const store = await getCurrentStore()
if (!store) return apiError('المتجر غير موجود', 404)
```

### 5. Fire-and-Forget Pattern

```typescript
// لأي عملية مش حرجة (emails, notifications):
someAsyncFunction().catch(() => {})

// أو مع dynamic import:
import('@/lib/some-module').then(({ someFunction }) =>
  someFunction(args).catch((err) => console.error('[Module] Error:', err))
).catch(() => {})
```

### 6. Email Sending Pattern

```typescript
import { sendEmail } from '@/lib/email/resend'

sendEmail({
  to: 'customer@example.com',
  subject: '🎉 المنتج رجع متوفر!',
  html: '<div dir="rtl">...</div>',
}).catch(() => {})
```

---

## ما هو موجود بالفعل (لا تعيد بناءه)

### Schema — الموجود

- `storeProducts` table — كل الأعمدة الحالية (price, compareAtPrice, stock, images, variants, etc.)
- `storeOrders` + `storeOrderItems` — الطلبات والعناصر
- `storeReviews` — المراجعات (P4-B)
- `storeCustomerAccounts` — حسابات العملاء (P4-A)
- `stores.settings` (JSONB) — كل الحقول حتى P4-B

### Checkout — الموجود

- `src/app/api/checkout/route.ts` — يدعم: stock checks, coupons, loyalty points, affiliates, CAPI, Kashier
- يحتاج **تعديل** لدعم `bundleId` و bundle discount

### Store Layout — الموجود

```tsx
// src/app/store/layout.tsx — يعرض حالياً:
<StoreHeader />
<main>{children}</main>
<StoreFooter />
<WhatsAppFloatingButton />
<ExitIntentPopup />
{pwaEnabled && <PwaInstallBanner />}
```

يحتاج **إضافة**: `<CountdownBanner />` قبل `<StoreHeader />` + `<SocialProofPopup />` بعد `<PwaInstallBanner />`

### Product Update API — الموجود

- `src/app/api/dashboard/products/[id]/route.ts` — PUT handler يحدّث كل حقول المنتج
- يحتاج **إضافة**: دعم `saleStartsAt`/`saleEndsAt` + auto-trigger stock alerts عند تحديث المخزون

---

## ما هو مطلوب تنفيذه (P4-C)

### ملخص التغييرات

```
ملفات جديدة (20):
  src/app/api/dashboard/bundles/route.ts
  src/app/api/dashboard/bundles/[id]/route.ts
  src/app/api/storefront/bundles/route.ts
  src/app/api/storefront/bundles/[slug]/route.ts
  src/app/api/storefront/social-proof/route.ts
  src/app/api/storefront/stock-alerts/route.ts
  src/app/api/storefront/stock-alerts/count/[productId]/route.ts
  src/app/api/dashboard/stock-alerts/notify/[productId]/route.ts
  src/app/(dashboard)/dashboard/bundles/page.tsx
  src/app/(dashboard)/dashboard/bundles/new/page.tsx
  src/app/(dashboard)/dashboard/bundles/new/_components/bundle-form.tsx
  src/app/(dashboard)/dashboard/bundles/[id]/edit/page.tsx
  src/app/store/_components/bundle-card.tsx
  src/app/store/_components/bundles-section.tsx
  src/app/store/_components/countdown-timer.tsx
  src/app/store/_components/countdown-banner.tsx
  src/app/store/product/[slug]/_components/product-sale-countdown.tsx
  src/app/store/_components/social-proof-popup.tsx
  src/app/store/product/[slug]/_components/stock-alert-form.tsx
  src/lib/stock-alerts/notify-stock-alerts.ts

ملفات معدّلة (7):
  src/db/schema.ts                                 → + 3 جداول + StoreSettings P4-C + relations + saleStartsAt/saleEndsAt
  src/lib/validations/store.ts                     → + حقول P4-C
  src/lib/validations/product.ts                   → + saleStartsAt, saleEndsAt
  src/app/api/checkout/route.ts                    → + bundle discount
  src/app/api/dashboard/products/[id]/route.ts     → + auto stock alert trigger + saleStartsAt/saleEndsAt
  src/app/store/layout.tsx                         → + CountdownBanner + SocialProofPopup
  src/app/store/page.tsx                           → + BundlesSection

Migration (1):
  migrations/p4c_sales_boosters.sql
```

---

## StoreSettings الحالي

الحقول التالية **موجودة بالفعل**. لا تعيد إضافتها:

```typescript
export type StoreSettings = {
  // Basic
  currency: string
  language: 'ar' | 'en'
  direction: 'rtl' | 'ltr'
  showOutOfStock: boolean
  requirePhone: boolean
  requireEmail: boolean
  minOrderAmount: number | null
  maxOrderAmount: number | null
  enableCod: boolean
  enableKashier: boolean
  kashierMerchantId: string | null

  // Tracking Pixels
  facebookPixelId: string | null
  facebookConversionApiToken: string | null
  facebookTestEventCode: string | null
  facebookConversionApiEnabled: boolean
  tiktokPixelId: string | null
  googleAnalyticsId: string | null
  snapchatPixelId: string | null

  // WhatsApp
  whatsappFloatingEnabled: boolean
  whatsappFloatingPosition: 'left' | 'right'
  whatsappDefaultMessage: string | null
  whatsappOrderButtonEnabled: boolean

  // Email
  emailNotificationsEnabled: boolean
  merchantEmailOnNewOrder: boolean

  // P1
  fakeOrderBlockerEnabled: boolean
  fakeOrderMinTrustScore: number
  fakeOrderAutoReject: boolean
  abandonedCartEnabled: boolean
  abandonedCartDelayMinutes: number
  abandonedCartMessage: string | null
  abandonedCartChannel: 'whatsapp' | 'email' | 'both'
  exitIntentEnabled: boolean
  exitIntentMessage: string | null
  exitIntentCouponCode: string | null
  exitIntentPages: string[]

  // P2
  aiEnabled: boolean
  aiInsightsEnabled: boolean

  // P3
  blogEnabled: boolean
  pwaEnabled: boolean
  loyaltyEnabled: boolean
  loyaltyPointsPerEgp: number
  loyaltyPointValue: number
  loyaltyMinRedemption: number
  loyaltyMaxRedemptionPercent: number
  affiliateEnabled: boolean
  affiliateDefaultCommission: number
  dropshippingEnabled: boolean
  defaultLanguage: 'ar' | 'en'
  supportedLanguages: string[]

  // P4-A
  customerAccountsEnabled: boolean
  customerAuthMethods: ('phone' | 'email')[]
  requireAccountForCheckout: boolean
  guestCheckoutAllowed: boolean
  wishlistEnabled: boolean
  wishlistGuestMode: boolean
  quickCheckoutEnabled: boolean
  quickCheckoutMode: 'redirect' | 'modal'
  skipCartEnabled: boolean

  // P4-B: Reviews
  reviewsEnabled: boolean
  reviewAutoApprove: boolean
  reviewImagesAllowed: boolean
  reviewImagesMax: number
  autoReviewRequestEnabled: boolean
  reviewRequestDelay: number
  reviewRequestChannel: 'email' | 'whatsapp' | 'both'
  reviewLoyaltyPoints: number
  facebookConversionApiEnabled: boolean
}
```

**أضف حقول P4-C الجديدة** (في آخر النوع):

```typescript
  // === P4-C: Countdown Timer ===
  countdownBannerEnabled: boolean        // default: false
  countdownBannerText: string | null     // default: null
  countdownBannerEndDate: string | null  // default: null — ISO date string
  countdownBannerBgColor: string         // default: '#ef4444'
  countdownBannerTextColor: string       // default: '#ffffff'

  // === P4-C: Social Proof ===
  socialProofEnabled: boolean            // default: false
  socialProofInterval: number            // default: 30
  socialProofDuration: number            // default: 5
  socialProofPosition: 'bottom-left' | 'bottom-right'  // default: 'bottom-left'

  // === P4-C: Stock Alerts ===
  stockAlertsEnabled: boolean            // default: true

  // === P4-C: Bundles ===
  bundlesEnabled: boolean                // default: true
```

**الـ default values:**

```typescript
  countdownBannerEnabled: false,
  countdownBannerText: null,
  countdownBannerEndDate: null,
  countdownBannerBgColor: '#ef4444',
  countdownBannerTextColor: '#ffffff',
  socialProofEnabled: false,
  socialProofInterval: 30,
  socialProofDuration: 5,
  socialProofPosition: 'bottom-left',
  stockAlertsEnabled: true,
  bundlesEnabled: true,
```

---

## جداول قاعدة البيانات الجديدة

### storeBundles (جديد P4-C)

```typescript
export const storeBundles = pgTable('store_bundles', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  discountType: text('discount_type').notNull(), // 'percentage' | 'fixed' | 'custom_price'
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  customPrice: decimal('custom_price', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_bundle_store_slug').on(table.storeId, table.slug),
  index('idx_bundles_store').on(table.storeId),
])
```

### storeBundleItems (جديد P4-C)

```typescript
export const storeBundleItems = pgTable('store_bundle_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  bundleId: uuid('bundle_id').references(() => storeBundles.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => storeProducts.id, { onDelete: 'cascade' }).notNull(),
  variantId: text('variant_id'),
  quantity: integer('quantity').default(1).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  uniqueIndex('uniq_bundle_item').on(table.bundleId, table.productId, table.variantId),
  index('idx_bundle_items_bundle').on(table.bundleId),
])
```

### storeStockAlerts (جديد P4-C)

```typescript
export const storeStockAlerts = pgTable('store_stock_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => storeProducts.id, { onDelete: 'cascade' }).notNull(),
  variantId: text('variant_id'),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  customerAccountId: uuid('customer_account_id'),
  status: text('status').default('waiting').notNull(), // 'waiting' | 'notified' | 'expired'
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_stock_alerts_product').on(table.storeId, table.productId, table.status),
  uniqueIndex('uniq_stock_alert').on(table.storeId, table.productId, table.variantId, table.customerPhone),
])
```

### storeProducts — تعديل (أضف هذين العمودين)

```typescript
  // P4-C: Sale countdown
  saleStartsAt: timestamp('sale_starts_at', { withTimezone: true }),
  saleEndsAt: timestamp('sale_ends_at', { withTimezone: true }),
```

---

## خطوات التنفيذ (نفّذ بالترتيب)

### الخطوة 0: تعديل Schema
1. أضف حقول P4-C في `StoreSettings` type + default values
2. أضف `saleStartsAt` و `saleEndsAt` في `storeProducts` table
3. أضف جدول `storeBundles` + `storeBundleItems` + `storeStockAlerts`
4. أضف Relations لكل الجداول الجديدة
5. أضف `bundles` و `stockAlerts` في `storesRelations` و `storeProductsRelations`

### الخطوة 1: Validations
أضف حقول P4-C في `updateStoreSettingsSchema`:
```typescript
  countdownBannerEnabled: z.boolean().optional(),
  countdownBannerText: z.string().max(200).trim().nullable().optional(),
  countdownBannerEndDate: z.string().max(30).trim().nullable().optional(),
  countdownBannerBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  countdownBannerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  socialProofEnabled: z.boolean().optional(),
  socialProofInterval: z.number().int().min(10).max(300).optional(),
  socialProofDuration: z.number().int().min(3).max(30).optional(),
  socialProofPosition: z.enum(['bottom-left', 'bottom-right']).optional(),
  stockAlertsEnabled: z.boolean().optional(),
  bundlesEnabled: z.boolean().optional(),
```

أضف في `updateProductSchema`:
```typescript
  saleStartsAt: z.string().nullable().optional(),
  saleEndsAt: z.string().nullable().optional(),
```

### الخطوة 2: Bundle APIs (Dashboard + Storefront)
1. أنشئ `src/app/api/dashboard/bundles/route.ts` — GET + POST
2. أنشئ `src/app/api/dashboard/bundles/[id]/route.ts` — GET + PUT + DELETE
3. أنشئ `src/app/api/storefront/bundles/route.ts` — GET active bundles
4. أنشئ `src/app/api/storefront/bundles/[slug]/route.ts` — GET bundle details

### الخطوة 3: Bundle Dashboard Pages
1. أنشئ `src/app/(dashboard)/dashboard/bundles/page.tsx`
2. أنشئ `src/app/(dashboard)/dashboard/bundles/new/page.tsx` + `BundleForm`
3. أنشئ `src/app/(dashboard)/dashboard/bundles/[id]/edit/page.tsx`

### الخطوة 4: Bundle Storefront Components
1. أنشئ `src/app/store/_components/bundle-card.tsx`
2. أنشئ `src/app/store/_components/bundles-section.tsx`
3. عدّل `src/app/store/page.tsx` — أضف BundlesSection

### الخطوة 5: Checkout Integration (Bundles)
عدّل `src/app/api/checkout/route.ts`:
- أضف `bundleId` في item schema
- أضف bundle discount calculation في الـ transaction

### الخطوة 6: Countdown Timer
1. أنشئ `src/app/store/_components/countdown-timer.tsx` (reusable)
2. أنشئ `src/app/store/_components/countdown-banner.tsx`
3. أنشئ `src/app/store/product/[slug]/_components/product-sale-countdown.tsx`
4. عدّل `src/app/store/layout.tsx` — أضف CountdownBanner قبل StoreHeader
5. عدّل صفحة المنتج — أضف ProductSaleCountdown عند وجود saleEndsAt

### الخطوة 7: Social Proof Popup
1. أنشئ `src/app/api/storefront/social-proof/route.ts`
2. أنشئ `src/app/store/_components/social-proof-popup.tsx`
3. عدّل `src/app/store/layout.tsx` — أضف SocialProofPopup

### الخطوة 8: Stock Alerts
1. أنشئ `src/app/api/storefront/stock-alerts/route.ts` — POST register
2. أنشئ `src/app/api/storefront/stock-alerts/count/[productId]/route.ts` — GET count
3. أنشئ `src/app/api/dashboard/stock-alerts/notify/[productId]/route.ts` — POST manual notify
4. أنشئ `src/lib/stock-alerts/notify-stock-alerts.ts` — helper for auto-trigger
5. أنشئ `src/app/store/product/[slug]/_components/stock-alert-form.tsx`
6. عدّل `src/app/api/dashboard/products/[id]/route.ts`:
   - أضف `stock` في select الأوّلي
   - أضف `saleStartsAt`/`saleEndsAt` في update
   - أضف auto-trigger stock alerts عند stock goes from 0 to positive
7. عدّل صفحة المنتج — أضف StockAlertForm عند stock <= 0

### الخطوة 9: SQL Migration
أنشئ `migrations/p4c_sales_boosters.sql` — 3 جداول + 2 أعمدة + RLS policies

---

## قواعد مهمة

1. **كل المميزات الأربعة جديدة 100%** — لا يوجد كود مسبق لأي منها
2. **لا تلمس Clerk** — Clerk للتجار فقط
3. **RTL + عربي** — كل الـ UI بالعربي، RTL direction
4. **Zod v4** — استخدم `z.object({})` syntax
5. **`import 'server-only'`** — في كل ملف فيه DB queries أو secrets
6. **`'use client'`** — بس للمكوّنات اللي فيها hooks أو events
7. **استخدم `@/` للـ imports** — مش relative paths
8. **handleApiError في كل catch**
9. **Rate limit على Storefront APIs** — خصوصاً stock-alerts
10. **Fire-and-forget للإيميلات** — لا تعطّل الـ response بسبب إرسال إيميل
11. **Bundle discount فوق الـ coupon discount** — يتحسبوا مع بعض
12. **Privacy في Social Proof** — الاسم الأول فقط + المحافظة (مش العنوان الكامل)
13. **Auto-trigger stock alert** — بس لما المخزون يتغير من 0 إلى رقم موجب

# Prompt — تنفيذ P4-B: التتبع والثقة والمراجعات

> انسخ كل المحتوى تحت هذا السطر والصقه في محادثة جديدة

---

أنت مطور خبير في Next.js و TypeScript. مطلوب منك تنفيذ **المرحلة P4-B** في منصة **Matjary** — منصة SaaS Multi-Tenant للتجارة الإلكترونية.

المرحلة P4-B تشمل **3 مميزات مترابطة**:
1. **Facebook Conversion API — تكملة** — إضافة أحداث server-side ناقصة + event deduplication + Lead event
2. **نظام المراجعات — التوسع والأتمتة** — طلب تقييم تلقائي بعد التوصيل + صفحة تقييم بالتوكن + نجوم في Product Card
3. **صفحة تتبع الطلب — تحسينات** — روابط شركات الشحن + تعبئة تلقائية من URL + رابط التتبع في الإيميل

**دليل التنفيذ التفصيلي موجود في**: `docs/اضافات2/تنفيذ-P4-B-التتبع-والثقة-والمراجعات.md`
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
│   ├── (platform)/           # الصفحات العامة
│   ├── (super-admin)/        # إدارة المنصة
│   ├── api/
│   │   ├── checkout/         # Checkout API — يبعت Purchase CAPI
│   │   ├── dashboard/
│   │   │   ├── orders/[id]/status/  # تحديث حالة الطلب
│   │   │   ├── reviews/             # إدارة المراجعات
│   │   │   └── settings/            # إعدادات المتجر
│   │   ├── payments/
│   │   │   └── kashier/webhook/     # Kashier payment webhook
│   │   └── storefront/
│   │       ├── abandoned-cart/      # حفظ السلة المتروكة
│   │       ├── capi/track/          # CAPI tracking API (ViewContent, AddToCart, etc.)
│   │       ├── reviews/             # GET + POST reviews
│   │       │   └── [id]/helpful/    # "مفيد" +1
│   │       └── track/               # تتبع الطلب API
│   ├── auth/                 # Clerk auth (تجار)
│   └── store/                # واجهة المتجر (storefront)
│       ├── layout.tsx
│       ├── checkout/         # صفحة Checkout
│       ├── product/[slug]/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── product-details.tsx
│       │       └── product-reviews.tsx  # ✅ موجود
│       ├── track/
│       │   ├── page.tsx              # ✅ موجود
│       │   └── _components/
│       │       └── track-order.tsx    # ✅ موجود
│       ├── review/[token]/           # ❌ جديد P4-B
│       │   ├── page.tsx
│       │   └── _components/
│       │       └── token-review-form.tsx
│       └── _components/
│           ├── product-card.tsx       # تعديل: إضافة النجوم
│           ├── store-header.tsx
│           └── store-footer.tsx
├── components/
│   ├── tracking/
│   │   ├── tracking-scripts.tsx      # ✅ يجمع كل tracking scripts
│   │   └── facebook-pixel-script.tsx # ✅ Base code + PageView
│   └── ui/
├── db/
│   ├── index.ts
│   └── schema.ts             # ✅ storeReviews محسّن بالفعل
├── lib/
│   ├── api/
│   │   ├── response.ts       # apiSuccess, ApiErrors, handleApiError
│   │   └── rate-limit.ts     # rateLimit, getClientIp
│   ├── email/
│   │   ├── resend.ts         # sendEmail()
│   │   └── templates/
│   │       ├── order-shipped.tsx     # ✅ موجود — تعديل: إضافة رابط التتبع
│   │       ├── order-delivered.tsx   # ✅ موجود
│   │       └── review-request.tsx    # ❌ جديد P4-B
│   ├── reviews/
│   │   └── create-review-request.ts  # ❌ جديد P4-B
│   ├── queries/
│   │   └── product-ratings.ts        # ❌ جديد P4-B
│   ├── shipping/
│   │   └── tracking-urls.ts          # ❌ جديد P4-B
│   ├── tracking/
│   │   ├── facebook-capi.ts          # ✅ موجود — تعديل: v25.0 + Lead type
│   │   ├── facebook-pixel.ts         # ✅ موجود — لا يتغير
│   │   ├── hash-user-data.ts         # ❌ جديد P4-B
│   │   └── event-deduplication.ts    # ❌ جديد P4-B
│   ├── stores/
│   │   └── cart-store.ts
│   ├── tenant/
│   │   └── store-context.tsx
│   ├── validations/
│   │   ├── store.ts           # تعديل: إضافة حقول P4-B
│   │   └── order.ts
│   ├── sanitize-html.ts
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
const { allowed } = rateLimit(`review:${ip}`, { maxRequests: 5, windowSeconds: 300 })
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
// لأي عملية مش حرجة (CAPI, emails, loyalty points):
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
  subject: '⭐ قيّم تجربتك',
  react: ReviewRequestEmail({ storeName, customerName, reviewUrl }),
}).catch(() => {})
```

---

## ما هو موجود بالفعل (لا تعيد بناءه)

### Facebook CAPI — الموجود ✅

- `src/lib/tracking/facebook-capi.ts` — `sendConversionEvent()` كامل مع SHA-256 hashing
- `src/lib/tracking/facebook-pixel.ts` — Client-side: `trackViewContent`, `trackAddToCart`, `trackInitiateCheckout`, `trackPurchase`, `trackSearch`
- `src/components/tracking/facebook-pixel-script.tsx` — حقن base code
- `src/app/api/storefront/capi/track/route.ts` — API لإرسال ViewContent, AddToCart, InitiateCheckout, Search من Client
- `src/app/api/checkout/route.ts` — يبعت Purchase CAPI event (fire-and-forget)
- StoreSettings: `facebookPixelId`, `facebookConversionApiToken`, `facebookTestEventCode`, `facebookConversionApiEnabled`

### المراجعات — الموجود ✅

- `storeReviews` table مع كل الأعمدة المحسّنة: `customerAccountId`, `isVerifiedPurchase`, `images` (JSONB), `merchantReply`, `merchantReplyAt`, `helpfulCount`, `orderId`
- `src/app/api/storefront/reviews/route.ts` — GET (paginated + summary + distribution) + POST (verified purchase check + auto-approve)
- `src/app/api/storefront/reviews/[id]/helpful/route.ts` — "مفيد" +1
- `src/app/api/dashboard/reviews/route.ts` + `[id]/route.ts` — إدارة المراجعات كاملة
- `src/app/(dashboard)/dashboard/reviews/` — صفحة الداشبورد (approve/reject/reply/delete/search/stats)
- `src/app/store/product/[slug]/_components/product-reviews.tsx` — عرض المراجعات + ملخص + نموذج + images + merchant reply + helpful
- StoreSettings: `reviewsEnabled`, `reviewAutoApprove`, `reviewImagesAllowed`, `reviewImagesMax`

### تتبع الطلب — الموجود ✅

- `src/app/store/track/page.tsx` + `_components/track-order.tsx` — صفحة كاملة مع form + timeline + items
- `src/app/api/storefront/track/route.ts` — Rate limit + phone verification + timeline builder
- `src/app/api/dashboard/orders/[id]/status/route.ts` — تحديث الحالة + إيميلات الشحن/التوصيل

---

## ما هو مطلوب تنفيذه (P4-B)

### ملخص التغييرات

```
ملفات جديدة (9):
  src/lib/tracking/hash-user-data.ts
  src/lib/tracking/event-deduplication.ts
  src/lib/reviews/create-review-request.ts
  src/lib/email/templates/review-request.tsx
  src/app/store/review/[token]/page.tsx
  src/app/store/review/[token]/_components/token-review-form.tsx
  src/app/api/storefront/reviews/submit-by-token/route.ts
  src/lib/queries/product-ratings.ts
  src/lib/shipping/tracking-urls.ts

ملفات معدّلة (13):
  src/db/schema.ts                              → + StoreSettings P4-B + storeReviewRequests table + relations
  src/lib/validations/store.ts                  → + حقول P4-B
  src/lib/tracking/facebook-capi.ts             → v25.0 + 'Lead' type
  src/app/store/product/[slug]/page.tsx         → + ViewContent CAPI server-side
  src/app/store/checkout/page.tsx               → + InitiateCheckout CAPI server-side
  src/app/api/storefront/abandoned-cart/route.ts → + Lead CAPI event
  src/app/api/payments/kashier/webhook/route.ts  → + Purchase CAPI event
  src/app/api/dashboard/orders/[id]/status/route.ts → + auto review request on delivery
  src/app/store/_components/product-card.tsx     → + النجوم
  src/app/store/product/[slug]/_components/product-reviews.tsx → + فلترة بالنجوم
  src/app/api/storefront/reviews/route.ts       → + دعم فلترة rating param
  src/app/store/track/_components/track-order.tsx → + تعبئة تلقائية + رابط تتبع
  src/lib/email/templates/order-shipped.tsx      → + رابط التتبع

Migration (1):
  migrations/p4b_review_requests.sql
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
  facebookConversionApiEnabled: boolean  // ← موجود
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

  // Reviews (موجود)
  reviewsEnabled: boolean
  reviewAutoApprove: boolean
  reviewImagesAllowed: boolean
  reviewImagesMax: number
}
```

**أضف حقول P4-B الجديدة** (في آخر النوع):

```typescript
  // === P4-B: Auto Review Request ===
  autoReviewRequestEnabled: boolean      // default: true
  reviewRequestDelay: number             // default: 2 — ساعات بعد التوصيل
  reviewRequestChannel: 'email' | 'whatsapp' | 'both'  // default: 'email'
  reviewLoyaltyPoints: number            // default: 5 — نقاط ولاء مقابل التقييم
```

**وفي الـ default values:**

```typescript
  autoReviewRequestEnabled: true,
  reviewRequestDelay: 2,
  reviewRequestChannel: 'email',
  reviewLoyaltyPoints: 5,
```

---

## الـ facebook-capi.ts الحالي (لا تعيد كتابته)

```typescript
// الملف الحالي src/lib/tracking/facebook-capi.ts:
// - SHA-256 hashing لـ email + phone
// - CAPIEventName: PageView | ViewContent | AddToCart | InitiateCheckout | Purchase | Search
// - sendConversionEvent(config, event, userData, customData, eventSourceUrl, eventId?)
// - يُرسل event_id لو موجود (dedup)
// - يدعم test_event_code
// - Graph API version: v21.0

// التعديلات المطلوبة:
// 1. تحديث GRAPH_API_VERSION من 'v21.0' إلى 'v25.0'
// 2. إضافة 'Lead' لـ CAPIEventName
```

---

## جداول قاعدة البيانات المرتبطة

### storeReviews (موجود — لا تعدّله)

```typescript
export const storeReviews = pgTable('store_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => storeProducts.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => storeOrders.id, { onDelete: 'set null' }),
  customerAccountId: uuid('customer_account_id').references(() => storeCustomerAccounts.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  images: jsonb('images').$type<string[]>().default([]),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  isApproved: boolean('is_approved').default(false),
  merchantReply: text('merchant_reply'),
  merchantReplyAt: timestamp('merchant_reply_at', { withTimezone: true }),
  helpfulCount: integer('helpful_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### storeOrders (موجود — لا تعدّله)

الأعمدة ذات الصلة بـ P4-B:
- `id`, `storeId`, `orderNumber`
- `customerName`, `customerPhone`, `customerEmail`
- `orderStatus`: `'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'`
- `trackingNumber`, `shippingCompany`
- `createdAt`, `shippedAt`, `deliveredAt`, `cancelledAt`
- `total`, `paymentMethod`, `paymentStatus`

### storeOrderItems (موجود — لا تعدّله)

الأعمدة ذات الصلة:
- `id`, `orderId`, `productId`
- `name`, `image`, `price`, `total`, `quantity`

---

## خطوات التنفيذ (نفّذ بالترتيب)

### الخطوة 0: تعديل Schema
1. أضف حقول P4-B في `StoreSettings` type + default values
2. أضف جدول `storeReviewRequests` في `src/db/schema.ts`
3. أضف `storeReviewRequestsRelations`
4. حدّث `storesRelations` بإضافة `reviewRequests: many(storeReviewRequests)`

### الخطوة 1: تعديل facebook-capi.ts
1. غيّر `GRAPH_API_VERSION` من `'v21.0'` لـ `'v25.0'`
2. أضف `| 'Lead'` لنوع `CAPIEventName`

### الخطوة 2: ملفات CAPI الجديدة
1. أنشئ `src/lib/tracking/hash-user-data.ts` — `hashForCAPI()`, `formatPhoneForCAPI()`, `buildCAPIUserData()`
2. أنشئ `src/lib/tracking/event-deduplication.ts` — `generateEventId()`, `generatePurchaseEventId()`, `generateProductEventId()`, `generateCheckoutEventId()`

### الخطوة 3: إضافة CAPI Events
1. في `src/app/store/product/[slug]/page.tsx` — أضف ViewContent CAPI (fire-and-forget في Server Component)
2. في `src/app/store/checkout/page.tsx` — أضف InitiateCheckout CAPI
3. في `src/app/api/storefront/abandoned-cart/route.ts` — أضف Lead CAPI
4. في `src/app/api/payments/kashier/webhook/route.ts` — أضف Purchase CAPI (with dedup via orderNumber)

### الخطوة 4: Validations
أضف حقول P4-B في `updateStoreSettingsSchema`:
```typescript
autoReviewRequestEnabled: z.boolean().optional(),
reviewRequestDelay: z.number().int().min(1).max(72).optional(),
reviewRequestChannel: z.enum(['email', 'whatsapp', 'both']).optional(),
reviewLoyaltyPoints: z.number().int().min(0).max(100).optional(),
```

### الخطوة 5: Auto Review Request
1. أنشئ `src/lib/reviews/create-review-request.ts`
2. أنشئ `src/lib/email/templates/review-request.tsx`
3. عدّل `src/app/api/dashboard/orders/[id]/status/route.ts` — أضف بعد section الإيميلات:
   - عند `orderStatus === 'delivered'` → `createReviewRequest(...)` fire-and-forget

### الخطوة 6: صفحة التقييم بالتوكن
1. أنشئ `src/app/store/review/[token]/page.tsx` — Server Component يتحقق من التوكن + جلب بيانات الطلب
2. أنشئ `src/app/store/review/[token]/_components/token-review-form.tsx` — Client Component يعرض المنتجات مع نموذج تقييم
3. أنشئ `src/app/api/storefront/reviews/submit-by-token/route.ts` — يقبل التوكن + المراجعات + `isVerifiedPurchase = true` + نقاط ولاء

### الخطوة 7: النجوم في Product Card
1. أنشئ `src/lib/queries/product-ratings.ts` — `getProductRatings(storeId, productIds)`
2. عدّل `src/app/store/_components/product-card.tsx` — أضف `avgRating` + `totalReviews` props + عرض النجوم

### الخطوة 8: فلترة المراجعات
1. عدّل `src/app/store/product/[slug]/_components/product-reviews.tsx` — أضف state `filterRating` + زرائر فلترة
2. عدّل `src/app/api/storefront/reviews/route.ts` — أضف `rating` query param في GET handler

### الخطوة 9: تحسينات تتبع الطلب
1. أنشئ `src/lib/shipping/tracking-urls.ts` — روابط تتبع شركات الشحن
2. عدّل `src/app/store/track/_components/track-order.tsx` — تعبئة تلقائية من `?order=` + زر "تتبع الشحنة ↗"
3. عدّل `src/lib/email/templates/order-shipped.tsx` — أضف `storeSlug` prop + رابط "تتبع طلبك"

### الخطوة 10: SQL Migration
أنشئ `migrations/p4b_review_requests.sql` بجدول `store_review_requests` مع indexes + RLS

---

## قواعد مهمة

1. **لا تعيد بناء الموجود** — storeReviews, product-reviews.tsx, track-order.tsx, facebook-capi.ts كلهم موجودين. التعديلات عليهم **محددة وصغيرة**
2. **لا تلمس Clerk** — Clerk للتجار فقط
3. **RTL + عربي** — كل الـ UI بالعربي، RTL direction
4. **Zod v4** — استخدم `z.object({})` syntax
5. **`import 'server-only'`** — في كل ملف فيه DB queries أو secrets
6. **`'use client'`** — بس للمكوّنات اللي فيها hooks أو events
7. **استخدم `@/` للـ imports** — مش relative paths
8. **handleApiError في كل catch**
9. **Rate limit** لكل API route حساس
10. **Fire-and-forget** لـ CAPI events وإيميلات — `someAsyncFunction().catch(() => {})`
11. **sanitizeText()** لكل user input يتحفظ في DB — `import { sanitizeText } from '@/lib/sanitize-html'`
12. **event_id** — ابعت نفس الـ event_id من Client + Server لـ Facebook يعمل dedup

---

## ترتيب الـ Commits المقترح

```
1. feat(schema): add P4-B storeReviewRequests table and StoreSettings fields
2. feat(capi): update Graph API v25.0, add Lead type, create hash-user-data and event-deduplication utilities
3. feat(capi): add ViewContent, InitiateCheckout, Lead, and Purchase CAPI events to existing routes
4. feat(reviews): add create-review-request service and review-request email template
5. feat(reviews): add /store/review/[token] page and submit-by-token API route
6. feat(reviews): add star ratings in product cards with getProductRatings query
7. feat(reviews): add rating filter in product-reviews component
8. feat(tracking): add shipping tracking URLs, auto-fill from URL, tracking link in email
9. chore(migration): add p4b_review_requests.sql
```

---

## ابدأ بقراءة دليل التنفيذ

```
docs/اضافات2/تنفيذ-P4-B-التتبع-والثقة-والمراجعات.md
```

اقرأه بالكامل ثم نفّذ الخطوات بالترتيب. بعد كل خطوة اعمل TypeScript check (`npx tsc --noEmit`) وتأكد إن مفيش أخطاء.

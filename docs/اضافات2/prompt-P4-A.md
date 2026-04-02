# Prompt — تنفيذ P4-A: حسابات العملاء + المفضلة + الطلب السريع

> انسخ كل المحتوى تحت هذا السطر والصقه في محادثة جديدة

---

أنت مطور خبير في Next.js و TypeScript. مطلوب منك تنفيذ **المرحلة P4-A** في منصة **Matjary** — منصة SaaS Multi-Tenant للتجارة الإلكترونية.

المرحلة P4-A تشمل **3 مميزات مترابطة**:
1. **حسابات العملاء (Customer Accounts)** — نظام تسجيل دخول العملاء بـ OTP + JWT مستقل عن Clerk
2. **قائمة المفضلة (Wishlist)** — localStorage للزوار + DB للمسجلين + مزامنة تلقائية
3. **الطلب السريع (Quick Checkout)** — زر "اشتري الآن" يتخطى السلة + auto-fill بيانات العميل المسجّل

**دليل التنفيذ التفصيلي موجود في**: `docs/اضافات2/تنفيذ-P4-A-حسابات-العملاء-والمفضلة-والطلب-السريع.md`
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
| Clerk | 6.37.5 | **للتجار فقط** — لا تلمسه في P4-A |
| Zod | 4.3.6 | **v4 syntax** — `z.object({})` |
| Zustand | 5.0.11 | State management مع `persist` |
| jose | **يجب تثبيته** | `npm install jose` — لـ JWT |
| Tailwind CSS | 4 | RTL-first, Arabic UI |
| lucide-react | 0.574.0 | Icons |
| nanoid | 5.1.6 | ID generation |

### هيكل المجلدات الأساسي

```
src/
├── app/
│   ├── (dashboard)/          # لوحة تحكم التاجر (Clerk auth)
│   ├── (platform)/           # الصفحات العامة (التسعير، إلخ)
│   ├── (super-admin)/        # إدارة المنصة
│   ├── api/
│   │   ├── checkout/         # Checkout API الحالي
│   │   ├── dashboard/        # APIs لوحة التحكم
│   │   └── storefront/       # APIs واجهة المتجر العامة
│   │       ├── abandoned-cart/
│   │       ├── affiliate/
│   │       ├── blog/
│   │       ├── coupons/
│   │       ├── loyalty/
│   │       ├── search/
│   │       └── upsell/
│   ├── auth/                 # Clerk auth pages
│   └── store/                # واجهة المتجر (الـ storefront)
│       ├── layout.tsx        # Store layout (StoreProvider, header, footer)
│       ├── checkout/
│       │   ├── page.tsx
│       │   └── _actions.ts
│       ├── product/[slug]/
│       │   ├── page.tsx
│       │   └── _components/
│       │       ├── product-details.tsx
│       │       └── whatsapp-order-button.tsx
│       └── _components/
│           ├── cart-counter.tsx
│           ├── product-card.tsx
│           ├── store-header.tsx
│           ├── store-footer.tsx
│           └── ...
├── components/ui/            # Shadcn UI components
├── db/
│   ├── index.ts              # db instance
│   └── schema.ts             # كل الجداول والأنواع (~1155 سطر)
├── lib/
│   ├── api/
│   │   ├── response.ts       # apiSuccess, ApiErrors, handleApiError
│   │   └── rate-limit.ts     # rateLimit, getClientIp
│   ├── stores/
│   │   └── cart-store.ts     # Zustand cart store
│   ├── tenant/
│   │   └── store-context.tsx # StoreContextValue type + provider
│   ├── validations/
│   │   ├── store.ts          # updateStoreSettingsSchema
│   │   └── order.ts          # checkoutSchema
│   └── utils.ts              # cn() helper
└── middleware.ts              # Clerk middleware + subdomain routing
```

---

## الأنماط الموجودة (اتبعها بالضبط)

### 1. API Response Pattern

```typescript
// src/lib/api/response.ts
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

// نجاح:
return apiSuccess({ data: result })              // 200
return apiSuccess({ data: result }, 201)          // 201

// أخطاء:
return ApiErrors.unauthorized()                   // 401
return ApiErrors.forbidden()                      // 403
return ApiErrors.notFound('المنتج')               // 404
return ApiErrors.tooManyRequests()                // 429
return ApiErrors.tooManyRequests('انتظر 30 ثانية') // 429 custom message
return ApiErrors.validation('الاسم مطلوب')         // 422
return ApiErrors.storeNotFound()                  // 404
return ApiErrors.internal()                       // 500

// في catch:
return handleApiError(error)  // يتعامل مع Zod errors + DB errors تلقائياً
```

### 2. Rate Limit Pattern

```typescript
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

// في بداية أي API route محتاج حماية:
const ip = getClientIp(request)
const { allowed } = rateLimit(`otp:${ip}`, { maxRequests: 5, windowSeconds: 60 })
if (!allowed) return ApiErrors.tooManyRequests()
```

### 3. API Route Pattern

```typescript
// src/app/api/storefront/xxx/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { someTable } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const mySchema = z.object({
  storeId: z.string().uuid(),
  // ...
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = mySchema.parse(body)
    // ... logic
    return apiSuccess({ result })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 4. Store Context

```typescript
// src/lib/tenant/store-context.tsx
export type StoreContextValue = {
  id: string
  slug: string
  name: string
  theme: StoreTheme
  settings: StoreSettings
  whatsappNumber: string | null
}
```

### 5. Cart Store (Zustand)

```typescript
// src/lib/stores/cart-store.ts — موجود بالفعل
export type CartItem = {
  productId: string
  productName: string
  productImage: string | null
  variantId: string | null
  variantLabel: string | null
  quantity: number
  maxQuantity?: number | null
  unitPrice: number
}

// Methods: addItem, removeItem, updateQuantity, clearCart, getSubtotal, getItemCount
```

---

## StoreSettings الحالي (الكامل)

هذا هو النوع **الحالي** في `src/db/schema.ts` — عليك **إضافة حقول P4-A** له:

```typescript
export type StoreSettings = {
  // Basic Settings
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
  tiktokPixelId: string | null
  googleAnalyticsId: string | null
  snapchatPixelId: string | null

  // WhatsApp
  whatsappFloatingEnabled: boolean
  whatsappFloatingPosition: 'left' | 'right'
  whatsappDefaultMessage: string | null
  whatsappOrderButtonEnabled: boolean

  // Email Notifications
  emailNotificationsEnabled: boolean
  merchantEmailOnNewOrder: boolean

  // P1: Fake Order Blocker
  fakeOrderBlockerEnabled: boolean
  fakeOrderMinTrustScore: number
  fakeOrderAutoReject: boolean

  // P1: Abandoned Cart Recovery
  abandonedCartEnabled: boolean
  abandonedCartDelayMinutes: number
  abandonedCartMessage: string | null
  abandonedCartChannel: 'whatsapp' | 'email' | 'both'

  // P1: Exit-Intent Popup
  exitIntentEnabled: boolean
  exitIntentMessage: string | null
  exitIntentCouponCode: string | null
  exitIntentPages: string[]

  // P2: AI Features
  aiEnabled: boolean
  aiInsightsEnabled: boolean
  aiInsightsLastGenerated: string | null
  aiInsightsCache: string | null

  // P3: Blog
  blogEnabled: boolean

  // P3: PWA
  pwaEnabled: boolean

  // P3: Loyalty
  loyaltyEnabled: boolean
  loyaltyPointsPerEgp: number
  loyaltyPointValue: number
  loyaltyMinRedemption: number
  loyaltyMaxRedemptionPercent: number

  // P3: Affiliate
  affiliateEnabled: boolean
  affiliateDefaultCommission: number

  // P3: Dropshipping
  dropshippingEnabled: boolean

  // P3: Multi-language
  defaultLanguage: 'ar' | 'en'
  supportedLanguages: string[]
}
```

**حقول P4-A الجديدة** (أضفها في آخر النوع):

```typescript
  // === P4-A: Customer Accounts ===
  customerAccountsEnabled: boolean       // default: true
  customerAuthMethods: ('phone' | 'email')[]  // default: ['phone']
  requireAccountForCheckout: boolean     // default: false
  guestCheckoutAllowed: boolean          // default: true

  // === P4-A: Wishlist ===
  wishlistEnabled: boolean               // default: true
  wishlistGuestMode: boolean             // default: true

  // === P4-A: Quick Checkout ===
  quickCheckoutEnabled: boolean          // default: true
  quickCheckoutMode: 'redirect' | 'modal' // default: 'redirect'
  skipCartEnabled: boolean               // default: false
```

**ملاحظة مهمة**: `settings` هو عمود JSONB — الحقول الجديدة مش محتاجة SQL migration. بس أضفها في النوع وفي الـ default values.

---

## الجداول الموجودة المرتبطة

### storeCustomers (موجود — لا تعدّله)

```typescript
export const storeCustomers = pgTable('store_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  address: jsonb('address').$type<ShippingAddress>(),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
  notes: text('notes'),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_customer_store_phone').on(table.storeId, table.phone),
  index('idx_customers_store').on(table.storeId),
])
```

### storeOrders (موجود — لا تعدّله)

```typescript
export const storeOrders = pgTable('store_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  orderNumber: text('order_number').notNull(),
  customerId: uuid('customer_id').references(() => storeCustomers.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  shippingAddress: jsonb('shipping_address').$type<ShippingAddress>().notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0').notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  couponCode: text('coupon_code'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').default('pending').notNull(),
  orderStatus: text('order_status').default('pending').notNull(),
  notes: text('notes'),
  // ... more fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

---

## خطوات التنفيذ (نفّذ بالترتيب)

### الخطوة 0: التحضير
1. `npm install jose` (لـ JWT)
2. أضف في `.env.local`:
   ```
   CUSTOMER_JWT_SECRET=matjary-customer-jwt-secret-min-32-chars-change-in-production
   SMS_PROVIDER=console
   ```

### الخطوة 1: تعديل Schema (src/db/schema.ts)
1. أضف حقول P4-A في نوع `StoreSettings` وفي default values
2. أضف نوع `SavedAddress`
3. أضف جدول `storeCustomerAccounts`
4. أضف جدول `storeCustomerOtps`
5. أضف جدول `storeWishlists`
6. أضف Relations للجداول الثلاثة الجديدة
7. حدّث `storesRelations` بإضافة `customerAccounts` و `wishlists`

### الخطوة 2: تعديل Validations (src/lib/validations/store.ts)
أضف حقول P4-A في `updateStoreSettingsSchema`:
```typescript
// P4-A: Customer Accounts
customerAccountsEnabled: z.boolean().optional(),
customerAuthMethods: z.array(z.enum(['phone', 'email'])).optional(),
requireAccountForCheckout: z.boolean().optional(),
guestCheckoutAllowed: z.boolean().optional(),

// P4-A: Wishlist
wishlistEnabled: z.boolean().optional(),
wishlistGuestMode: z.boolean().optional(),

// P4-A: Quick Checkout
quickCheckoutEnabled: z.boolean().optional(),
quickCheckoutMode: z.enum(['redirect', 'modal']).optional(),
skipCartEnabled: z.boolean().optional(),
```

### الخطوة 3: JWT Library (src/lib/auth/customer-jwt.ts)
أنشئ مكتبة JWT باستخدام `jose`:
- `createCustomerSession()` — إنشاء token + httpOnly cookie
- `verifyCustomerSession()` — التحقق من token
- `deleteCustomerSession()` — حذف cookie (logout)
- `refreshCustomerSession()` — تجديد token

**Cookie اسمه**: `matjary_ct_{storeId.slice(0, 8)}`
**إعدادات أمنية**: `httpOnly: true`, `secure` in production, `sameSite: 'lax'`, `maxAge: 30 days`

### الخطوة 4: OTP Service (src/lib/auth/otp-service.ts)
- `sendOtp()` — توليد 6 أرقام + SHA-256 hash + حفظ في DB + إرسال SMS
- `verifyOtp()` — تحقق من الكود + عدد المحاولات (max 5) + صلاحية (10 دقائق)
- Rate limit: OTP واحد كل 60 ثانية لنفس الرقم
- `sendSms()` — interface مجرد (console mode أو Twilio)

### الخطوة 5: Customer Middleware (src/lib/auth/customer-middleware.ts)
- `getCustomerAccount()` — مع React `cache()` لكل request
- فحص JWT أولاً (سريع) ثم DB (آمن — isActive check)

### الخطوة 6: API Routes

أنشئ هذه الـ routes:

| Route | Method | الوصف |
|-------|--------|-------|
| `/api/storefront/auth/send-otp` | POST | إرسال OTP |
| `/api/storefront/auth/verify-otp` | POST | تحقق + تسجيل/دخول + JWT |
| `/api/storefront/auth/me` | GET | بيانات العميل الحالي |
| `/api/storefront/auth/profile` | PUT | تعديل الاسم/الإيميل |
| `/api/storefront/auth/logout` | POST | حذف session |
| `/api/storefront/auth/orders` | GET | طلبات العميل |
| `/api/storefront/auth/addresses` | GET/POST | جلب/إضافة عناوين |
| `/api/storefront/wishlist` | GET/POST | جلب/إضافة مفضلة |
| `/api/storefront/wishlist/[productId]` | DELETE | حذف من المفضلة |
| `/api/storefront/wishlist/sync` | POST | مزامنة localStorage → DB |

**كل route يستخدم**: `x-store-id` header للتعرف على المتجر.

### الخطوة 7: Wishlist Zustand Store (src/lib/stores/wishlist-store.ts)
مخزن Zustand مع `persist` (localStorage) — يعمل للزوار بدون تسجيل.

### الخطوة 8: UI Components

#### صفحات حساب العميل:
```
src/app/store/account/
├── layout.tsx                   # Layout بـ sidebar
├── page.tsx                     # ملخص الحساب
├── login/
│   └── page.tsx                 # صفحة تسجيل الدخول
│   └── _components/
│       └── phone-login-form.tsx # فورم: رقم → OTP → اسم
├── orders/
│   ├── page.tsx                 # طلباتي
│   └── [id]/page.tsx            # تفاصيل طلب
├── addresses/
│   └── page.tsx                 # إدارة العناوين
├── wishlist/
│   └── page.tsx                 # المفضلة
└── settings/
    └── page.tsx                 # تعديل البيانات
```

#### مكوّنات مشتركة:
- `src/app/store/_components/wishlist-button.tsx` — زر ❤️ (يشتغل لـ guest + authenticated)
- `src/app/store/product/[slug]/_components/quick-buy-button.tsx` — زر "⚡ اشتري الآن"

### الخطوة 9: تعديل الـ Checkout
- في `store/checkout/page.tsx`: لو العميل مسجّل → auto-fill (name, phone, email, address)
- في `POST /api/checkout`: لو فيه customer session → ربط `storeCustomerAccounts.customerId` بـ `storeCustomers.id`

### الخطوة 10: تعديل Store Header
- أضف أيقونة حساب العميل في `store-header.tsx` (User icon → يروح `/account` أو `/account/login`)

### الخطوة 11: تعديل Product Card و Product Details
- أضف `WishlistButton` في `product-card.tsx` و `product-details.tsx`
- أضف `QuickBuyButton` في `product-details.tsx`

### الخطوة 12: SQL Migration
أنشئ `migrations/p4a_customer_accounts_wishlist.sql` بالجداول الثلاثة:
- `store_customer_accounts` (مع indexes)
- `store_customer_otps` (مع indexes)
- `store_wishlists` (مع unique index)

---

## قواعد مهمة

1. **لا تلمس Clerk** — Clerk للتجار فقط. العملاء يسجلون بـ JWT مستقل (`jose`)
2. **لا تعدّل جداول موجودة** — أضف جداول جديدة فقط. StoreSettings هو JSONB فمش محتاج migration
3. **RTL + عربي** — كل الـ UI بالعربي، RTL direction
4. **Zod v4** — استخدم `z.object({})` مش `z.object({}).parse()` القديم
5. **`import 'server-only'`** — في كل ملف فيه secrets أو DB queries مباشرة
6. **`'use client'`** — بس للمكوّنات اللي فيها hooks أو events
7. **استخدم `@/` للـ imports** — مش relative paths
8. **handleApiError في كل catch** — بلاش try/catch بدون response
9. **Rate limit** لكل API route حساس (send-otp, verify-otp, addresses)
10. **httpOnly cookies** — مش localStorage للـ JWT tokens (أمان)

---

## ترتيب الـ Commits المقترح

```
1. feat(schema): add P4-A tables and StoreSettings fields
2. feat(auth): add customer JWT library with jose
3. feat(auth): add OTP service
4. feat(auth): add customer middleware
5. feat(api): add customer auth API routes
6. feat(api): add wishlist API routes
7. feat(store): add wishlist Zustand store
8. feat(ui): add customer account pages
9. feat(ui): add wishlist button component
10. feat(ui): add quick buy button component
11. feat(checkout): integrate customer auto-fill
12. feat(store): add customer icon to header
13. chore(migration): add P4-A SQL migration
```

---

## بعد ما تخلص

1. شغّل `npx tsc --noEmit` — لازم يكون **صفر أخطاء**
2. شغّل Migration في Supabase
3. اختبر:
   - إرسال OTP (هيظهر في console)
   - تسجيل دخول عميل جديد
   - إضافة منتج للمفضلة (guest + authenticated)
   - مزامنة المفضلة عند تسجيل الدخول
   - Quick Checkout يروح Checkout مع auto-fill
   - عرض طلبات العميل
   - إدارة العناوين (إضافة، تعيين default)
   - تسجيل خروج

ابدأ بقراءة ملف `docs/اضافات2/تنفيذ-P4-A-حسابات-العملاء-والمفضلة-والطلب-السريع.md` بالكامل أولاً واتبع كل الكود الموجود فيه.

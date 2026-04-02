# Prompt — تنفيذ P4-D: تحسين التصفح والداشبورد (Browsing & Dashboard Enhancements)

> انسخ كل المحتوى تحت هذا السطر والصقه في محادثة جديدة

---

> **⚠️ تنبيهات مهمة** — تم مراجعة هذا الملف مع الكود الفعلي وتم حل التعارضات التالية:
> 1. **Button variant**: المشروع يستخدم `'danger'` وليس `'destructive'`
> 2. **Category page**: يتم تغيير `getCategoryWithProducts()` → `resolveStorefrontCategory()` + `getStorefrontProducts()`
> 3. **Sort type**: فقط `'newest' | 'price-asc' | 'price-desc' | 'name'` — لا يوجد `'rating' | 'best-selling'`
> 4. **StickyAddToCart**: يُضاف في `product-details.tsx` (Client Component) — `page.tsx` هو Server Component
> 5. **Price**: نوعه `decimal(10,2)` أي string في JS — المقارنات في الكود صحيحة
> 6. **Zod v4**: `parsed.error.issues[0]?.message` هو الصيغة الصحيحة
>
> **التفاصيل الكاملة** في قسم "ملاحظات تعارضات تم حلها" في `تنفيذ-P4-D-تحسين-التصفح-والداشبورد.md`

---

أنت مطور خبير في Next.js و TypeScript. مطلوب منك تنفيذ **المرحلة P4-D** في منصة **Matjary** — منصة SaaS Multi-Tenant للتجارة الإلكترونية.

المرحلة P4-D تشمل **5 مميزات** (تحسين التصفح واتخاذ القرار + إدارة الداشبورد):
1. **فلترة متقدمة (Advanced Filters)** — فلاتر السعر والتقييم والتوفر + sidebar desktop + drawer mobile + ترتيب + pagination
2. **مقارنة المنتجات (Product Comparison)** — Zustand store + compare button في ProductCard + floating bar + صفحة مقارنة
3. **شاهدته مؤخراً (Recently Viewed)** — Zustand store + تتبع تلقائي + carousel section
4. **بار إضافة للسلة الثابت (Sticky Add-to-Cart)** — IntersectionObserver sticky bar للديسكتوب (المتواجد حالياً للموبايل فقط)
5. **عمليات جماعية (Bulk Actions)** — bulk APIs + checkboxes + action bar + confirm dialog للمنتجات والطلبات

**دليل التنفيذ التفصيلي موجود في**: `docs/اضافات2/تنفيذ-P4-D-تحسين-التصفح-والداشبورد.md`
اقرأه بالكامل أولاً — فيه كل الكود والـ schemas والـ API routes جاهزين. نفّذ كل اللي فيه بالظبط.

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

### هيكل المجلدات الأساسي

```
src/
├── app/
│   ├── (dashboard)/          # لوحة تحكم التاجر (Clerk auth)
│   │   └── dashboard/
│   │       ├── products/     # ✅ موجود — تعديل: + checkboxes + BulkActionBar
│   │       │   ├── page.tsx
│   │       │   └── _components/
│   │       │       └── products-bulk-wrapper.tsx  # ❌ جديد P4-D
│   │       ├── orders/       # ✅ موجود — تعديل: + checkboxes + BulkActionBar
│   │       │   ├── page.tsx
│   │       │   └── _components/
│   │       │       └── orders-bulk-wrapper.tsx    # ❌ جديد P4-D
│   │       └── settings/     # ✅ موجود — تعديل: حقول P4-D
│   ├── api/
│   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   │   ├── route.ts         # ✅ موجود
│   │   │   │   └── bulk/
│   │   │   │       └── route.ts     # ❌ جديد P4-D — PATCH (activate/deactivate/delete/change_category)
│   │   │   └── orders/
│   │   │       ├── route.ts         # ✅ موجود
│   │   │       └── bulk/
│   │   │           └── route.ts     # ❌ جديد P4-D — PATCH (update_status)
│   │   └── storefront/
│   │       └── products/
│   │           └── route.ts         # ❌ جديد P4-D — GET (products by IDs for compare/recently-viewed)
│   ├── store/                # واجهة المتجر (storefront)
│   │   ├── layout.tsx            # ✅ تعديل: + CompareFloat
│   │   ├── page.tsx              # ✅ تعديل: + RecentlyViewedSection
│   │   ├── compare/              # ❌ جديد P4-D
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       └── compare-page-content.tsx
│   │   ├── category/[slug]/
│   │   │   ├── page.tsx          # ✅ تعديل: + FilterSidebar + FilterDrawer + SortSelect + pagination
│   │   │   └── _components/
│   │   │       ├── filter-sidebar.tsx         # ❌ جديد P4-D
│   │   │       ├── filter-drawer.tsx          # ❌ جديد P4-D
│   │   │       ├── price-range-slider.tsx     # ❌ جديد P4-D
│   │   │       ├── rating-filter.tsx          # ❌ جديد P4-D
│   │   │       └── sort-select.tsx            # ❌ جديد P4-D
│   │   ├── product/[slug]/
│   │   │   ├── page.tsx          # ✅ تعديل: + TrackRecentlyViewed + RecentlyViewedSection
│   │   │   └── _components/
│   │   │       ├── mobile-sticky-cart.tsx     # ✅ موجود (md:hidden — للموبايل)
│   │   │       ├── product-details.tsx        # ✅ تعديل: + StickyAddToCart (Client Component)
│   │   │       ├── sticky-add-to-cart.tsx     # ❌ جديد P4-D (hidden md:block — للديسكتوب)
│   │   │       └── track-recently-viewed.tsx  # ❌ جديد P4-D
│   │   └── _components/
│   │       ├── product-card.tsx              # ✅ تعديل: + CompareButton
│   │       ├── compare-button.tsx            # ❌ جديد P4-D
│   │       ├── compare-float.tsx             # ❌ جديد P4-D
│   │       └── recently-viewed-section.tsx   # ❌ جديد P4-D
├── components/
│   ├── dashboard/
│   │   ├── bulk-action-bar.tsx               # ❌ جديد P4-D
│   │   └── bulk-confirm-dialog.tsx           # ❌ جديد P4-D
│   └── ui/
├── db/
│   ├── index.ts
│   └── schema.ts             # ✅ تعديل: + StoreSettings P4-D defaults
├── lib/
│   ├── api/
│   │   ├── response.ts       # apiSuccess, ApiErrors, handleApiError
│   │   ├── auth.ts           # verifyStoreOwnership
│   │   └── rate-limit.ts     # rateLimit, getClientIp
│   ├── stores/
│   │   ├── cart-store.ts      # ✅ موجود (نمط مرجعي)
│   │   ├── wishlist-store.ts  # ✅ موجود (نمط مرجعي)
│   │   ├── compare-store.ts   # ❌ جديد P4-D
│   │   └── recently-viewed-store.ts  # ❌ جديد P4-D
│   ├── tenant/
│   │   ├── store-context.tsx  # ✅ موجود — يوفر useStoreContext()
│   │   ├── get-current-store.ts
│   │   └── store-path.ts     # ✅ موجود — storePath(path, { storeSlug })
│   ├── queries/
│   │   ├── storefront.ts     # ✅ تعديل: + فلاتر متقدمة في getStorefrontProducts()
│   │   └── product-ratings.ts # ✅ موجود — getProductRatings()
│   ├── validations/
│   │   └── store.ts          # ✅ تعديل: + حقول P4-D
│   └── utils.ts               # ✅ موجود — formatPrice(), escapeLike()
└── middleware.ts
```

---

## الأنماط الموجودة (اتبعها بالضبط)

### 1. API Response Pattern

```typescript
import { apiSuccess, ApiErrors, handleApiError, apiError } from '@/lib/api/response'

return apiSuccess({ data: result })              // 200
return apiSuccess({ data: result }, 201)          // 201
return ApiErrors.unauthorized()                   // 401
return ApiErrors.storeNotFound()                   // 404
return ApiErrors.validation('الاسم مطلوب')         // 422
return apiError('رسالة الخطأ', 400)               // Custom error

// في catch:
return handleApiError(error)
```

### 2. Store Authentication for Dashboard APIs

```typescript
import { verifyStoreOwnership } from '@/lib/api/auth'

const { store } = await verifyStoreOwnership()
if (!store) return ApiErrors.unauthorized()
```

### 3. Store Detection for Storefront APIs

```typescript
import { getCurrentStore } from '@/lib/tenant/get-current-store'

const store = await getCurrentStore()
if (!store) return apiError('المتجر غير موجود', 404)
```

### 4. Zustand Store Pattern (from wishlist-store.ts)

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SomeItem = {
  productId: string
  addedAt: number
}

type SomeStore = {
  items: SomeItem[]
  addItem: (productId: string) => void
  removeItem: (productId: string) => void
  isInList: (productId: string) => boolean
  clearAll: () => void
  getItems: () => SomeItem[]
}

export const useSomeStore = create<SomeStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId) => { /* ... */ },
      removeItem: (productId) => { /* ... */ },
      isInList: (productId) => get().items.some(i => i.productId === productId),
      clearAll: () => set({ items: [] }),
      getItems: () => get().items,
    }),
    { name: 'matjary-some-store' }
  )
)
```

### 5. MobileStickyCart Pattern (IntersectionObserver — from mobile-sticky-cart.tsx)

```typescript
useEffect(() => {
  const target = document.getElementById('add-to-cart-btn')
  if (!target) return

  const observer = new IntersectionObserver(
    ([entry]) => {
      setVisible(entry ? !entry.isIntersecting : false)
    },
    { threshold: 0 }
  )

  observer.observe(target)
  return () => observer.disconnect()
}, [])
// MobileStickyCart uses: md:hidden (mobile only)
// P4-D StickyAddToCart should use: hidden md:block (desktop only)
```

### 6. ProductCard Structure

```typescript
// ProductCard is wrapped entirely in <Link>
// WishlistButton already in top-right: <div className="absolute right-3 top-3 flex flex-col gap-2">
// CompareButton needs:
//   1. e.preventDefault() + e.stopPropagation() — to prevent Link navigation
//   2. Added after WishlistButton in the same flex-col div
```

### 7. Store Context Access (Client Components)

```typescript
import { useStoreContext } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'

const { store } = useStoreContext()
const href = storePath('/compare' as `/${string}`, { storeSlug: store.slug })
```

### 8. URL-Based Filtering Pattern (Server Components)

```typescript
// Existing pattern in dashboard pages:
type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Parse searchParams into typed filters (server-side)
// Build URLs with URLSearchParams for filter links/pagination
```

---

## ما هو موجود بالفعل (لا تعيد بناءه)

### Schema — الموجود

- `storeProducts` table — كل الأعمدة (price, compareAtPrice, stock, images, variants, isActive, isFeatured, etc.)
- `storeOrders` + `storeOrderItems` — الطلبات والعناصر (orderStatus, paymentStatus, etc.)
- `storeReviews` — المراجعات (rating, isApproved — P4-B)
- `storeCategories` — التصنيفات
- `stores.settings` (JSONB) — كل الحقول حتى P4-B
- Zustand stores: `cart-store.ts`, `wishlist-store.ts`

### Category Page — الموجود

```tsx
// src/app/store/category/[slug]/page.tsx — يعرض حالياً:
- Hero section (category name + description)
- Products grid (ProductCard)
- Empty state

// يحتاج تعديل كامل للإضافة:
- FilterSidebar (desktop) + FilterDrawer (mobile)
- SortSelect
- PaginationBar
- URL-based filters (?minPrice=&maxPrice=&rating=&inStock=&onSale=&sort=&page=)
```

### Product Detail Page — الموجود

```tsx
// src/app/store/product/[slug]/page.tsx — يعرض حالياً:
- ProductDetails (images, variants, add to cart)
- ProductReviews (P4-B)
- Cross-sell products
- Related products
- MobileStickyCart (md:hidden — للموبايل فقط)

// يحتاج إضافة:
- TrackRecentlyViewed (client component — يتتبع المشاهدة) → في page.tsx
- StickyAddToCart (hidden md:block — للديسكتوب) → يُضاف في product-details.tsx (Client Component — حيث MobileStickyCart موجود)
- RecentlyViewedSection (بعد related products) → في page.tsx
```

### Dashboard Products Page — الموجود

```tsx
// src/app/(dashboard)/dashboard/products/page.tsx — يعرض حالياً:
// Auth: getDashboardStoreAccessContext()
// Filters: search, category, status (all|active|draft), sort
// Table columns: المنتج, السعر, المخزون, التصنيف, الحالة, تاريخ الإضافة, الإجراءات
// Server actions: duplicateProductAction

// يحتاج إضافة:
- Checkbox column (in <th> and each <td>)
- ProductsBulkWrapper (client component wrapping the table)
- BulkActionBar (activate, deactivate, delete)
```

### Dashboard Orders Page — الموجود

```tsx
// src/app/(dashboard)/dashboard/orders/page.tsx — يعرض حالياً:
// Auth: getCurrentStore()
// Filters: status (7 options), search, page, limit
// Table columns: رقم الطلب, العميل, الإجمالي, حالة الدفع, حالة الطلب, التاريخ, التفاصيل
// CSV export link

// يحتاج إضافة:
- Checkbox column (in <th> and each <td>)
- OrdersBulkWrapper (client component wrapping the table)
- BulkActionBar (confirmed, processing, shipped, delivered, cancelled)
```

### getStorefrontProducts() — الموجود

```typescript
// src/lib/queries/storefront.ts
// Currently supports: categoryId, search, featured, page, limit, sort (newest|price-asc|price-desc|name)
// Uses: eq, and, desc, asc, ilike, count from drizzle-orm

// يحتاج إضافة فلاتر:
// minPrice (gte), maxPrice (lte), inStock (gt stock 0), onSale (compareAtPrice > price)
// rating filter: post-filter using storeReviews avg rating
// imports المطلوبة: import { gte, lte, gt, sql } from 'drizzle-orm'
```

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

يحتاج **إضافة**: `<CompareFloat />` (floating bar يظهر عند إضافة منتجات للمقارنة)

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

  // P4-B
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

**أضف حقول P4-D الجديدة** (في آخر النوع — **حقلين فقط**):

```typescript
  // === P4-D: Product Comparison ===
  comparisonEnabled: boolean        // default: true
  comparisonMaxItems: number        // default: 4
```

**الـ default values** (أضفها بعد `facebookConversionApiEnabled: false`):

```typescript
  // P4-D
  comparisonEnabled: true,
  comparisonMaxItems: 4,
```

---

## ما هو مطلوب تنفيذه (P4-D)

### ملخص التغييرات

```
ملفات جديدة (16):
  src/lib/stores/compare-store.ts                                    → Zustand store للمقارنة
  src/lib/stores/recently-viewed-store.ts                            → Zustand store للمشاهدات
  src/app/store/category/[slug]/_components/filter-sidebar.tsx       → فلاتر Desktop
  src/app/store/category/[slug]/_components/filter-drawer.tsx        → فلاتر Mobile
  src/app/store/category/[slug]/_components/price-range-slider.tsx   → slider السعر
  src/app/store/category/[slug]/_components/rating-filter.tsx        → فلتر النجوم
  src/app/store/category/[slug]/_components/sort-select.tsx          → قائمة الترتيب
  src/app/store/_components/compare-button.tsx                       → زر "قارن" في ProductCard
  src/app/store/_components/compare-float.tsx                        → شريط عائم للمقارنة
  src/app/store/compare/page.tsx                                     → صفحة المقارنة server
  src/app/store/compare/_components/compare-page-content.tsx         → صفحة المقارنة client
  src/app/store/_components/recently-viewed-section.tsx              → قسم "شاهدته مؤخراً"
  src/app/store/product/[slug]/_components/sticky-add-to-cart.tsx    → بار السلة الثابت (desktop)
  src/app/store/product/[slug]/_components/track-recently-viewed.tsx → تتبع المشاهدات
  src/app/api/storefront/products/route.ts                           → GET products by IDs
  src/app/api/dashboard/products/bulk/route.ts                       → PATCH (activate/deactivate/delete/change_category)
  src/app/api/dashboard/orders/bulk/route.ts                         → PATCH (update_status)
  src/components/dashboard/bulk-action-bar.tsx                       → بار الإجراءات الجماعية
  src/components/dashboard/bulk-confirm-dialog.tsx                   → dialog تأكيد
  src/app/(dashboard)/dashboard/products/_components/products-bulk-wrapper.tsx  → wrapper
  src/app/(dashboard)/dashboard/orders/_components/orders-bulk-wrapper.tsx      → wrapper

ملفات معدّلة (8):
  src/db/schema.ts                                                   → + StoreSettings P4-D defaults
  src/lib/validations/store.ts                                       → + حقول P4-D في updateStoreSettingsSchema
  src/lib/queries/storefront.ts                                      → + فلاتر (minPrice, maxPrice, inStock, onSale, rating)
  src/app/store/category/[slug]/page.tsx                             → + FilterSidebar + FilterDrawer + SortSelect + pagination
  src/app/store/_components/product-card.tsx                         → + CompareButton
  src/app/store/product/[slug]/page.tsx                              → + TrackRecentlyViewed + RecentlyViewedSection
  src/app/store/product/[slug]/_components/product-details.tsx        → + StickyAddToCart (Client Component — حيث MobileStickyCart موجود)
  src/app/(dashboard)/dashboard/products/page.tsx                    → + checkboxes + ProductsBulkWrapper
  src/app/(dashboard)/dashboard/orders/page.tsx                      → + checkboxes + OrdersBulkWrapper

لا يوجد Migration — لا جداول جديدة
```

---

## Validations — أضف في updateStoreSettingsSchema

في `src/lib/validations/store.ts`، بعد آخر حقل P4-B (`reviewLoyaltyPoints`):

```typescript
  // P4-D: Product Comparison
  comparisonEnabled: z.boolean().optional(),
  comparisonMaxItems: z.number().int().min(2).max(6).optional(),
```

---

## خطوات التنفيذ (نفّذ بالترتيب)

### الخطوة 0: تعديل Schema + Validations
1. أضف حقلي P4-D في `StoreSettings` type + default values في `src/db/schema.ts`
2. أضف حقلي P4-D في `updateStoreSettingsSchema` في `src/lib/validations/store.ts`

### الخطوة 1: فلترة متقدمة
1. عدّل `getStorefrontProducts()` في `src/lib/queries/storefront.ts` — أضف `minPrice`, `maxPrice`, `inStock`, `onSale`, `rating` filters
   - استخدم `gte()`, `lte()`, `gt()` من `drizzle-orm` للسعر والمخزون
   - استخدم `sql` template literal لـ onSale check (`compareAtPrice IS NOT NULL AND compareAtPrice::numeric > price::numeric`)
   - rating filter: post-filter باستخدام `storeReviews` avg rating (لأن rating مش عمود في storeProducts)
   - Return object يشمل: `{ products, total, page, totalPages }`
2. عدّل `src/app/store/category/[slug]/page.tsx` — أعد كتابته بالكامل كما في دليل التنفيذ
3. أنشئ `filter-sidebar.tsx` — للديسكتوب (sticky sidebar في `aside`)
4. أنشئ `filter-drawer.tsx` — للموبايل (overlay drawer يفتح بزر)
5. أنشئ `price-range-slider.tsx` — two number inputs (من/إلى)
6. أنشئ `rating-filter.tsx` — radio buttons بنجوم (4★+, 3★+, 2★+, 1★+)
7. أنشئ `sort-select.tsx` — `<select>` dropdown (الأحدث, السعر↑, السعر↓, الاسم)
8. كل الفلاتر URL-based: `?minPrice=100&maxPrice=500&rating=4&inStock=true&onSale=true&sort=price-asc&page=2`

### الخطوة 2: مقارنة المنتجات
1. أنشئ `src/lib/stores/compare-store.ts` — Zustand + persist, name: `'matjary-compare'`
   - Items array, max 4 (from settings), addItem returns boolean
   - Methods: addItem, removeItem, isInCompare, clear, getCount, isFull, setMaxItems
2. أنشئ `compare-button.tsx` — `e.preventDefault()` + `e.stopPropagation()` عشان ما ينقلش للمنتج
3. عدّل `product-card.tsx` — أضف `<CompareButton>` بعد `<WishlistButton>` في flex-col div
4. أنشئ `compare-float.tsx` — floating bar fixed bottom-start، يظهر لما items > 0
5. عدّل `store/layout.tsx` — أضف `<CompareFloat />`
6. أنشئ API: `GET /api/storefront/products?ids=uuid1,uuid2` — يجلب منتجات بـ IDs + ratings
   - Validate UUIDs, max 10, store ownership check
7. أنشئ `store/compare/page.tsx` + `compare-page-content.tsx` — جدول مقارنة (صورة, اسم, سعر, توفر, تقييم, وصف)

### الخطوة 3: شاهدته مؤخراً
1. أنشئ `src/lib/stores/recently-viewed-store.ts` — Zustand + persist, name: `'matjary-recently-viewed'`
   - Max 10 items, addItem يحدث الوقت لو موجود أصلاً
2. أنشئ `track-recently-viewed.tsx` — client component يعمل `addItem(productId)` في `useEffect`
3. عدّل `store/product/[slug]/page.tsx` — أضف `<TrackRecentlyViewed productId={product.id} />`
4. أنشئ `recently-viewed-section.tsx` — يجلب المنتجات من Zustand store + API (`/api/storefront/products?ids=...`)
5. أضف `<RecentlyViewedSection>` في `store/page.tsx` + `store/product/[slug]/page.tsx`
   - في product page: `excludeProductId={product.id}` لاستبعاد المنتج الحالي

### الخطوة 4: Sticky Add-to-Cart
1. أنشئ `sticky-add-to-cart.tsx` — نفس نمط `mobile-sticky-cart.tsx` بالضبط
   - يستخدم `IntersectionObserver` يراقب `document.getElementById('add-to-cart-btn')`
   - CSS: `hidden md:block` (ديسكتوب فقط — عكس MobileStickyCart اللي `md:hidden`)
   - يعرض: صورة + اسم المنتج + سعر + زر إضافة للسلة
2. عدّل `product/[slug]/_components/product-details.tsx` — أضف `<StickyAddToCart>` بنفس props اللي بتتبعت لـ `<MobileStickyCart>` (ملاحظة: page.tsx هو Server Component — لازم يتضاف في product-details.tsx اللي هو Client Component)

### الخطوة 5: عمليات جماعية
1. أنشئ `components/dashboard/bulk-action-bar.tsx` — بار يظهر عند تحديد عناصر
   - Props: selectedCount, actions[], onAction, onClear
2. أنشئ `components/dashboard/bulk-confirm-dialog.tsx` — modal تأكيد
   - Props: open, title, description, confirmLabel, variant (default|danger), onConfirm, onCancel
3. أنشئ API: `PATCH /api/dashboard/products/bulk`
   - Zod schema: `{ action: enum['activate'|'deactivate'|'change_category'|'delete'], ids: uuid[], categoryId?: uuid }`
   - Auth: `verifyStoreOwnership()`
   - Return: `{ updated: number, failed: number }`
4. أنشئ API: `PATCH /api/dashboard/orders/bulk`
   - Zod schema: `{ action: enum['update_status'], ids: uuid[], status: enum[...] }`
   - Auth: `verifyStoreOwnership()`
   - Return: `{ updated: number, failed: number }`
5. أنشئ `products-bulk-wrapper.tsx` — client component يلف الجدول
   - Manages: selectedIds (Set), toggleSelect, toggleAll, allSelected
   - Uses render prop pattern: `children({ selectedIds, toggleSelect, toggleAll, allSelected })`
   - Actions: activate, deactivate, delete (with confirm dialog)
6. أنشئ `orders-bulk-wrapper.tsx` — نفس النمط للطلبات
   - Actions: confirmed, processing, shipped, delivered, cancelled
7. عدّل `products/page.tsx` — لف الجدول بـ `<ProductsBulkWrapper>`, أضف checkbox column
8. عدّل `orders/page.tsx` — لف الجدول بـ `<OrdersBulkWrapper>`, أضف checkbox column

---

## قواعد مهمة

- **P4-D مفيهاش DB tables جديدة** — فقط حقلين JSONB (StoreSettings)
- **مفيش migration** مطلوبة
- Dashboard products تستخدم `getDashboardStoreAccessContext()` — Bulk APIs تستخدم `verifyStoreOwnership()`
- Dashboard orders تستخدم `getCurrentStore()` — Bulk APIs تستخدم `verifyStoreOwnership()`
- ProductCard ملفوف في `<Link>` — أي زر داخله لازم يعمل `e.preventDefault()` + `e.stopPropagation()`
- MobileStickyCart = `md:hidden` (موبايل) — StickyAddToCart = `hidden md:block` (ديسكتوب)
- Zustand stores: استخدم نمط `wishlist-store.ts` كمرجع
- API response: دايماً استخدم `apiSuccess()` / `ApiErrors.*` / `handleApiError()`
- **كل المكونات الجديدة في الـ storefront client components** — لازم يكون فيهم `'use client'` و hydration guard (`useEffect + mounted state`)
- Drizzle filtering: `gte`, `lte`, `gt`, `eq`, `and`, `or`, `inArray`, `sql` — كل دول من `'drizzle-orm'`
- RTL-first — كل CSS يدعم `start`/`end` بدل `left`/`right`. Arabic UI
- Zod v4: استخدم `z.object({})` مباشرة

---

## ترتيب التنفيذ الموصى

| الخطوة | الميزة | الجهد |
|--------|-------|-------|
| 0 | StoreSettings + Validations | 15 دقيقة |
| 1 | فلترة متقدمة (7 ملفات) | 2-3 ساعات |
| 2 | مقارنة المنتجات (7 ملفات) | 2-3 ساعات |
| 3 | شاهدته مؤخراً (3 ملفات) | 1-2 ساعة |
| 4 | Sticky Add-to-Cart (1 ملف) | 30 دقيقة |
| 5 | عمليات جماعية (6 ملفات) | 2-3 ساعات |

ابدأ بقراءة دليل التنفيذ الكامل: `docs/اضافات2/تنفيذ-P4-D-تحسين-التصفح-والداشبورد.md`

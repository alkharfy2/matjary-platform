# دليل تنفيذ P4-D — تحسين التصفح والداشبورد (Browsing & Dashboard Enhancements)

> **تاريخ الإنشاء**: 30 مارس 2026  
> **آخر تحديث**: 1 أبريل 2026  
> **المرجعية**: اضافات-2.md → المرحلة P4-D  
> **الهدف**: دليل تنفيذ تفصيلي للمميزات الخمسة بتاعة P4-D  
> **المستوى**: جاهز للتنفيذ (Copy-Paste Ready)  
> **الجهد**: ~3-4 أيام

---

## ⚠️ ملاحظات تعارضات تم حلها (مُحدَّث 1 أبريل 2026)

> **هام جداً** — تم اكتشاف وإصلاح التعارضات التالية بين هذا الدليل والكود الفعلي:

### 1. Button variant: `'danger'` وليس `'destructive'`
- مكون `Button` في المشروع يدعم: `'primary' | 'secondary' | 'ghost' | 'danger'`
- **لا يوجد `'destructive'`** — تم تصحيح كل الأماكن لاستخدام `'danger'`
- الملفات المتأثرة: `bulk-action-bar.tsx` و `bulk-confirm-dialog.tsx`

### 2. صفحة التصنيف: تغيير من `getCategoryWithProducts()` إلى `getStorefrontProducts()`
- **الوضع الحالي**: `category/[slug]/page.tsx` تستخدم `getCategoryWithProducts()` من `storefront.ts`
- **P4-D تغيّر هذا**: تستخدم `resolveStorefrontCategory()` + `getStorefrontProducts()` بدلاً منها
- **سبب التغيير**: `getCategoryWithProducts()` لا تدعم filters/pagination — نحتاج `getStorefrontProducts()` اللي بتدعم كل الفلاتر
- **import المطلوب تغييره**:
  ```diff
  - import { getCategoryWithProducts } from '@/lib/queries/storefront'
  + import { getStorefrontProducts, resolveStorefrontCategory } from '@/lib/queries/storefront'
  ```
- **searchParams type يتغير أيضاً**:
  ```diff
  - searchParams: Promise<{ lang?: string }>
  + searchParams: Promise<Record<string, string | string[] | undefined>>
  ```

### 3. Sort type: لا يشمل `'rating' | 'best-selling'`
- **السبب**: لا يوجد implementation لهذين النوعين في `orderBy`
- **تم حذفهم** من نوع `sort` — يبقى: `'newest' | 'price-asc' | 'price-desc' | 'name'`
- لو مطلوب مستقبلاً: rating sort يحتاج denormalized field في `storeProducts`

### 4. StickyAddToCart: يُضاف في `product-details.tsx` وليس `page.tsx`
- `MobileStickyCart` الحالي موجود داخل `product-details.tsx` (client component)
- `StickyAddToCart` الجديد لازم يتضاف **في نفس المكان** (`product-details.tsx`)
- **page.tsx هو Server Component** ولا يمكنه استخدام client hooks

### 5. متغير غير مستخدم في Bulk Products API
- `const activateResult = await db...` — تم إزالة `const activateResult =` لأنه unused

### 6. Price هو `decimal` (string في JS)
- `gte(storeProducts.price, String(minPrice))` — صحيح لأن Drizzle يتعامل مع decimal كـ string
- `stock` هو `integer` — `gt(storeProducts.stock, 0)` صحيح مباشرة
- فلتر `onSale` يستخدم `::numeric` cast في SQL — صحيح

### 7. Zod v4 error format
- `parsed.error.issues[0]?.message` — صحيح ومتوافق مع Zod v4 (نفس النمط المستخدم في باقي APIs)

---

## الفهرس

1. [نظرة عامة والأولويات](#نظرة-عامة-والأولويات)
2. [فلترة متقدمة (Advanced Filters)](#1-فلترة-متقدمة-advanced-filters)
3. [مقارنة المنتجات (Product Comparison)](#2-مقارنة-المنتجات-product-comparison)
4. [شاهدته مؤخراً (Recently Viewed)](#3-شاهدته-مؤخراً-recently-viewed)
5. [بار إضافة للسلة الثابت (Sticky Add-to-Cart)](#4-بار-إضافة-للسلة-الثابت-sticky-add-to-cart)
6. [عمليات جماعية (Bulk Actions)](#5-عمليات-جماعية-bulk-actions)
7. [تغييرات مشتركة على StoreSettings](#6-تغييرات-مشتركة-على-storesettings)
8. [خطة الاختبار](#7-خطة-الاختبار)

---

## نظرة عامة والأولويات

### لماذا الخمسة مع بعض؟

```
فلاتر متقدمة (#13) ──┐
مقارنة (#11)         ──┤── تحسين تجربة التصفح واتخاذ القرار
شاهدته مؤخراً (#12)  ──┤
Sticky Bar (#14)      ──┘

Bulk Actions (#17)    → تحسين تجربة التاجر في الداشبورد
```

- الأربعة الأولى كلها عن **تصفح المنتجات** — بتكمّل بعض:
  "العميل يفلتر → يقارن → يشوف اللي شافه قبل كده → يضيف للسلة من أي مكان"
- Bulk Actions بتخدم **التاجر** — بنخلصها هنا عشان الداشبورد يبقى كامل
- **مفيش DB tables جديدة** — كلها client-side stores أو API modifications
- **حقلين StoreSettings جديدين فقط**: `comparisonEnabled` + `comparisonMaxItems`

### ترتيب التنفيذ

| الخطوة | الميزة | الجهد | السبب |
|--------|-------|-------|-------|
| 0 | تغييرات StoreSettings | 15 دقيقة | الأساس — المقارنة تعتمد عليه |
| 1 | فلترة متقدمة | 1.5-2 يوم | الأكبر — API + UI + URL filters |
| 2 | مقارنة المنتجات | 1-1.5 يوم | Zustand store + صفحة + مكونات |
| 3 | شاهدته مؤخراً | 0.5 يوم | Zustand store + section واحد |
| 4 | Sticky Add-to-Cart | 0.5 يوم | مكون واحد يوسّع النمط الموجود |
| 5 | عمليات جماعية | 1-1.5 يوم | APIs + UI + مكونات الداشبورد |

### ملخص الوضع الحالي

> **الخمس مميزات كلهم جديدين 100%** — لا يوجد أي كود مسبق لأي منهم.  
> الاستثناء الوحيد: `MobileStickyCart` موجود بالفعل (للموبايل فقط) — نستخدمه كمرجع.  
> هذا الدليل يغطي كل شيء من الصفر.

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
  src/app/store/compare/page.tsx                                     → صفحة المقارنة
  src/app/store/_components/recently-viewed-section.tsx              → قسم "شاهدته مؤخراً"
  src/app/store/product/[slug]/_components/sticky-add-to-cart.tsx    → بار السلة الثابت (desktop)
  src/app/api/dashboard/products/bulk/route.ts                       → PATCH + DELETE
  src/app/api/dashboard/orders/bulk/route.ts                         → PATCH
  src/components/dashboard/bulk-action-bar.tsx                       → بار الإجراءات الجماعية
  src/components/dashboard/bulk-confirm-dialog.tsx                   → dialogs تأكيد

ملفات معدّلة (8):
  src/db/schema.ts                                                   → + StoreSettings P4-D defaults
  src/lib/validations/store.ts                                       → + حقول P4-D في updateStoreSettingsSchema
  src/lib/queries/storefront.ts                                      → + فلاتر متقدمة في getStorefrontProducts()
  src/app/store/category/[slug]/page.tsx                             → + FilterSidebar + FilterDrawer + pagination + URL params
  src/app/store/_components/product-card.tsx                         → + CompareButton
  src/app/store/product/[slug]/page.tsx                              → + recently viewed tracking
  src/app/(dashboard)/dashboard/products/page.tsx                    → + checkboxes + BulkActionBar
  src/app/(dashboard)/dashboard/orders/page.tsx                      → + checkboxes + BulkActionBar

لا يوجد Migration — لا جداول جديدة:
  فقط 2 حقول JSONB (StoreSettings) لا تحتاج migration
```

---

## 6. تغييرات مشتركة على StoreSettings

> **يُنفَّذ أولاً** — لأن المقارنة تعتمد عليه.

### الحقول الجديدة في StoreSettings (src/db/schema.ts)

أضف بعد حقول P4-B مباشرة (بعد `facebookConversionApiEnabled: false`):

```typescript
  // === P4-D: Product Comparison ===
  comparisonEnabled: boolean        // default: true
  comparisonMaxItems: number        // default: 4
```

### Default values (في `settings` default في stores table):

في ملف `src/db/schema.ts`، في تعريف جدول `stores`، في `settings` default:

بعد السطر:
```typescript
    facebookConversionApiEnabled: false,
```

أضف:
```typescript
    // P4-D
    comparisonEnabled: true,
    comparisonMaxItems: 4,
```

### تعديل Validations (src/lib/validations/store.ts)

أضف في `updateStoreSettingsSchema` بعد حقول P4-B (بعد `reviewLoyaltyPoints`):

```typescript
  // P4-D: Product Comparison
  comparisonEnabled: z.boolean().optional(),
  comparisonMaxItems: z.number().int().min(2).max(6).optional(),
```

**مكان الإضافة بالضبط** — بعد هذا الكود:

```typescript
  // P4-B: Auto Review Request
  autoReviewRequestEnabled: z.boolean().optional(),
  reviewRequestDelay: z.number().int().min(1).max(72).optional(),
  reviewRequestChannel: z.enum(['email', 'whatsapp', 'both']).optional(),
  reviewLoyaltyPoints: z.number().int().min(0).max(100).optional(),
```

أضف مباشرة:

```typescript
  // P4-D: Product Comparison
  comparisonEnabled: z.boolean().optional(),
  comparisonMaxItems: z.number().int().min(2).max(6).optional(),
})
```

### تحديث StoreSettings type

في ملف `src/db/schema.ts`، في تعريف `StoreSettings` type:

أضف بعد حقول P4-B:

```typescript
  // P4-D: Product Comparison
  comparisonEnabled: boolean
  comparisonMaxItems: number
```

---

## 1. فلترة متقدمة (Advanced Filters)

### 1.1 تعديل `getStorefrontProducts()` — إضافة فلاتر متقدمة

> **ملف**: `src/lib/queries/storefront.ts`

**الوضع الحالي**: الدالة تدعم `categoryId`, `search`, `featured`, `page`, `limit`, `sort` فقط.

**المطلوب**: إضافة `minPrice`, `maxPrice`, `rating`, `inStock`, `onSale`.

عدّل الـ `options` type وأضف الشروط الجديدة:

```typescript
import { db } from '@/db'
import {
  storeProducts,
  storeCategories,
  storeHeroSlides,
  storePages,
  storeReviews,
  stores,
  storeProductRelations,
} from '@/db/schema'
import { eq, and, desc, asc, ilike, count, ne, inArray, gte, lte, gt, sql } from 'drizzle-orm'
import { escapeLike } from '@/lib/utils'
```

عدّل `getStorefrontProducts`:

```typescript
export async function getStorefrontProducts(
  storeId: string,
  options?: {
    categoryId?: string
    search?: string
    featured?: boolean
    page?: number
    limit?: number
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'name'
    // P4-D: Advanced Filters
    minPrice?: number
    maxPrice?: number
    rating?: number      // minimum rating (1-5)
    inStock?: boolean    // true = فقط المتوفر
    onSale?: boolean     // true = فقط اللي عليه خصم
  }
) {
  const {
    categoryId,
    search,
    featured,
    page = 1,
    limit = 20,
    sort = 'newest',
    minPrice,
    maxPrice,
    rating,
    inStock,
    onSale,
  } = options ?? {}

  const conditions = [
    eq(storeProducts.storeId, storeId),
    eq(storeProducts.isActive, true),
  ]

  if (categoryId) conditions.push(eq(storeProducts.categoryId, categoryId))
  if (search) conditions.push(ilike(storeProducts.name, `%${escapeLike(search)}%`))
  if (featured) conditions.push(eq(storeProducts.isFeatured, true))

  // P4-D: Advanced Filters
  if (minPrice !== undefined && minPrice >= 0) {
    conditions.push(gte(storeProducts.price, String(minPrice)))
  }
  if (maxPrice !== undefined && maxPrice > 0) {
    conditions.push(lte(storeProducts.price, String(maxPrice)))
  }
  if (inStock) {
    conditions.push(gt(storeProducts.stock, 0))
  }
  if (onSale) {
    // المنتج عليه خصم = compareAtPrice موجود وأكبر من price
    conditions.push(
      sql`${storeProducts.compareAtPrice} IS NOT NULL AND ${storeProducts.compareAtPrice}::numeric > ${storeProducts.price}::numeric`
    )
  }

  const orderBy =
    sort === 'price-asc' ? asc(storeProducts.price) :
    sort === 'price-desc' ? desc(storeProducts.price) :
    sort === 'name' ? asc(storeProducts.name) :
    desc(storeProducts.createdAt)

  const offset = (page - 1) * limit

  const totalResult = await db
    .select({ count: count() })
    .from(storeProducts)
    .where(and(...conditions))

  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  return {
    products,
    total: totalResult[0]?.count ?? 0,
    page,
    totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
  }
}
```

> **ملاحظة عن فلتر Rating**: الـ rating محسوب من `storeReviews` وليس عمود في `storeProducts`.  
> لو أردنا فلترة حقيقية بالتقييم، نحتاج subquery أو denormalized field.  
> **الحل العملي**: نجلب المنتجات أولاً، ثم نفلتر بالتقييم client-side بعد جلب `ratingsMap`.  
> **أو** نضيف post-filter في الدالة نفسها بعد جلب البيانات.

#### إضافة فلتر Rating بـ post-filter:

بعد ما نجلب المنتجات، لو `rating` موجود:

```typescript
  // عدّل الدالة بالكامل — بعد جلب products مباشرة:
  let filteredProducts = products

  if (rating && rating >= 1 && rating <= 5) {
    // جلب التقييمات لكل المنتجات
    const productIds = products.map(p => p.id)
    if (productIds.length > 0) {
      const ratingsResult = await db
        .select({
          productId: storeReviews.productId,
          avgRating: sql<number>`avg(${storeReviews.rating})`.as('avg_rating'),
        })
        .from(storeReviews)
        .where(
          and(
            eq(storeReviews.storeId, storeId),
            eq(storeReviews.isApproved, true),
            inArray(storeReviews.productId, productIds),
          )
        )
        .groupBy(storeReviews.productId)

      const ratingsMap = new Map(ratingsResult.map(r => [r.productId, Number(r.avgRating)]))

      // فلتر: فقط المنتجات بتقييم >= rating المطلوب
      filteredProducts = products.filter(p => {
        const avgRating = ratingsMap.get(p.id)
        return avgRating !== undefined && avgRating >= rating
      })
    } else {
      filteredProducts = []
    }
  }

  // ملاحظة: لما rating filter ينقص العدد، الـ total و totalPages محتاجين تحديث
  // لكن ده acceptable limitation — الفلاتر الأخرى (السعر و المخزون) بتشتغل DB-level
  return {
    products: filteredProducts,
    total: rating ? filteredProducts.length : (totalResult[0]?.count ?? 0),
    page,
    totalPages: rating
      ? Math.ceil(filteredProducts.length / limit)
      : Math.ceil((totalResult[0]?.count ?? 0) / limit),
  }
```

> **هام**: لو عاوز rating filter أدق (مع pagination صحيحة)، الحل المثالي هو إضافة `avgRating` column في `storeProducts` كـ denormalized field يتحدّث عند كل review. لكن ده خارج scope P4-D.

### 1.2 تعديل صفحة التصنيف — إضافة فلاتر و pagination

> **ملف**: `src/app/store/category/[slug]/page.tsx`

**الوضع الحالي**: الصفحة بتجلب كل المنتجات بدون فلاتر ولا pagination.

**المطلوب**: إضافة URL-based filters + pagination + مكونات الفلترة.

استبدل الملف بالكامل:

```tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { Reveal, StaggerGroup } from '@/components/motion'
import { Card } from '@/components/ui'
import { ProductCard } from '@/app/store/_components/product-card'
import {
  buildCategorySlugSegment,
  decodeCategorySegment,
  parseCategorySlugSegment,
} from '@/lib/categories/category-slug'
import { getStorefrontProducts } from '@/lib/queries/storefront'
import { resolveStorefrontCategory } from '@/lib/queries/storefront'
import { getProductRatings } from '@/lib/queries/product-ratings'
import { translateProducts } from '@/lib/products/translate'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { PaginationBar } from '@/components/patterns'
import { FilterSidebar } from './_components/filter-sidebar'
import { FilterDrawer } from './_components/filter-drawer'
import { SortSelect } from './_components/sort-select'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseFilters(raw: Record<string, string | string[] | undefined>) {
  const minPrice = Number(getFirstParam(raw.minPrice))
  const maxPrice = Number(getFirstParam(raw.maxPrice))
  const rating = Number(getFirstParam(raw.rating))
  const page = Number(getFirstParam(raw.page)) || 1
  const limit = 20
  const sort = (getFirstParam(raw.sort) || 'newest') as 'newest' | 'price-asc' | 'price-desc' | 'name'
  const inStock = getFirstParam(raw.inStock) === 'true'
  const onSale = getFirstParam(raw.onSale) === 'true'

  return {
    minPrice: !isNaN(minPrice) && minPrice > 0 ? minPrice : undefined,
    maxPrice: !isNaN(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
    rating: !isNaN(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    inStock: inStock || undefined,
    onSale: onSale || undefined,
    sort,
    page,
    limit,
  }
}

function buildFilterQuery(
  categorySegment: string,
  filters: ReturnType<typeof parseFilters>,
  patch: Partial<ReturnType<typeof parseFilters>>
) {
  const next = { ...filters, ...patch }
  const params = new URLSearchParams()
  if (next.minPrice) params.set('minPrice', String(next.minPrice))
  if (next.maxPrice) params.set('maxPrice', String(next.maxPrice))
  if (next.rating) params.set('rating', String(next.rating))
  if (next.inStock) params.set('inStock', 'true')
  if (next.onSale) params.set('onSale', 'true')
  if (next.sort && next.sort !== 'newest') params.set('sort', next.sort)
  if (next.page && next.page > 1) params.set('page', String(next.page))

  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

async function resolveCategoryBySegment(storeId: string, rawSegment: string) {
  const decodedSegment = decodeCategorySegment(rawSegment)
  const parsedSegment = parseCategorySlugSegment(decodedSegment)

  const category = await resolveStorefrontCategory(storeId, {
    categoryId: parsedSegment.categoryId,
    slug: parsedSegment.slug,
  })

  return { decodedSegment, category }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}

  const { slug } = await params
  const { category } = await resolveCategoryBySegment(store.id, slug)
  if (!category) return {}

  return {
    title: `${category.name} | ${store.name}`,
    description: category.description ?? `تصفّح منتجات ${category.name} في ${store.name}`,
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const rawParams = await searchParams
  const langParam = getFirstParam(rawParams.lang) || 'ar'

  const { decodedSegment, category } = await resolveCategoryBySegment(store.id, slug)
  if (!category) notFound()

  const canonicalSegment = buildCategorySlugSegment(category.id, category.slug)
  if (decodedSegment !== canonicalSegment) {
    redirect(storePath(`/category/${canonicalSegment}` as `/${string}`, { storeSlug: store.slug }))
  }

  const filters = parseFilters(rawParams)

  // جلب المنتجات مع الفلاتر
  const result = await getStorefrontProducts(store.id, {
    categoryId: category.id,
    ...filters,
  })

  const products = translateProducts(result.products, langParam)
  const ratingsMap = await getProductRatings(store.id, products.map(p => p.id))

  const hasPrevPage = result.page > 1
  const hasNextPage = result.page < result.totalPages

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="ds-hero-panel px-6 py-8 sm:px-8">
        <Reveal className="space-y-3">
          <span className="ds-pill text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            تصفح من داخل القسم المناسب
          </span>
          <h1 className="ds-heading text-3xl font-black text-[var(--ds-text)] md:text-5xl">{category.name}</h1>
          <p className="max-w-2xl text-sm leading-8 text-[var(--ds-text-muted)] md:text-base">
            {category.description ?? `اكتشف أفضل المنتجات الموجودة داخل قسم ${category.name}.`}
          </p>
        </Reveal>
      </section>

      {/* Controls bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FilterDrawer
            filters={filters}
            categorySegment={canonicalSegment}
          />
          <p className="text-sm text-[var(--ds-text-muted)]">
            {result.total} منتج
          </p>
        </div>
        <SortSelect
          currentSort={filters.sort}
          categorySegment={canonicalSegment}
          filters={filters}
        />
      </div>

      {/* Content */}
      <div className="mt-6 flex gap-6">
        {/* Sidebar — Desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterSidebar
            filters={filters}
            categorySegment={canonicalSegment}
          />
        </aside>

        {/* Products Grid */}
        <section className="flex-1">
          {products.length > 0 ? (
            <>
              <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={80}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    storeSlug={store.slug}
                    name={product.name}
                    slug={product.slug}
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    images={product.images}
                    stock={product.stock}
                    isFeatured={product.isFeatured}
                    variants={product.variants}
                    currency={store.settings.currency}
                    avgRating={ratingsMap.get(product.id)?.avgRating}
                    totalReviews={ratingsMap.get(product.id)?.totalReviews}
                  />
                ))}
              </StaggerGroup>

              {result.totalPages > 1 && (
                <div className="mt-8">
                  <PaginationBar
                    page={result.page}
                    totalPages={result.totalPages}
                    summary={`صفحة ${result.page} من ${result.totalPages} (إجمالي ${result.total})`}
                    prevHref={hasPrevPage
                      ? storePath(buildFilterQuery(canonicalSegment, filters, { page: result.page - 1 }) as `/${string}`, { storeSlug: store.slug })
                      : undefined}
                    nextHref={hasNextPage
                      ? storePath(buildFilterQuery(canonicalSegment, filters, { page: result.page + 1 }) as `/${string}`, { storeSlug: store.slug })
                      : undefined}
                  />
                </div>
              )}
            </>
          ) : (
            <Card variant="feature" className="mx-auto max-w-xl px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--ds-text)]">لا توجد منتجات مطابقة</h2>
              <p className="mt-2 text-sm text-[var(--ds-text-muted)]">جرّب تغيير الفلاتر الحالية أو مسحها.</p>
              <div className="mt-6">
                <Link
                  href={storePath(`/category/${canonicalSegment}` as `/${string}`, { storeSlug: store.slug })}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
                  style={{ backgroundColor: 'var(--color-primary, #000)' }}
                >
                  مسح الفلاتر
                </Link>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
```

### 1.3 مكون FilterSidebar (Desktop)

> **ملف جديد**: `src/app/store/category/[slug]/_components/filter-sidebar.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStoreContext } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import { PriceRangeSlider } from './price-range-slider'
import { RatingFilter } from './rating-filter'

type FilterValues = {
  minPrice?: number
  maxPrice?: number
  rating?: number
  inStock?: boolean
  onSale?: boolean
  sort: string
  page: number
  limit: number
}

type FilterSidebarProps = {
  filters: FilterValues
  categorySegment: string
}

function buildUrl(categorySegment: string, filters: FilterValues) {
  const params = new URLSearchParams()
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
  if (filters.rating) params.set('rating', String(filters.rating))
  if (filters.inStock) params.set('inStock', 'true')
  if (filters.onSale) params.set('onSale', 'true')
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort)
  // عند تغيير الفلاتر نرجع لصفحة 1
  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

export function FilterSidebar({ filters, categorySegment }: FilterSidebarProps) {
  const router = useRouter()
  const { store } = useStoreContext()
  const [localFilters, setLocalFilters] = useState(filters)

  const hasActiveFilters = !!(
    localFilters.minPrice || localFilters.maxPrice || localFilters.rating || localFilters.inStock || localFilters.onSale
  )

  const applyFilters = useCallback(() => {
    const url = buildUrl(categorySegment, { ...localFilters, page: 1 })
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
  }, [localFilters, categorySegment, router, store.slug])

  const clearFilters = useCallback(() => {
    const cleared = { sort: 'newest', page: 1, limit: 20 } as FilterValues
    setLocalFilters(cleared)
    const url = `/category/${categorySegment}`
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
  }, [categorySegment, router, store.slug])

  return (
    <div className="sticky top-4 space-y-6 rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] p-5 shadow-[var(--ds-shadow-sm)]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ds-text)]">
          <SlidersHorizontal className="h-4 w-4" />
          الفلاتر
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            <X className="h-3 w-3" />
            مسح الكل
          </button>
        )}
      </div>

      {/* السعر */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">نطاق السعر ({store.settings.currency})</h4>
        <PriceRangeSlider
          minPrice={localFilters.minPrice}
          maxPrice={localFilters.maxPrice}
          currency={store.settings.currency}
          onChange={(min, max) => setLocalFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }))}
        />
      </div>

      {/* التقييم */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">التقييم</h4>
        <RatingFilter
          value={localFilters.rating}
          onChange={(r) => setLocalFilters(prev => ({ ...prev, rating: r }))}
        />
      </div>

      {/* التوفر */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">التوفر</h4>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ds-text)]">
          <input
            type="checkbox"
            checked={!!localFilters.inStock}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, inStock: e.target.checked || undefined }))}
            className="h-4 w-4 rounded border-[var(--ds-divider)] accent-[var(--color-primary,#000)]"
          />
          متوفر فقط
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ds-text)]">
          <input
            type="checkbox"
            checked={!!localFilters.onSale}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, onSale: e.target.checked || undefined }))}
            className="h-4 w-4 rounded border-[var(--ds-divider)] accent-[var(--color-primary,#000)]"
          />
          عروض فقط (بخصم)
        </label>
      </div>

      {/* أزرار */}
      <div className="space-y-2">
        <button
          onClick={applyFilters}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          تطبيق الفلاتر
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full rounded-xl border border-[var(--ds-divider)] py-2.5 text-sm font-medium text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-muted)]"
          >
            مسح الفلاتر
          </button>
        )}
      </div>
    </div>
  )
}
```

### 1.4 مكون FilterDrawer (Mobile)

> **ملف جديد**: `src/app/store/category/[slug]/_components/filter-drawer.tsx`

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStoreContext } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import { PriceRangeSlider } from './price-range-slider'
import { RatingFilter } from './rating-filter'

type FilterValues = {
  minPrice?: number
  maxPrice?: number
  rating?: number
  inStock?: boolean
  onSale?: boolean
  sort: string
  page: number
  limit: number
}

type FilterDrawerProps = {
  filters: FilterValues
  categorySegment: string
}

function buildUrl(categorySegment: string, filters: FilterValues) {
  const params = new URLSearchParams()
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
  if (filters.rating) params.set('rating', String(filters.rating))
  if (filters.inStock) params.set('inStock', 'true')
  if (filters.onSale) params.set('onSale', 'true')
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort)
  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

export function FilterDrawer({ filters, categorySegment }: FilterDrawerProps) {
  const router = useRouter()
  const { store } = useStoreContext()
  const [open, setOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters)

  const hasActiveFilters = !!(
    filters.minPrice || filters.maxPrice || filters.rating || filters.inStock || filters.onSale
  )

  const applyFilters = useCallback(() => {
    const url = buildUrl(categorySegment, { ...localFilters, page: 1 })
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
    setOpen(false)
  }, [localFilters, categorySegment, router, store.slug])

  const clearFilters = useCallback(() => {
    const cleared = { sort: filters.sort, page: 1, limit: 20 } as FilterValues
    setLocalFilters(cleared)
    const url = `/category/${categorySegment}`
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
    setOpen(false)
  }, [categorySegment, router, store.slug, filters.sort])

  return (
    <>
      {/* Trigger Button — visible on mobile only */}
      <button
        onClick={() => { setLocalFilters(filters); setOpen(true) }}
        className="flex items-center gap-2 rounded-xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-3 py-2 text-sm font-medium text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        الفلاتر
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--color-primary, #000)' }}>
            !
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-80 max-w-[85vw] overflow-y-auto bg-[var(--surface-card,#fff)] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ds-text)]">
                <SlidersHorizontal className="h-4 w-4" />
                الفلاتر
              </h3>
              <button onClick={() => setOpen(false)} className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* السعر */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">نطاق السعر ({store.settings.currency})</h4>
                <PriceRangeSlider
                  minPrice={localFilters.minPrice}
                  maxPrice={localFilters.maxPrice}
                  currency={store.settings.currency}
                  onChange={(min, max) => setLocalFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }))}
                />
              </div>

              {/* التقييم */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">التقييم</h4>
                <RatingFilter
                  value={localFilters.rating}
                  onChange={(r) => setLocalFilters(prev => ({ ...prev, rating: r }))}
                />
              </div>

              {/* التوفر */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">التوفر</h4>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ds-text)]">
                  <input
                    type="checkbox"
                    checked={!!localFilters.inStock}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, inStock: e.target.checked || undefined }))}
                    className="h-4 w-4 rounded border-[var(--ds-divider)] accent-[var(--color-primary,#000)]"
                  />
                  متوفر فقط
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ds-text)]">
                  <input
                    type="checkbox"
                    checked={!!localFilters.onSale}
                    onChange={(e) => setLocalFilters(prev => ({ ...prev, onSale: e.target.checked || undefined }))}
                    className="h-4 w-4 rounded border-[var(--ds-divider)] accent-[var(--color-primary,#000)]"
                  />
                  عروض فقط (بخصم)
                </label>
              </div>

              {/* أزرار */}
              <div className="space-y-2">
                <button
                  onClick={applyFilters}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary, #000)' }}
                >
                  تطبيق الفلاتر
                </button>
                <button
                  onClick={clearFilters}
                  className="w-full rounded-xl border border-[var(--ds-divider)] py-2.5 text-sm font-medium text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-muted)]"
                >
                  مسح الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### 1.5 مكون PriceRangeSlider

> **ملف جديد**: `src/app/store/category/[slug]/_components/price-range-slider.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'

type PriceRangeSliderProps = {
  minPrice?: number
  maxPrice?: number
  currency: string
  onChange: (min: number | undefined, max: number | undefined) => void
}

export function PriceRangeSlider({ minPrice, maxPrice, currency, onChange }: PriceRangeSliderProps) {
  const [min, setMin] = useState(minPrice?.toString() ?? '')
  const [max, setMax] = useState(maxPrice?.toString() ?? '')

  // Sync with parent when filters change (e.g., clear)
  useEffect(() => {
    setMin(minPrice?.toString() ?? '')
    setMax(maxPrice?.toString() ?? '')
  }, [minPrice, maxPrice])

  const handleMinBlur = () => {
    const val = Number(min)
    onChange(val > 0 ? val : undefined, maxPrice)
  }

  const handleMaxBlur = () => {
    const val = Number(max)
    onChange(minPrice, val > 0 ? val : undefined)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="من"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={handleMinBlur}
          min={0}
          className="w-full rounded-lg border border-[var(--ds-divider)] bg-transparent px-3 py-2 text-center text-sm text-[var(--ds-text)] outline-none focus:border-[var(--color-primary,#000)]"
        />
      </div>
      <span className="text-xs text-[var(--ds-text-muted)]">—</span>
      <div className="flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="إلى"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={handleMaxBlur}
          min={0}
          className="w-full rounded-lg border border-[var(--ds-divider)] bg-transparent px-3 py-2 text-center text-sm text-[var(--ds-text)] outline-none focus:border-[var(--color-primary,#000)]"
        />
      </div>
      <span className="text-xs text-[var(--ds-text-muted)]">{currency}</span>
    </div>
  )
}
```

### 1.6 مكون RatingFilter

> **ملف جديد**: `src/app/store/category/[slug]/_components/rating-filter.tsx`

```tsx
'use client'

import { Star } from 'lucide-react'

type RatingFilterProps = {
  value?: number
  onChange: (rating: number | undefined) => void
}

const RATINGS = [4, 3, 2, 1] as const

export function RatingFilter({ value, onChange }: RatingFilterProps) {
  return (
    <div className="space-y-2">
      {RATINGS.map((rating) => (
        <label key={rating} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="rating-filter"
            checked={value === rating}
            onChange={() => onChange(value === rating ? undefined : rating)}
            className="h-4 w-4 accent-[var(--color-primary,#000)]"
          />
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </span>
          <span className="text-xs text-[var(--ds-text-muted)]">وأكثر</span>
        </label>
      ))}

      {value && (
        <button
          onClick={() => onChange(undefined)}
          className="text-xs text-[var(--ds-text-muted)] underline hover:text-[var(--ds-text)]"
        >
          إلغاء فلتر التقييم
        </button>
      )}
    </div>
  )
}
```

### 1.7 مكون SortSelect

> **ملف جديد**: `src/app/store/category/[slug]/_components/sort-select.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useStoreContext } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'

type SortSelectProps = {
  currentSort: string
  categorySegment: string
  filters: {
    minPrice?: number
    maxPrice?: number
    rating?: number
    inStock?: boolean
    onSale?: boolean
    sort: string
    page: number
    limit: number
  }
}

function buildUrl(categorySegment: string, filters: SortSelectProps['filters'], sort: string) {
  const params = new URLSearchParams()
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
  if (filters.rating) params.set('rating', String(filters.rating))
  if (filters.inStock) params.set('inStock', 'true')
  if (filters.onSale) params.set('onSale', 'true')
  if (sort !== 'newest') params.set('sort', sort)
  // Reset to page 1 on sort change
  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

export function SortSelect({ currentSort, categorySegment, filters }: SortSelectProps) {
  const router = useRouter()
  const { store } = useStoreContext()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = buildUrl(categorySegment, filters, e.target.value)
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
  }

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="rounded-xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-3 py-2 text-sm text-[var(--ds-text)] outline-none shadow-[var(--ds-shadow-sm)]"
    >
      <option value="newest">الأحدث</option>
      <option value="price-asc">السعر: الأقل أولاً</option>
      <option value="price-desc">السعر: الأعلى أولاً</option>
      <option value="name">الاسم</option>
    </select>
  )
}
```

---

## 2. مقارنة المنتجات (Product Comparison)

### 2.1 Zustand Store — compare-store.ts

> **ملف جديد**: `src/lib/stores/compare-store.ts`

**نمط مطابق لـ `wishlist-store.ts`**:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CompareItem = {
  productId: string
  addedAt: number
}

type CompareStore = {
  items: CompareItem[]
  maxItems: number

  setMaxItems: (max: number) => void
  addItem: (productId: string) => boolean
  removeItem: (productId: string) => void
  isInCompare: (productId: string) => boolean
  clear: () => void
  getItems: () => CompareItem[]
  getCount: () => number
  isFull: () => boolean
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 4,

      setMaxItems: (max) => set({ maxItems: max }),

      addItem: (productId) => {
        const { items, maxItems } = get()
        if (items.some(i => i.productId === productId)) return false
        if (items.length >= maxItems) return false

        set((state) => ({
          items: [...state.items, { productId, addedAt: Date.now() }],
        }))
        return true
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId),
        }))
      },

      isInCompare: (productId) => {
        return get().items.some(i => i.productId === productId)
      },

      clear: () => set({ items: [] }),

      getItems: () => get().items,

      getCount: () => get().items.length,

      isFull: () => {
        const { items, maxItems } = get()
        return items.length >= maxItems
      },
    }),
    {
      name: 'matjary-compare',
    }
  )
)
```

### 2.2 زر المقارنة — compare-button.tsx

> **ملف جديد**: `src/app/store/_components/compare-button.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { useCompareStore } from '@/lib/stores/compare-store'

type CompareButtonProps = {
  productId: string
  size?: 'sm' | 'md'
}

export function CompareButton({ productId, size = 'sm' }: CompareButtonProps) {
  const { addItem, removeItem, isInCompare, isFull } = useCompareStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const inCompare = isInCompare(productId)
  const full = isFull()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (inCompare) {
      removeItem(productId)
    } else if (!full) {
      addItem(productId)
    }
  }

  const sizeClasses = size === 'sm'
    ? 'h-8 w-8'
    : 'h-10 w-10'

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'

  return (
    <button
      onClick={handleClick}
      disabled={!inCompare && full}
      title={inCompare ? 'إزالة من المقارنة' : full ? 'الحد الأقصى للمقارنة' : 'أضف للمقارنة'}
      className={`flex items-center justify-center rounded-full border shadow-[var(--ds-shadow-sm)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${
        inCompare
          ? 'border-[var(--color-primary,#000)] bg-[var(--color-primary,#000)] text-white'
          : 'border-[var(--ds-divider)] bg-white/90 text-[var(--ds-text-muted)] backdrop-blur-sm hover:border-[var(--color-primary,#000)] hover:text-[var(--color-primary,#000)]'
      }`}
    >
      <GitCompareArrows className={iconSize} />
    </button>
  )
}
```

### 2.3 تعديل ProductCard — إضافة CompareButton

> **ملف**: `src/app/store/_components/product-card.tsx`

في قسم الأزرار (بعد `WishlistButton`):

**أضف الـ import**:
```typescript
import { CompareButton } from './compare-button'
```

**أضف الزر** بعد `<WishlistButton productId={id} size="sm" />`:

```tsx
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <WishlistButton productId={id} size="sm" />
          <CompareButton productId={id} size="sm" />
```

**هام**: `CompareButton` بتعمل `e.preventDefault()` و `e.stopPropagation()` — فالـ `<Link>` wrapper مش هيتنقل.

### 2.4 شريط المقارنة العائم — compare-float.tsx

> **ملف جديد**: `src/app/store/_components/compare-float.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GitCompareArrows, X } from 'lucide-react'
import { useCompareStore } from '@/lib/stores/compare-store'
import { useStoreContext } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'

export function CompareFloat() {
  const { items, clear, removeItem } = useCompareStore()
  const { store } = useStoreContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || items.length === 0) return null

  return (
    <div className="fixed bottom-4 start-4 z-40 flex items-center gap-3 rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-4 py-3 shadow-[var(--ds-shadow-lg)]">
      <div className="flex items-center gap-2">
        <GitCompareArrows className="h-5 w-5 text-[var(--color-primary,#000)]" />
        <span className="text-sm font-semibold text-[var(--ds-text)]">
          {items.length} منتجات للمقارنة
        </span>
      </div>

      <Link
        href={storePath('/compare' as `/${string}`, { storeSlug: store.slug })}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-primary, #000)' }}
      >
        قارن الآن
      </Link>

      <button
        onClick={clear}
        className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        title="مسح الكل"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
```

**إضافة CompareFloat في store layout** — في `src/app/store/layout.tsx`:

أضف الـ import:
```typescript
import { CompareFloat } from './_components/compare-float'
```

أضف المكون بعد `<ExitIntentPopup>` (أو في نهاية الـ layout children):
```tsx
        <CompareFloat />
```

### 2.5 صفحة المقارنة — compare/page.tsx

> **ملف جديد**: `src/app/store/compare/page.tsx`

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { ComparePageContent } from './_components/compare-page-content'

export const metadata: Metadata = {
  title: 'مقارنة المنتجات',
}

export default async function ComparePage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  return <ComparePageContent storeId={store.id} storeSlug={store.slug} currency={store.settings.currency} />
}
```

> **ملف جديد**: `src/app/store/compare/_components/compare-page-content.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Star, ShoppingBag, GitCompareArrows } from 'lucide-react'
import { useCompareStore } from '@/lib/stores/compare-store'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'

type CompareProduct = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
  isFeatured: boolean
  shortDescription: string | null
  avgRating?: number
  totalReviews?: number
  categoryName?: string
}

type ComparePageContentProps = {
  storeId: string
  storeSlug: string
  currency: string
}

export function ComparePageContent({ storeId, storeSlug, currency }: ComparePageContentProps) {
  const { items, removeItem, clear } = useCompareStore()
  const [products, setProducts] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    const fetchProducts = async () => {
      setLoading(true)
      try {
        const ids = items.map(i => i.productId).join(',')
        const res = await fetch(`/api/storefront/products?ids=${encodeURIComponent(ids)}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.data ?? [])
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [items])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary,#000)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-6 py-14 text-center shadow-[var(--ds-shadow-sm)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
            <GitCompareArrows className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--ds-text)]">لا توجد منتجات للمقارنة</h1>
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">أضف منتجات للمقارنة من صفحات المنتجات أو التصنيفات.</p>
          <div className="mt-6">
            <Link
              href={storePath('/', { storeSlug })}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              تصفح المنتجات
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rows: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
    {
      label: 'الصورة',
      render: (p) => p.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.images[0]} alt={p.name} className="mx-auto h-32 w-32 rounded-xl object-cover" />
      ) : (
        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-xl bg-[var(--ds-surface-muted)] text-xs text-[var(--ds-text-soft)]">لا صورة</div>
      ),
    },
    {
      label: 'الاسم',
      render: (p) => (
        <Link
          href={storePath(`/product/${p.slug}` as `/${string}`, { storeSlug })}
          className="font-semibold text-[var(--ds-text)] hover:underline"
        >
          {p.name}
        </Link>
      ),
    },
    {
      label: 'السعر',
      render: (p) => (
        <div>
          <span className="text-lg font-black" style={{ color: 'var(--color-primary, #000)' }}>
            {formatPrice(Number(p.price), currency)}
          </span>
          {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && (
            <span className="mr-2 text-xs text-[var(--ds-text-muted)] line-through">
              {formatPrice(Number(p.compareAtPrice), currency)}
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'التوفر',
      render: (p) => (
        <span className={p.stock > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
          {p.stock > 0 ? 'متوفر' : 'غير متوفر'}
        </span>
      ),
    },
    {
      label: 'التقييم',
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          {p.avgRating != null && p.totalReviews != null && p.totalReviews > 0 ? (
            <>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(p.avgRating!) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs text-[var(--ds-text-muted)]">({p.totalReviews})</span>
            </>
          ) : (
            <span className="text-xs text-[var(--ds-text-muted)]">لا تقييمات</span>
          )}
        </div>
      ),
    },
    {
      label: 'الوصف',
      render: (p) => (
        <p className="line-clamp-3 text-sm text-[var(--ds-text-muted)]">{p.shortDescription ?? '—'}</p>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[var(--ds-text)]">مقارنة المنتجات</h1>
        <button
          onClick={clear}
          className="text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        >
          مسح الكل
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="w-28" />
              {products.map((product) => (
                <th key={product.id} className="px-4 py-3 text-center">
                  <button
                    onClick={() => removeItem(product.id)}
                    className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ds-divider)] text-[var(--ds-text-muted)] hover:border-red-300 hover:text-red-500"
                    title="إزالة من المقارنة"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--ds-divider)]">
                <td className="px-4 py-3 text-sm font-semibold text-[var(--ds-text-muted)]">{row.label}</td>
                {products.map((product) => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### 2.6 API Route — جلب منتجات بالـ IDs

> **ملف جديد**: `src/app/api/storefront/products/route.ts`

> **ملاحظة**: هذا الـ route يخدم صفحة المقارنة — يجلب منتجات بـ IDs محددة.  
> لو الـ route موجود بالفعل (ممكن يكون اتعمل في P4-C أو قبلها)، عدّله بدل ما تنشئه.

```typescript
import 'server-only'
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeProducts, storeReviews } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, handleApiError } from '@/lib/api/response'

/**
 * GET /api/storefront/products?ids=uuid1,uuid2,uuid3
 * جلب منتجات بـ IDs — يُستخدم في صفحة المقارنة
 */
export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return new Response('المتجر غير موجود', { status: 404 })

    const idsParam = request.nextUrl.searchParams.get('ids')
    if (!idsParam) return apiSuccess({ data: [] })

    const ids = idsParam.split(',').filter(Boolean).slice(0, 10) // max 10
    if (ids.length === 0) return apiSuccess({ data: [] })

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validIds = ids.filter(id => uuidRegex.test(id))
    if (validIds.length === 0) return apiSuccess({ data: [] })

    const products = await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        price: storeProducts.price,
        compareAtPrice: storeProducts.compareAtPrice,
        images: storeProducts.images,
        shortDescription: storeProducts.shortDescription,
        stock: storeProducts.stock,
        isFeatured: storeProducts.isFeatured,
        variants: storeProducts.variants,
      })
      .from(storeProducts)
      .where(
        and(
          eq(storeProducts.storeId, store.id),
          eq(storeProducts.isActive, true),
          inArray(storeProducts.id, validIds),
        )
      )

    // جلب التقييمات
    const ratingsResult = await db
      .select({
        productId: storeReviews.productId,
        avgRating: sql<number>`avg(${storeReviews.rating})`.as('avg_rating'),
        totalReviews: sql<number>`count(*)::int`.as('total_reviews'),
      })
      .from(storeReviews)
      .where(
        and(
          eq(storeReviews.storeId, store.id),
          eq(storeReviews.isApproved, true),
          inArray(storeReviews.productId, validIds),
        )
      )
      .groupBy(storeReviews.productId)

    const ratingsMap = new Map(ratingsResult.map(r => [r.productId, { avgRating: Number(r.avgRating), totalReviews: r.totalReviews }]))

    const enriched = products.map(p => ({
      ...p,
      avgRating: ratingsMap.get(p.id)?.avgRating ?? null,
      totalReviews: ratingsMap.get(p.id)?.totalReviews ?? 0,
    }))

    return apiSuccess({ data: enriched })
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

## 3. شاهدته مؤخراً (Recently Viewed)

### 3.1 Zustand Store — recently-viewed-store.ts

> **ملف جديد**: `src/lib/stores/recently-viewed-store.ts`

**نمط مطابق لـ `wishlist-store.ts`**:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RecentlyViewedItem = {
  productId: string
  viewedAt: number
}

type RecentlyViewedStore = {
  items: RecentlyViewedItem[]

  addItem: (productId: string) => void
  getItems: () => RecentlyViewedItem[]
  clearAll: () => void
}

const MAX_ITEMS = 10

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId) => {
        set((state) => {
          // إزالة نسخة قديمة لو موجودة (لتحديث الوقت)
          const filtered = state.items.filter(i => i.productId !== productId)
          // إضافة في الأول
          const updated = [{ productId, viewedAt: Date.now() }, ...filtered]
          // الحد الأقصى 10
          return { items: updated.slice(0, MAX_ITEMS) }
        })
      },

      getItems: () => get().items,

      clearAll: () => set({ items: [] }),
    }),
    {
      name: 'matjary-recently-viewed',
    }
  )
)
```

### 3.2 تتبع المشاهدة في صفحة المنتج

> **ملف**: `src/app/store/product/[slug]/page.tsx`

أضف مكون `TrackRecentlyViewed` في الصفحة:

**أولاً** — أنشئ مكون التتبع (client component):

> **ملف جديد**: `src/app/store/product/[slug]/_components/track-recently-viewed.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed-store'

export function TrackRecentlyViewed({ productId }: { productId: string }) {
  const addItem = useRecentlyViewedStore(state => state.addItem)

  useEffect(() => {
    addItem(productId)
  }, [productId, addItem])

  return null
}
```

**ثانياً** — في `src/app/store/product/[slug]/page.tsx`:

أضف الـ import:
```typescript
import { TrackRecentlyViewed } from './_components/track-recently-viewed'
```

أضف المكون في الـ return (قبل `<ProductDetails>` مثلاً):
```tsx
      <TrackRecentlyViewed productId={product.id} />
```

### 3.3 قسم "شاهدته مؤخراً"

> **ملف جديد**: `src/app/store/_components/recently-viewed-section.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed-store'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'
import Link from 'next/link'

type RecentProduct = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
}

type RecentlyViewedSectionProps = {
  storeSlug: string
  currency: string
  excludeProductId?: string
}

export function RecentlyViewedSection({ storeSlug, currency, excludeProductId }: RecentlyViewedSectionProps) {
  const items = useRecentlyViewedStore(state => state.items)
  const [products, setProducts] = useState<RecentProduct[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || items.length === 0) return

    const productIds = items
      .map(i => i.productId)
      .filter(id => id !== excludeProductId)
      .slice(0, 6)

    if (productIds.length === 0) {
      setProducts([])
      return
    }

    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/storefront/products?ids=${encodeURIComponent(productIds.join(','))}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.data ?? [])
        }
      } catch {
        // silent
      }
    }

    fetchProducts()
  }, [items, mounted, excludeProductId])

  if (!mounted || products.length === 0) return null

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5 text-[var(--color-primary,#000)]" />
        <h2 className="text-xl font-bold text-[var(--ds-text)]">شاهدته مؤخراً</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {products.map((product) => {
          const numericPrice = Number(product.price)
          const numericCompare = product.compareAtPrice ? Number(product.compareAtPrice) : null
          const hasDiscount = numericCompare !== null && numericCompare > numericPrice

          return (
            <Link
              key={product.id}
              href={storePath(`/product/${product.slug}` as `/${string}`, { storeSlug })}
              className="group flex w-40 shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] shadow-[var(--ds-shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--ds-shadow-lg)]"
            >
              <div className="aspect-square overflow-hidden bg-[var(--surface-muted,#f1f5f9)]">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--ds-text-soft)]">لا صورة</div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-[var(--ds-text)]">{product.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary, #000)' }}>
                    {formatPrice(numericPrice, currency)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-[var(--ds-text-muted)] line-through">
                      {formatPrice(numericCompare, currency)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
```

### 3.4 إضافة في الصفحة الرئيسية وصفحة المنتج

**في `src/app/store/page.tsx`** — أضف القسم بعد "أحدث المنتجات":

أضف الـ import:
```typescript
import { RecentlyViewedSection } from './_components/recently-viewed-section'
```

أضف في نهاية الصفحة (قبل إغلاق آخر `</div>`):
```tsx
      <RecentlyViewedSection storeSlug={store.slug} currency={store.settings.currency} />
```

**في `src/app/store/product/[slug]/page.tsx`** — أضف القسم بعد "المنتجات المشابهة":

أضف الـ import:
```typescript
import { RecentlyViewedSection } from '@/app/store/_components/recently-viewed-section'
```

أضف بعد قسم related products:
```tsx
      <RecentlyViewedSection
        storeSlug={store.slug}
        currency={store.settings.currency}
        excludeProductId={product.id}
      />
```

---

## 4. بار إضافة للسلة الثابت (Sticky Add-to-Cart)

### 4.1 المكون الرئيسي

> **ملف جديد**: `src/app/store/product/[slug]/_components/sticky-add-to-cart.tsx`

**نمط مطابق لـ `mobile-sticky-cart.tsx`** الموجود — لكن يعمل على **الشاشات الكبيرة** (الموبايل عنده المكون الموجود أصلاً):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type StickyAddToCartProps = {
  productName: string
  productImage: string | null
  price: number | null
  compareAtPrice?: number | null
  currency: string
  onAddToCart: () => void
  disabled?: boolean
  loading?: boolean
}

export function StickyAddToCart({
  productName,
  productImage,
  price,
  compareAtPrice,
  currency,
  onAddToCart,
  disabled = false,
  loading = false,
}: StickyAddToCartProps) {
  const [visible, setVisible] = useState(false)

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

  const hasDiscount =
    price !== null &&
    compareAtPrice !== null &&
    compareAtPrice !== undefined &&
    compareAtPrice > price

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t px-4 py-3 shadow-[0_-10px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-300 hidden md:block ${
        visible ? 'md:translate-y-0' : 'md:translate-y-full'
      }`}
      style={{
        borderColor: 'var(--border-strong, #e5e7eb)',
        backgroundColor: 'color-mix(in oklab, var(--color-secondary, #fff) 88%, white)',
      }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
        {/* Product Info */}
        <div className="flex items-center gap-3">
          {productImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImage} alt={productName} className="h-10 w-10 rounded-lg object-cover" />
          )}
          <span className="line-clamp-1 text-sm font-semibold text-[var(--ds-text)]">{productName}</span>
        </div>

        {/* Price + Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black" style={{ color: 'var(--color-primary, #000)' }}>
              {price !== null ? formatPrice(price, currency) : 'اختر التركيبة'}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(compareAtPrice, currency)}
              </span>
            )}
          </div>

          <button
            onClick={onAddToCart}
            disabled={disabled}
            className="flex items-center gap-2 rounded-[18px] px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            {loading ? (
              <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
            {loading ? 'جارٍ الإضافة...' : 'أضف إلى السلة'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

> **ملاحظة**: المكون يستخدم `hidden md:block` — يعني **يختفي على الموبايل** (لأن `MobileStickyCart` الموجود هو اللي بيظهر بـ `md:hidden`). النتيجة:
> - **موبايل** (`< md`): `MobileStickyCart` (الموجود) — شكل مبسط
> - **ديسكتوب** (`>= md`): `StickyAddToCart` (الجديد) — شكل موسّع مع صورة واسم

### 4.2 إضافة في صفحة المنتج

> **ملف**: `src/app/store/product/[slug]/page.tsx` أو `_components/product-details.tsx`

يحتاج يتعامل مع المكون الجديد بنفس طريقة `MobileStickyCart` الموجود.

**الإضافة المطلوبة**: في الملف اللي بيعرض `MobileStickyCart` (على الأغلب `product-details.tsx` أو الـ page نفسه):

أضف الـ import:
```typescript
import { StickyAddToCart } from './sticky-add-to-cart'
```

أضف المكون بجانب `<MobileStickyCart>`:
```tsx
      <StickyAddToCart
        productName={product.name}
        productImage={product.images[0] ?? null}
        price={effectivePrice}
        compareAtPrice={effectiveCompareAtPrice}
        currency={currency}
        onAddToCart={handleAddToCart}
        disabled={outOfStock}
        loading={addingToCart}
      />
```

> **هام**: `effectivePrice`, `handleAddToCart`, `addingToCart`, `outOfStock`  — هذه متغيرات موجودة بالفعل في المكون اللي بيعرض `MobileStickyCart`. استخدم نفس المتغيرات.

---

## 5. عمليات جماعية (Bulk Actions)

### 5.1 API Route — Bulk Products

> **ملف جديد**: `src/app/api/dashboard/products/bulk/route.ts`

```typescript
import 'server-only'
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError, apiError } from '@/lib/api/response'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'change_category', 'delete']),
  ids: z.array(z.string().uuid()).min(1, 'يجب تحديد منتج واحد على الأقل').max(100, 'الحد الأقصى 100 منتج'),
  categoryId: z.string().uuid().optional(), // مطلوب مع change_category
})

/**
 * PATCH /api/dashboard/products/bulk — تعديل عدة منتجات
 */
export async function PATCH(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = bulkUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { action, ids, categoryId } = parsed.data

    // تحقق أن المنتجات تابعة للمتجر
    const existing = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, ids)))

    const existingIds = existing.map(p => p.id)
    if (existingIds.length === 0) {
      return apiError('لم يتم العثور على منتجات مطابقة', 404)
    }

    let updated = 0

    switch (action) {
      case 'activate':
        await db
          .update(storeProducts)
          .set({ isActive: true, updatedAt: new Date() })
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break

      case 'deactivate':
        await db
          .update(storeProducts)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break

      case 'change_category':
        if (!categoryId) return ApiErrors.validation('التصنيف مطلوب')
        await db
          .update(storeProducts)
          .set({ categoryId, updatedAt: new Date() })
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break

      case 'delete':
        await db
          .delete(storeProducts)
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break
    }

    return apiSuccess({ data: { updated, failed: ids.length - existingIds.length } })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 5.2 API Route — Bulk Orders

> **ملف جديد**: `src/app/api/dashboard/orders/bulk/route.ts`

```typescript
import 'server-only'
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError, apiError } from '@/lib/api/response'
import { z } from 'zod'

const bulkOrderSchema = z.object({
  action: z.enum(['update_status']),
  ids: z.array(z.string().uuid()).min(1, 'يجب تحديد طلب واحد على الأقل').max(100, 'الحد الأقصى 100 طلب'),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
})

/**
 * PATCH /api/dashboard/orders/bulk — تغيير حالة عدة طلبات
 */
export async function PATCH(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = bulkOrderSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { ids, status } = parsed.data

    // تحقق أن الطلبات تابعة للمتجر
    const existing = await db
      .select({ id: storeOrders.id })
      .from(storeOrders)
      .where(and(eq(storeOrders.storeId, store.id), inArray(storeOrders.id, ids)))

    const existingIds = existing.map(o => o.id)
    if (existingIds.length === 0) {
      return apiError('لم يتم العثور على طلبات مطابقة', 404)
    }

    await db
      .update(storeOrders)
      .set({ orderStatus: status, updatedAt: new Date() })
      .where(and(eq(storeOrders.storeId, store.id), inArray(storeOrders.id, existingIds)))

    return apiSuccess({ data: { updated: existingIds.length, failed: ids.length - existingIds.length } })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 5.3 مكون BulkActionBar

> **ملف جديد**: `src/components/dashboard/bulk-action-bar.tsx`

```tsx
'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui'

type BulkAction = {
  label: string
  value: string
  variant?: 'primary' | 'danger'
}

type BulkActionBarProps = {
  selectedCount: number
  actions: BulkAction[]
  onAction: (action: string) => void
  onClear: () => void
}

export function BulkActionBar({ selectedCount, actions, onAction, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
      <span className="text-sm font-semibold text-blue-700">{selectedCount} عنصر محدد</span>

      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.value}
            variant={action.variant === 'danger' ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => onAction(action.value)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <button onClick={onClear} className="mr-auto text-blue-500 hover:text-blue-700" title="إلغاء التحديد">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
```

### 5.4 مكون BulkConfirmDialog

> **ملف جديد**: `src/components/dashboard/bulk-confirm-dialog.tsx`

```tsx
'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

type BulkConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function BulkConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  variant = 'default',
  onConfirm,
  onCancel,
}: BulkConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {variant === 'danger' && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        )}

        <h3 className="text-center text-lg font-bold text-[var(--ds-text)]">{title}</h3>
        <p className="mt-2 text-center text-sm text-[var(--ds-text-muted)]">{description}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            إلغاء
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'جارٍ التنفيذ...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 5.5 تعديل صفحة المنتجات — إضافة Bulk Actions

> **ملف**: `src/app/(dashboard)/dashboard/products/page.tsx`

الصفحة حالياً Server Component. لإضافة checkboxes و bulk actions، نحتاج **مكون Client** يلف الجدول.

**أنشئ مكون Client wrapper**:

> **ملف جديد**: `src/app/(dashboard)/dashboard/products/_components/products-bulk-wrapper.tsx`

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BulkActionBar } from '@/components/dashboard/bulk-action-bar'
import { BulkConfirmDialog } from '@/components/dashboard/bulk-confirm-dialog'

type Product = {
  id: string
  name: string
  isActive: boolean
}

type ProductsBulkWrapperProps = {
  products: Product[]
  children: (props: {
    selectedIds: Set<string>
    toggleSelect: (id: string) => void
    toggleAll: () => void
    allSelected: boolean
  }) => React.ReactNode
}

const PRODUCT_ACTIONS = [
  { label: 'تفعيل', value: 'activate' },
  { label: 'تعطيل', value: 'deactivate' },
  { label: 'حذف', value: 'delete', variant: 'danger' as const },
]

export function ProductsBulkWrapper({ products, children }: ProductsBulkWrapperProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: string
    title: string
    description: string
    variant: 'danger' | 'default'
  }>({ open: false, action: '', title: '', description: '', variant: 'default' })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === products.length) return new Set()
      return new Set(products.map(p => p.id))
    })
  }, [products])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const allSelected = selectedIds.size === products.length && products.length > 0

  const handleAction = (action: string) => {
    const count = selectedIds.size
    switch (action) {
      case 'activate':
        setConfirmDialog({
          open: true, action, variant: 'default',
          title: `تفعيل ${count} منتج`,
          description: `سيتم تفعيل ${count} منتج وإظهارهم في المتجر.`,
        })
        break
      case 'deactivate':
        setConfirmDialog({
          open: true, action, variant: 'default',
          title: `تعطيل ${count} منتج`,
          description: `سيتم تعطيل ${count} منتج وإخفاؤهم من المتجر.`,
        })
        break
      case 'delete':
        setConfirmDialog({
          open: true, action, variant: 'danger',
          title: `حذف ${count} منتج`,
          description: `سيتم حذف ${count} منتج نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
        })
        break
    }
  }

  const executeAction = async () => {
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch('/api/dashboard/products/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmDialog.action, ids }),
      })

      if (res.ok) {
        clearSelection()
        router.refresh()
      }
    } catch {
      // silent
    }
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  return (
    <>
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={PRODUCT_ACTIONS}
        onAction={handleAction}
        onClear={clearSelection}
      />

      {children({ selectedIds, toggleSelect, toggleAll, allSelected })}

      <BulkConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.action === 'delete' ? 'حذف نهائي' : 'تأكيد'}
        variant={confirmDialog.variant}
        onConfirm={executeAction}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </>
  )
}
```

**تعديل صفحة products/page.tsx:**

أضف الـ import:
```typescript
import { ProductsBulkWrapper } from './_components/products-bulk-wrapper'
```

لف الجدول بـ `ProductsBulkWrapper`:

**قبل** (الجدول بدون checkboxes):
```tsx
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th ...>المنتج</th>
```

**بعد** — أضف `ProductsBulkWrapper` حول كل الجدول (الـ desktop table فقط أو حوالين كل الـ content):

```tsx
          <ProductsBulkWrapper
            products={productsResult.products.map(p => ({ id: p.id, name: p.name, isActive: p.isActive }))}
          >
            {({ selectedIds, toggleSelect, toggleAll, allSelected }) => (
              <Card className="hidden overflow-hidden p-0 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr>
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded accent-[var(--color-primary,#000)]"
                          />
                        </th>
                        <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">المنتج</th>
                        {/* باقي headers كما هي */}
                      </tr>
                    </thead>
                    <tbody>
                      {productsResult.products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              className="h-4 w-4 rounded accent-[var(--color-primary,#000)]"
                            />
                          </td>
                          {/* باقي cells كما هي */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </ProductsBulkWrapper>
```

### 5.6 تعديل صفحة الطلبات — إضافة Bulk Actions

> **ملف**: `src/app/(dashboard)/dashboard/orders/page.tsx`

**نفس النمط بالضبط** — أنشئ wrapper:

> **ملف جديد**: `src/app/(dashboard)/dashboard/orders/_components/orders-bulk-wrapper.tsx`

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BulkActionBar } from '@/components/dashboard/bulk-action-bar'
import { BulkConfirmDialog } from '@/components/dashboard/bulk-confirm-dialog'

type OrdersBulkWrapperProps = {
  orderIds: string[]
  children: (props: {
    selectedIds: Set<string>
    toggleSelect: (id: string) => void
    toggleAll: () => void
    allSelected: boolean
  }) => React.ReactNode
}

const ORDER_STATUSES = [
  { label: 'تأكيد', value: 'confirmed' },
  { label: 'قيد التحضير', value: 'processing' },
  { label: 'تم الشحن', value: 'shipped' },
  { label: 'تم التسليم', value: 'delivered' },
  { label: 'إلغاء', value: 'cancelled', variant: 'danger' as const },
]

export function OrdersBulkWrapper({ orderIds, children }: OrdersBulkWrapperProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    status: string
    statusLabel: string
    variant: 'danger' | 'default'
  }>({ open: false, status: '', statusLabel: '', variant: 'default' })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === orderIds.length) return new Set()
      return new Set(orderIds)
    })
  }, [orderIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const allSelected = selectedIds.size === orderIds.length && orderIds.length > 0

  const bulkActions = ORDER_STATUSES.map(s => ({
    label: s.label,
    value: s.value,
    variant: s.variant,
  }))

  const handleAction = (status: string) => {
    const match = ORDER_STATUSES.find(s => s.value === status)
    if (!match) return
    setConfirmDialog({
      open: true,
      status,
      statusLabel: match.label,
      variant: status === 'cancelled' ? 'danger' : 'default',
    })
  }

  const executeAction = async () => {
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch('/api/dashboard/orders/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', ids, status: confirmDialog.status }),
      })

      if (res.ok) {
        clearSelection()
        router.refresh()
      }
    } catch {
      // silent
    }
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  return (
    <>
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={bulkActions}
        onAction={handleAction}
        onClear={clearSelection}
      />

      {children({ selectedIds, toggleSelect, toggleAll, allSelected })}

      <BulkConfirmDialog
        open={confirmDialog.open}
        title={`تغيير حالة ${selectedIds.size} طلب إلى "${confirmDialog.statusLabel}"`}
        description={`سيتم تحديث حالة ${selectedIds.size} طلب. هل أنت متأكد؟`}
        confirmLabel="تأكيد"
        variant={confirmDialog.variant}
        onConfirm={executeAction}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </>
  )
}
```

**تعديل orders/page.tsx** — نفس النمط:

أضف الـ import:
```typescript
import { OrdersBulkWrapper } from './_components/orders-bulk-wrapper'
```

لف الجدول بـ `OrdersBulkWrapper`:

```tsx
          <OrdersBulkWrapper orderIds={result.orders.map(o => o.id)}>
            {({ selectedIds, toggleSelect, toggleAll, allSelected }) => (
              <Card className="hidden overflow-hidden p-0 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr>
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded accent-[var(--color-primary,#000)]"
                          />
                        </th>
                        <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">رقم الطلب</th>
                        {/* باقي headers كما هي */}
                      </tr>
                    </thead>
                    <tbody>
                      {result.orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(order.id)}
                              onChange={() => toggleSelect(order.id)}
                              className="h-4 w-4 rounded accent-[var(--color-primary,#000)]"
                            />
                          </td>
                          {/* باقي cells كما هي */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </OrdersBulkWrapper>
```

---

## 7. خطة الاختبار

### Feature #1: فلترة متقدمة

| # | الاختبار | النتيجة المتوقعة |
|---|---------|------------------|
| 1 | فتح صفحة تصنيف فيه منتجات | الفلاتر تظهر (sidebar desktop + drawer mobile) |
| 2 | إدخال حد أدنى للسعر (مثلاً 100) | المنتجات بسعر < 100 تختفي |
| 3 | إدخال حد أعلى للسعر (مثلاً 500) | المنتجات بسعر > 500 تختفي |
| 4 | فلترة "متوفر فقط" | المنتجات اللي stock = 0 تختفي |
| 5 | فلترة "عروض فقط" | فقط المنتجات بـ compareAtPrice > price تظهر |
| 6 | فلتر التقييم 4 نجوم | فقط المنتجات بتقييم >= 4 |
| 7 | تغيير الترتيب لـ "السعر: الأقل" | المنتجات تترتب تصاعدياً |
| 8 | URL تتحدث مع الفلاتر | `?minPrice=100&maxPrice=500&inStock=true` |
| 9 | مسح الفلاتر | URL والفلاتر ترجع للوضع الافتراضي |
| 10 | Pagination مع الفلاتر | الفلاتر تحتفظ بقيمها عند تغيير الصفحة |
| 11 | mobile: فتح drawer الفلاتر | Drawer يفتح ويعمل والـ overlay صحيح |

### Feature #2: مقارنة المنتجات

| # | الاختبار | النتيجة المتوقعة |
|---|---------|------------------|
| 1 | ضغط "قارن" على منتج | المنتج يتضاف وCompareFloat يظهر |
| 2 | إضافة 4 منتجات | الزر الخامس يكون disabled |
| 3 | ضغط "قارن الآن" في Float | الانتقال لصفحة /compare |
| 4 | صفحة المقارنة | جدول بجميع البيانات (صورة، اسم، سعر، تقييم، توفر) |
| 5 | حذف منتج من المقارنة (X) | المنتج يختفي من الجدول |
| 6 | مسح الكل | الجدول يفرغ ورسالة "لا توجد منتجات" |
| 7 | refresh الصفحة | البيانات تحتفظ (localStorage) |
| 8 | CompareButton في ProductCard | الزر يظهر ويعمل بدون ما ينقل لصفحة المنتج |

### Feature #3: شاهدته مؤخراً

| # | الاختبار | النتيجة المتوقعة |
|---|---------|------------------|
| 1 | زيارة صفحة منتج | المنتج يتضاف لـ recently viewed |
| 2 | زيارة 5 منتجات مختلفة | كلهم يظهروا في القسم |
| 3 | الصفحة الرئيسية | قسم "شاهدته مؤخراً" يظهر |
| 4 | صفحة المنتج | القسم يظهر بدون المنتج الحالي |
| 5 | زيارة نفس المنتج مرتين | يتحدث الوقت بس ما يتكررش |
| 6 | refresh الصفحة | البيانات تحتفظ (localStorage) |

### Feature #4: Sticky Add-to-Cart

| # | الاختبار | النتيجة المتوقعة |
|---|---------|------------------|
| 1 | Scroll لتحت في صفحة المنتج (desktop) | بار ثابت يظهر مع صورة + اسم + سعر + زر |
| 2 | Scroll لفوق | البار يختفي |
| 3 | ضغط "أضف للسلة" في البار | المنتج يتضاف للسلة |
| 4 | mobile: البار الجديد لا يظهر | `hidden md:block` يخليه مخفي |
| 5 | mobile: البار القديم يظهر | `MobileStickyCart` يشتغل كالعادة |

### Feature #5: عمليات جماعية

| # | الاختبار | النتيجة المتوقعة |
|---|---------|------------------|
| 1 | تحديد 3 منتجات | BulkActionBar يظهر "3 عنصر محدد" |
| 2 | "تحديد الكل" checkbox | كل المنتجات تتحدد |
| 3 | ضغط "تفعيل" → تأكيد | المنتجات المحددة تتفعل |
| 4 | ضغط "تعطيل" → تأكيد | المنتجات المحددة تتعطل |
| 5 | ضغط "حذف" → تأكيد | dialog تحذيري أحمر → حذف |
| 6 | الطلبات: تحديد 3 طلبات | BulkActionBar يظهر |
| 7 | الطلبات: "تأكيد" → confirm | الحالة تتغير لـ confirmed |
| 8 | الطلبات: "إلغاء" → confirm | dialog تحذيري → cancelled |
| 9 | إلغاء التحديد (X) | الـ checkboxes ترجع فارغة |
| 10 | API: ids مش تابعة للمتجر | `failed` > 0 في الاستجابة |
| 11 | API: بدون auth | 401 |

---

## ملاحظات ختامية

### لا يوجد Migration

هذه المرحلة لا تتطلب أي migration SQL — فقط حقلين JSONB (StoreSettings) بقيم default.

### ترتيب التنفيذ الموصى

1. **StoreSettings** (schema.ts + validations) — 15 دقيقة
2. **getStorefrontProducts() تعديل** — 30 دقيقة
3. **مكونات الفلاتر (5 ملفات) + category page تعديل** — 2-3 ساعات
4. **compare-store.ts + مكونات المقارنة** — 2-3 ساعات
5. **recently-viewed-store.ts + section + tracking** — 1-2 ساعة
6. **StickyAddToCart** — 30 دقيقة
7. **Bulk APIs (2 routes)** — 1 ساعة
8. **مكونات Dashboard (bar + dialog + wrappers)** — 2-3 ساعات
9. **اختبار شامل** — 1-2 ساعة

### تبعيات بين المميزات

```
StoreSettings ──→ مقارنة المنتجات (تستخدم comparisonEnabled/comparisonMaxItems)
                  
Storefront API (products?ids=) ──→ صفحة المقارنة + شاهدته مؤخراً
                                   (كلاهما يستخدم نفس API)

getStorefrontProducts() تعديل ──→ صفحة التصنيف + الفلاتر
                                   
MobileStickyCart (موجود) ──→ StickyAddToCart (نمط مطابق)

wishlist-store.ts (نمط) ──→ compare-store.ts + recently-viewed-store.ts
```

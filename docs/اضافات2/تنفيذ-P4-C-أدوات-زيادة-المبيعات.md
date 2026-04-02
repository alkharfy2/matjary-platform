# دليل تنفيذ P4-C — أدوات زيادة المبيعات (Sales Boosters)

> **تاريخ الإنشاء**: 30 مارس 2026  
> **المرجعية**: اضافات-2.md → المرحلة P4-C  
> **الهدف**: دليل تنفيذ تفصيلي للمميزات الأربعة بتاعة P4-C  
> **المستوى**: جاهز للتنفيذ (Copy-Paste Ready)  
> **الجهد**: ~4-5 أيام

---

## الفهرس

1. [نظرة عامة والأولويات](#نظرة-عامة-والأولويات)
2. [حزم المنتجات (Product Bundles)](#1-حزم-المنتجات-product-bundles)
3. [عداد تنازلي للعروض (Countdown Timer)](#2-عداد-تنازلي-للعروض-countdown-timer)
4. [إثبات اجتماعي (Social Proof Popup)](#3-إثبات-اجتماعي-social-proof-popup)
5. [إشعار نفاد المخزون (Stock Alerts)](#4-إشعار-نفاد-المخزون-stock-alerts)
6. [تغييرات مشتركة على StoreSettings](#5-تغييرات-مشتركة-على-storesettings)
7. [ملف Migration](#6-ملف-migration)
8. [خطة الاختبار](#7-خطة-الاختبار)

---

## نظرة عامة والأولويات

### لماذا الأربعة مع بعض؟

```
حزم المنتجات (#6) → يشتري أكتر (AOV ↑)
        +
عداد تنازلي (#7) → يشتري دلوقتي (Urgency ↑)
        +
Social Proof (#16) → يثق ويشتري (Trust ↑)
        +
إشعار المخزون (#10) → يرجع ويشتري (Retention ↑)
```

- الأربعة أدوات **urgency & sales boosting** كلاسيكية
- **الحزم** بترفع AOV بنسبة 15-30% (العميل يشتري مجموعة بدل قطعة)
- **العداد** بيخلق ضغط نفسي إيجابي «العرض هيخلص!» → تحويل أسرع
- **Social Proof** بيخلق إحساس بالنشاط والثقة «ناس تانية بتشتري»
- **Stock Alerts** بترجّع العميل اللي لقى المنتج خلص «هنبلّغك لما يرجع»

### ترتيب التنفيذ

| الخطوة | الميزة | الجهد | السبب |
|--------|-------|-------|-------|
| 1 | حزم المنتجات | 2 أيام | الأكبر — جداول + CRUD + checkout integration |
| 2 | عداد تنازلي | 0.5 يوم | مكونات UI بسيطة + حقول settings |
| 3 | Social Proof | 0.5 يوم | مكون واحد + API بسيط |
| 4 | إشعار المخزون | 0.5-1 يوم | جدول جديد + auto-trigger في product update |

### ملخص الوضع الحالي

> **الأربع مميزات كلهم جديدين 100%** — لا يوجد أي كود مسبق لأي منهم.  
> هذا الدليل يغطي كل شيء من الصفر.

### ملخص التغييرات

```
ملفات جديدة (20):
  src/db/schema.ts                                → + 3 جداول (storeBundles, storeBundleItems, storeStockAlerts) + relations
  src/app/api/dashboard/bundles/route.ts           → GET + POST (قائمة + إنشاء حزمة)
  src/app/api/dashboard/bundles/[id]/route.ts      → PUT + DELETE (تعديل + حذف حزمة)
  src/app/api/storefront/bundles/route.ts          → GET (الحزم النشطة — عام)
  src/app/api/storefront/bundles/[slug]/route.ts   → GET (تفاصيل حزمة — عام)
  src/app/api/storefront/social-proof/route.ts     → GET (آخر 10 طلبات)
  src/app/api/storefront/stock-alerts/route.ts     → POST (تسجيل إشعار)
  src/app/api/storefront/stock-alerts/count/[productId]/route.ts → GET (عدد المنتظرين)
  src/app/api/dashboard/stock-alerts/notify/[productId]/route.ts → POST (إخطار يدوي)
  src/app/(dashboard)/dashboard/bundles/page.tsx   → صفحة قائمة الحزم
  src/app/(dashboard)/dashboard/bundles/new/page.tsx → صفحة إنشاء حزمة
  src/app/(dashboard)/dashboard/bundles/[id]/edit/page.tsx → صفحة تعديل حزمة
  src/app/store/_components/bundle-card.tsx         → كارت حزمة في المتجر
  src/app/store/_components/bundles-section.tsx     → قسم الحزم في الصفحة الرئيسية
  src/app/store/_components/countdown-timer.tsx     → العداد التنازلي (reusable)
  src/app/store/_components/countdown-banner.tsx    → بانر العد التنازلي (أعلى المتجر)
  src/app/store/product/[slug]/_components/product-sale-countdown.tsx → عداد في صفحة المنتج
  src/app/store/_components/social-proof-popup.tsx  → popup الإثبات الاجتماعي
  src/app/store/product/[slug]/_components/stock-alert-form.tsx → نموذج تسجيل إشعار
  src/lib/email/templates/stock-alert.tsx           → قالب إيميل «المنتج رجع»

ملفات معدّلة (7):
  src/db/schema.ts                                 → + StoreSettings P4-C + 3 جداول + relations
  src/lib/validations/store.ts                     → + حقول P4-C في updateStoreSettingsSchema
  src/lib/validations/product.ts                   → + saleStartsAt, saleEndsAt
  src/app/api/checkout/route.ts                    → + دعم bundleId في items + خصم الحزمة
  src/app/api/dashboard/products/[id]/route.ts     → + auto-trigger stock alerts
  src/app/store/layout.tsx                         → + CountdownBanner + SocialProofPopup
  src/app/store/page.tsx                           → + BundlesSection

Migration (1):
  migrations/p4c_sales_boosters.sql
```

---

## 5. تغييرات مشتركة على StoreSettings

> **يُنفَّذ أولاً** — لأن كل المميزات تعتمد عليه.

### الحقول الجديدة في StoreSettings (src/db/schema.ts)

أضف بعد حقول P4-B مباشرة:

```typescript
  // === P4-C: Countdown Timer ===
  countdownBannerEnabled: boolean        // default: false
  countdownBannerText: string | null     // default: null — "تخفيضات نهاية الموسم!"
  countdownBannerEndDate: string | null  // default: null — ISO date string
  countdownBannerBgColor: string         // default: '#ef4444'
  countdownBannerTextColor: string       // default: '#ffffff'

  // === P4-C: Social Proof ===
  socialProofEnabled: boolean            // default: false
  socialProofInterval: number            // default: 30 — ثواني بين كل popup
  socialProofDuration: number            // default: 5 — مدة ظهور الـ popup
  socialProofPosition: 'bottom-left' | 'bottom-right'  // default: 'bottom-left'

  // === P4-C: Stock Alerts ===
  stockAlertsEnabled: boolean            // default: true

  // === P4-C: Bundles ===
  bundlesEnabled: boolean                // default: true
```

### Default values (في `settings` default في stores table):

```typescript
  // P4-C
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

### تعديل Validations (src/lib/validations/store.ts)

أضف في `updateStoreSettingsSchema` بعد حقول P4-B:

```typescript
  // P4-C: Countdown Timer
  countdownBannerEnabled: z.boolean().optional(),
  countdownBannerText: z.string().max(200).trim().nullable().optional(),
  countdownBannerEndDate: z.string().max(30).trim().nullable().optional(),
  countdownBannerBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  countdownBannerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),

  // P4-C: Social Proof
  socialProofEnabled: z.boolean().optional(),
  socialProofInterval: z.number().int().min(10).max(300).optional(),
  socialProofDuration: z.number().int().min(3).max(30).optional(),
  socialProofPosition: z.enum(['bottom-left', 'bottom-right']).optional(),

  // P4-C: Stock Alerts
  stockAlertsEnabled: z.boolean().optional(),

  // P4-C: Bundles
  bundlesEnabled: z.boolean().optional(),
```

---

## 1. حزم المنتجات (Product Bundles)

### 1.1 جداول قاعدة البيانات

أضف في `src/db/schema.ts` بعد قسم P4-B:

```typescript
// ============================================
// P4-C: STORE BUNDLES (Product Bundles)
// ============================================
export const storeBundles = pgTable('store_bundles', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
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

export const storeBundleItems = pgTable('store_bundle_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  bundleId: uuid('bundle_id')
    .references(() => storeBundles.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => storeProducts.id, { onDelete: 'cascade' })
    .notNull(),
  variantId: text('variant_id'),
  quantity: integer('quantity').default(1).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  uniqueIndex('uniq_bundle_item').on(table.bundleId, table.productId, table.variantId),
  index('idx_bundle_items_bundle').on(table.bundleId),
])
```

### 1.2 Relations

```typescript
// بعد تعريف الجداول:
export const storeBundlesRelations = relations(storeBundles, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeBundles.storeId],
    references: [stores.id],
  }),
  items: many(storeBundleItems),
}))

export const storeBundleItemsRelations = relations(storeBundleItems, ({ one }) => ({
  bundle: one(storeBundles, {
    fields: [storeBundleItems.bundleId],
    references: [storeBundles.id],
  }),
  product: one(storeProducts, {
    fields: [storeBundleItems.productId],
    references: [storeProducts.id],
  }),
}))
```

أضف في `storesRelations`:

```typescript
  bundles: many(storeBundles),
```

أضف في `storeProductsRelations`:

```typescript
  bundleItems: many(storeBundleItems),
```

### 1.3 Dashboard API — GET + POST

```typescript
// src/app/api/dashboard/bundles/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { eq, desc, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { storeBundles, storeBundleItems, storeProducts } from '@/db/schema'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const createBundleSchema = z.object({
  name: z.string().min(2, 'اسم الحزمة مطلوب').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  discountType: z.enum(['percentage', 'fixed', 'custom_price']),
  discountValue: z.number().min(0).nullable().optional(),
  customPrice: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().nullable().optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })).min(2, 'الحزمة لازم تحتوي على منتجين على الأقل'),
})

/**
 * GET /api/dashboard/bundles — List all bundles
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const bundles = await db
      .select({
        id: storeBundles.id,
        name: storeBundles.name,
        slug: storeBundles.slug,
        description: storeBundles.description,
        imageUrl: storeBundles.imageUrl,
        discountType: storeBundles.discountType,
        discountValue: storeBundles.discountValue,
        customPrice: storeBundles.customPrice,
        isActive: storeBundles.isActive,
        startsAt: storeBundles.startsAt,
        endsAt: storeBundles.endsAt,
        sortOrder: storeBundles.sortOrder,
        createdAt: storeBundles.createdAt,
        itemCount: sql<number>`(
          SELECT COUNT(*) FROM store_bundle_items
          WHERE store_bundle_items.bundle_id = ${storeBundles.id}
        )`.as('item_count'),
      })
      .from(storeBundles)
      .where(eq(storeBundles.storeId, store.id))
      .orderBy(desc(storeBundles.createdAt))

    return apiSuccess(bundles)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/bundles — Create a new bundle
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = createBundleSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    // Check slug uniqueness
    const existingSlug = await db
      .select({ id: storeBundles.id })
      .from(storeBundles)
      .where(and(eq(storeBundles.storeId, store.id), eq(storeBundles.slug, data.slug)))
      .limit(1)

    if (existingSlug[0]) {
      return ApiErrors.validation('رابط الحزمة مستخدم بالفعل')
    }

    // Verify all products belong to this store
    const productIds = data.items.map((item) => item.productId)
    const products = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(
        eq(storeProducts.storeId, store.id),
        sql`${storeProducts.id} = ANY(${productIds})`,
      ))

    if (products.length !== new Set(productIds).size) {
      return ApiErrors.validation('بعض المنتجات غير موجودة في المتجر')
    }

    // Create bundle + items in transaction
    const result = await db.transaction(async (tx) => {
      const [bundle] = await tx
        .insert(storeBundles)
        .values({
          storeId: store.id,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          discountType: data.discountType,
          discountValue: data.discountValue != null ? String(data.discountValue) : null,
          customPrice: data.customPrice != null ? String(data.customPrice) : null,
          isActive: data.isActive ?? true,
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
          sortOrder: data.sortOrder ?? 0,
        })
        .returning()

      if (data.items.length > 0) {
        await tx.insert(storeBundleItems).values(
          data.items.map((item, index) => ({
            bundleId: bundle.id,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity ?? 1,
            sortOrder: item.sortOrder ?? index,
          })),
        )
      }

      return bundle
    })

    return apiSuccess(result, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 1.4 Dashboard API — PUT + DELETE

```typescript
// src/app/api/dashboard/bundles/[id]/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { storeBundles, storeBundleItems, storeProducts } from '@/db/schema'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const updateBundleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  discountType: z.enum(['percentage', 'fixed', 'custom_price']).optional(),
  discountValue: z.number().min(0).nullable().optional(),
  customPrice: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().nullable().optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })).min(2, 'الحزمة لازم تحتوي على منتجين على الأقل').optional(),
})

/**
 * GET /api/dashboard/bundles/[id] — Get bundle with items
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const bundle = await db
      .select()
      .from(storeBundles)
      .where(and(eq(storeBundles.id, id), eq(storeBundles.storeId, store.id)))
      .limit(1)

    if (!bundle[0]) return ApiErrors.notFound('الحزمة')

    // Get items with product details
    const items = await db
      .select({
        id: storeBundleItems.id,
        productId: storeBundleItems.productId,
        variantId: storeBundleItems.variantId,
        quantity: storeBundleItems.quantity,
        sortOrder: storeBundleItems.sortOrder,
        productName: storeProducts.name,
        productPrice: storeProducts.price,
        productImages: storeProducts.images,
        productStock: storeProducts.stock,
      })
      .from(storeBundleItems)
      .innerJoin(storeProducts, eq(storeBundleItems.productId, storeProducts.id))
      .where(eq(storeBundleItems.bundleId, id))
      .orderBy(storeBundleItems.sortOrder)

    return apiSuccess({ ...bundle[0], items })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/bundles/[id] — Update bundle
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeBundles.id })
      .from(storeBundles)
      .where(and(eq(storeBundles.id, id), eq(storeBundles.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الحزمة')

    const body = await request.json()
    const parsed = updateBundleSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    // Check slug uniqueness if changing
    if (data.slug) {
      const existingSlug = await db
        .select({ id: storeBundles.id })
        .from(storeBundles)
        .where(and(
          eq(storeBundles.storeId, store.id),
          eq(storeBundles.slug, data.slug),
          sql`${storeBundles.id} != ${id}`,
        ))
        .limit(1)

      if (existingSlug[0]) {
        return ApiErrors.validation('رابط الحزمة مستخدم بالفعل')
      }
    }

    // Verify products if items are being updated
    if (data.items) {
      const productIds = data.items.map((item) => item.productId)
      const products = await db
        .select({ id: storeProducts.id })
        .from(storeProducts)
        .where(and(
          eq(storeProducts.storeId, store.id),
          sql`${storeProducts.id} = ANY(${productIds})`,
        ))

      if (products.length !== new Set(productIds).size) {
        return ApiErrors.validation('بعض المنتجات غير موجودة في المتجر')
      }
    }

    const result = await db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }

      if (data.name !== undefined) updateData.name = data.name
      if (data.slug !== undefined) updateData.slug = data.slug
      if (data.description !== undefined) updateData.description = data.description
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
      if (data.discountType !== undefined) updateData.discountType = data.discountType
      if (data.discountValue !== undefined) {
        updateData.discountValue = data.discountValue != null ? String(data.discountValue) : null
      }
      if (data.customPrice !== undefined) {
        updateData.customPrice = data.customPrice != null ? String(data.customPrice) : null
      }
      if (data.isActive !== undefined) updateData.isActive = data.isActive
      if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null
      if (data.endsAt !== undefined) updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const [bundle] = await tx
        .update(storeBundles)
        .set(updateData)
        .where(and(eq(storeBundles.id, id), eq(storeBundles.storeId, store.id)))
        .returning()

      // Replace items if provided
      if (data.items) {
        await tx
          .delete(storeBundleItems)
          .where(eq(storeBundleItems.bundleId, id))

        await tx.insert(storeBundleItems).values(
          data.items.map((item, index) => ({
            bundleId: id,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity ?? 1,
            sortOrder: item.sortOrder ?? index,
          })),
        )
      }

      return bundle
    })

    return apiSuccess(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/bundles/[id] — Delete bundle
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeBundles.id })
      .from(storeBundles)
      .where(and(eq(storeBundles.id, id), eq(storeBundles.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الحزمة')

    await db
      .delete(storeBundles)
      .where(and(eq(storeBundles.id, id), eq(storeBundles.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 1.5 Storefront API — الحزم النشطة

```typescript
// src/app/api/storefront/bundles/route.ts
import 'server-only'
import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '@/db'
import { storeBundles, storeBundleItems, storeProducts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { apiError } from '@/lib/api/response'

/**
 * GET /api/storefront/bundles — Active bundles (public)
 */
export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const now = new Date()

    const bundles = await db
      .select({
        id: storeBundles.id,
        name: storeBundles.name,
        slug: storeBundles.slug,
        description: storeBundles.description,
        imageUrl: storeBundles.imageUrl,
        discountType: storeBundles.discountType,
        discountValue: storeBundles.discountValue,
        customPrice: storeBundles.customPrice,
        startsAt: storeBundles.startsAt,
        endsAt: storeBundles.endsAt,
      })
      .from(storeBundles)
      .where(and(
        eq(storeBundles.storeId, store.id),
        eq(storeBundles.isActive, true),
        sql`(${storeBundles.startsAt} IS NULL OR ${storeBundles.startsAt} <= ${now})`,
        sql`(${storeBundles.endsAt} IS NULL OR ${storeBundles.endsAt} > ${now})`,
      ))
      .orderBy(storeBundles.sortOrder, desc(storeBundles.createdAt))

    // Fetch items with products for each bundle
    const bundlesWithItems = await Promise.all(
      bundles.map(async (bundle) => {
        const items = await db
          .select({
            productId: storeBundleItems.productId,
            variantId: storeBundleItems.variantId,
            quantity: storeBundleItems.quantity,
            productName: storeProducts.name,
            productSlug: storeProducts.slug,
            productPrice: storeProducts.price,
            productCompareAtPrice: storeProducts.compareAtPrice,
            productImages: storeProducts.images,
            productStock: storeProducts.stock,
          })
          .from(storeBundleItems)
          .innerJoin(storeProducts, eq(storeBundleItems.productId, storeProducts.id))
          .where(eq(storeBundleItems.bundleId, bundle.id))
          .orderBy(storeBundleItems.sortOrder)

        // Calculate total original price
        const originalPrice = items.reduce(
          (sum, item) => sum + Number(item.productPrice) * (item.quantity ?? 1),
          0,
        )

        // Calculate bundle price
        let bundlePrice = originalPrice
        if (bundle.discountType === 'percentage' && bundle.discountValue) {
          bundlePrice = originalPrice * (1 - Number(bundle.discountValue) / 100)
        } else if (bundle.discountType === 'fixed' && bundle.discountValue) {
          bundlePrice = originalPrice - Number(bundle.discountValue)
        } else if (bundle.discountType === 'custom_price' && bundle.customPrice) {
          bundlePrice = Number(bundle.customPrice)
        }

        const savings = originalPrice - bundlePrice

        return {
          ...bundle,
          items,
          originalPrice: originalPrice.toFixed(2),
          bundlePrice: bundlePrice.toFixed(2),
          savings: savings.toFixed(2),
          savingsPercent: originalPrice > 0
            ? Math.round((savings / originalPrice) * 100)
            : 0,
        }
      }),
    )

    return apiSuccess(bundlesWithItems)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 1.6 Storefront API — تفاصيل حزمة

```typescript
// src/app/api/storefront/bundles/[slug]/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { storeBundles, storeBundleItems, storeProducts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { apiError } from '@/lib/api/response'

type Params = { params: Promise<{ slug: string }> }

/**
 * GET /api/storefront/bundles/[slug] — Bundle details (public)
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const { slug } = await params
    const now = new Date()

    const bundle = await db
      .select()
      .from(storeBundles)
      .where(and(
        eq(storeBundles.storeId, store.id),
        eq(storeBundles.slug, slug),
        eq(storeBundles.isActive, true),
        sql`(${storeBundles.startsAt} IS NULL OR ${storeBundles.startsAt} <= ${now})`,
        sql`(${storeBundles.endsAt} IS NULL OR ${storeBundles.endsAt} > ${now})`,
      ))
      .limit(1)

    if (!bundle[0]) return ApiErrors.notFound('الحزمة')

    const items = await db
      .select({
        productId: storeBundleItems.productId,
        variantId: storeBundleItems.variantId,
        quantity: storeBundleItems.quantity,
        productName: storeProducts.name,
        productSlug: storeProducts.slug,
        productPrice: storeProducts.price,
        productCompareAtPrice: storeProducts.compareAtPrice,
        productImages: storeProducts.images,
        productStock: storeProducts.stock,
        productIsActive: storeProducts.isActive,
      })
      .from(storeBundleItems)
      .innerJoin(storeProducts, eq(storeBundleItems.productId, storeProducts.id))
      .where(eq(storeBundleItems.bundleId, bundle[0].id))
      .orderBy(storeBundleItems.sortOrder)

    const originalPrice = items.reduce(
      (sum, item) => sum + Number(item.productPrice) * (item.quantity ?? 1),
      0,
    )

    let bundlePrice = originalPrice
    const b = bundle[0]
    if (b.discountType === 'percentage' && b.discountValue) {
      bundlePrice = originalPrice * (1 - Number(b.discountValue) / 100)
    } else if (b.discountType === 'fixed' && b.discountValue) {
      bundlePrice = originalPrice - Number(b.discountValue)
    } else if (b.discountType === 'custom_price' && b.customPrice) {
      bundlePrice = Number(b.customPrice)
    }

    const savings = originalPrice - bundlePrice

    return apiSuccess({
      ...b,
      items,
      originalPrice: originalPrice.toFixed(2),
      bundlePrice: bundlePrice.toFixed(2),
      savings: savings.toFixed(2),
      savingsPercent: originalPrice > 0
        ? Math.round((savings / originalPrice) * 100)
        : 0,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 1.7 صفحات Dashboard (الحزم)

#### قائمة الحزم

```tsx
// src/app/(dashboard)/dashboard/bundles/page.tsx
import { db } from '@/db'
import { storeBundles, storeBundleItems } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { getStoreByMerchant } from '@/lib/queries/store'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function BundlesPage() {
  const store = await getStoreByMerchant()
  if (!store) redirect('/dashboard')

  const bundles = await db
    .select({
      id: storeBundles.id,
      name: storeBundles.name,
      slug: storeBundles.slug,
      discountType: storeBundles.discountType,
      discountValue: storeBundles.discountValue,
      customPrice: storeBundles.customPrice,
      isActive: storeBundles.isActive,
      startsAt: storeBundles.startsAt,
      endsAt: storeBundles.endsAt,
      createdAt: storeBundles.createdAt,
      itemCount: sql<number>`(
        SELECT COUNT(*) FROM store_bundle_items
        WHERE store_bundle_items.bundle_id = ${storeBundles.id}
      )`.as('item_count'),
    })
    .from(storeBundles)
    .where(eq(storeBundles.storeId, store.id))
    .orderBy(desc(storeBundles.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ds-heading text-2xl font-bold">حزم المنتجات</h1>
          <p className="text-sm text-[var(--ds-text-muted)] mt-1">
            أنشئ حزم مخفضة لزيادة متوسط قيمة الطلب
          </p>
        </div>
        <Link
          href="/dashboard/bundles/new"
          className="ds-button ds-button-primary"
        >
          إنشاء حزمة جديدة
        </Link>
      </div>

      {bundles.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <p className="text-[var(--ds-text-muted)]">لم تنشئ أي حزم بعد</p>
          <Link
            href="/dashboard/bundles/new"
            className="ds-button ds-button-primary mt-4 inline-block"
          >
            إنشاء أول حزمة
          </Link>
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--ds-border)]">
                <th className="text-right p-3 text-sm font-medium text-[var(--ds-text-muted)]">الحزمة</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--ds-text-muted)]">المنتجات</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--ds-text-muted)]">الخصم</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--ds-text-muted)]">الحالة</th>
                <th className="text-right p-3 text-sm font-medium text-[var(--ds-text-muted)]">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle) => (
                <tr key={bundle.id} className="border-b border-[var(--ds-border)] last:border-0">
                  <td className="p-3">
                    <p className="font-medium text-[var(--ds-text)]">{bundle.name}</p>
                    <p className="text-xs text-[var(--ds-text-muted)]">{bundle.slug}</p>
                  </td>
                  <td className="p-3 text-sm">{bundle.itemCount} منتج</td>
                  <td className="p-3 text-sm">
                    {bundle.discountType === 'percentage' && `${bundle.discountValue}%`}
                    {bundle.discountType === 'fixed' && `${bundle.discountValue} ج`}
                    {bundle.discountType === 'custom_price' && `${bundle.customPrice} ج`}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      bundle.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {bundle.isActive ? 'مفعّلة' : 'معطّلة'}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/dashboard/bundles/${bundle.id}/edit`}
                      className="text-sm text-[var(--ds-accent)] hover:underline"
                    >
                      تعديل
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

#### إنشاء حزمة

> **ملاحظة**: صفحتا `new/page.tsx` و `[id]/edit/page.tsx` تستخدمان نفس Client Component `BundleForm`. 
> سيتم إنشاء `BundleForm` كمكون عميل يتضمن اختيار المنتجات وتحديد نوع الخصم.

```tsx
// src/app/(dashboard)/dashboard/bundles/new/page.tsx
import { getStoreByMerchant } from '@/lib/queries/store'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { BundleForm } from './_components/bundle-form'

export default async function NewBundlePage() {
  const store = await getStoreByMerchant()
  if (!store) redirect('/dashboard')

  // Get all active products for selection
  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      price: storeProducts.price,
      images: storeProducts.images,
      stock: storeProducts.stock,
      variants: storeProducts.variants,
    })
    .from(storeProducts)
    .where(and(eq(storeProducts.storeId, store.id), eq(storeProducts.isActive, true)))

  return (
    <div className="space-y-6">
      <h1 className="ds-heading text-2xl font-bold">إنشاء حزمة جديدة</h1>
      <BundleForm products={products} />
    </div>
  )
}
```

```tsx
// src/app/(dashboard)/dashboard/bundles/new/_components/bundle-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  price: string
  images: string[]
  stock: number
  variants: unknown[]
}

type BundleItem = {
  productId: string
  variantId?: string | null
  quantity: number
}

type BundleFormProps = {
  products: Product[]
  initialData?: {
    id: string
    name: string
    slug: string
    description: string | null
    imageUrl: string | null
    discountType: string
    discountValue: string | null
    customPrice: string | null
    isActive: boolean
    startsAt: string | null
    endsAt: string | null
    items: Array<{
      productId: string
      variantId: string | null
      quantity: number
    }>
  }
}

export function BundleForm({ products, initialData }: BundleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [discountType, setDiscountType] = useState(initialData?.discountType ?? 'percentage')
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue ?? '')
  const [customPrice, setCustomPrice] = useState(initialData?.customPrice ?? '')
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [selectedItems, setSelectedItems] = useState<BundleItem[]>(
    initialData?.items ?? [],
  )

  const isEdit = Boolean(initialData)

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value)
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 100),
      )
    }
  }

  function addItem(productId: string) {
    if (selectedItems.some((item) => item.productId === productId)) return
    setSelectedItems([...selectedItems, { productId, quantity: 1 }])
  }

  function removeItem(productId: string) {
    setSelectedItems(selectedItems.filter((item) => item.productId !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    )
  }

  // Calculate total original price
  const originalTotal = selectedItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product ? Number(product.price) * item.quantity : 0)
  }, 0)

  // Calculate bundle price
  let bundleTotal = originalTotal
  if (discountType === 'percentage' && discountValue) {
    bundleTotal = originalTotal * (1 - Number(discountValue) / 100)
  } else if (discountType === 'fixed' && discountValue) {
    bundleTotal = originalTotal - Number(discountValue)
  } else if (discountType === 'custom_price' && customPrice) {
    bundleTotal = Number(customPrice)
  }

  const savings = originalTotal - bundleTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (selectedItems.length < 2) {
      setError('الحزمة لازم تحتوي على منتجين على الأقل')
      return
    }

    const payload = {
      name,
      slug,
      description: description || null,
      discountType,
      discountValue: discountType !== 'custom_price' ? Number(discountValue) || null : null,
      customPrice: discountType === 'custom_price' ? Number(customPrice) || null : null,
      isActive,
      items: selectedItems.map((item, index) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        sortOrder: index,
      })),
    }

    startTransition(async () => {
      try {
        const url = isEdit
          ? `/api/dashboard/bundles/${initialData!.id}`
          : '/api/dashboard/bundles'
        const method = isEdit ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'حدث خطأ')
          return
        }

        router.push('/dashboard/bundles')
        router.refresh()
      } catch {
        setError('حدث خطأ غير متوقع')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
      )}

      {/* Basic Info */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="font-semibold text-[var(--ds-text)]">معلومات الحزمة</h2>

        <div>
          <label className="block text-sm font-medium mb-1">اسم الحزمة</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="مثال: حزمة العناية بالبشرة"
            className="ds-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الرابط (Slug)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="ds-input w-full"
            dir="ltr"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">الوصف (اختياري)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="ds-input w-full"
            rows={3}
          />
        </div>
      </div>

      {/* Products Selection */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="font-semibold text-[var(--ds-text)]">منتجات الحزمة</h2>

        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="space-y-2">
            {selectedItems.map((item) => {
              const product = products.find((p) => p.id === item.productId)
              if (!product) return null
              return (
                <div key={item.productId} className="flex items-center gap-3 p-2 rounded border border-[var(--ds-border)]">
                  {product.images[0] && (
                    <img src={product.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-[var(--ds-text-muted)]">{product.price} ج</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                    className="ds-input w-16 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    حذف
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Available Products */}
        <div className="border-t border-[var(--ds-border)] pt-4">
          <p className="text-sm text-[var(--ds-text-muted)] mb-2">اختر المنتجات:</p>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {products
              .filter((p) => !selectedItems.some((item) => item.productId === p.id))
              .map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product.id)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-[var(--ds-surface-hover)] text-right"
                >
                  {product.images[0] && (
                    <img src={product.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className="text-sm">{product.name}</span>
                  <span className="text-xs text-[var(--ds-text-muted)] mr-auto">{product.price} ج</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Discount */}
      <div className="card-surface p-6 space-y-4">
        <h2 className="font-semibold text-[var(--ds-text)]">الخصم</h2>

        <div className="flex gap-3">
          {(['percentage', 'fixed', 'custom_price'] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discountType"
                value={type}
                checked={discountType === type}
                onChange={(e) => setDiscountType(e.target.value)}
              />
              <span className="text-sm">
                {type === 'percentage' && 'نسبة %'}
                {type === 'fixed' && 'مبلغ ثابت'}
                {type === 'custom_price' && 'سعر مخصص'}
              </span>
            </label>
          ))}
        </div>

        {discountType !== 'custom_price' ? (
          <div>
            <label className="block text-sm font-medium mb-1">
              {discountType === 'percentage' ? 'نسبة الخصم (%)' : 'مبلغ الخصم (ج)'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="ds-input w-40"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">السعر الإجمالي للحزمة (ج)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="ds-input w-40"
            />
          </div>
        )}

        {/* Price Preview */}
        {selectedItems.length >= 2 && (
          <div className="bg-green-50 p-3 rounded text-sm">
            <p>السعر الأصلي: <span className="line-through">{originalTotal.toFixed(2)} ج</span></p>
            <p className="font-bold text-green-700">سعر الحزمة: {bundleTotal.toFixed(2)} ج</p>
            {savings > 0 && (
              <p className="text-green-600">التوفير: {savings.toFixed(2)} ج ({Math.round((savings / originalTotal) * 100)}%)</p>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="card-surface p-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm font-medium">مفعّلة</span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="ds-button ds-button-primary"
        >
          {isPending ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء الحزمة'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/bundles')}
          className="ds-button ds-button-secondary"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
```

#### تعديل حزمة

```tsx
// src/app/(dashboard)/dashboard/bundles/[id]/edit/page.tsx
import { db } from '@/db'
import { storeBundles, storeBundleItems, storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getStoreByMerchant } from '@/lib/queries/store'
import { redirect, notFound } from 'next/navigation'
import { BundleForm } from '../../new/_components/bundle-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditBundlePage({ params }: Props) {
  const store = await getStoreByMerchant()
  if (!store) redirect('/dashboard')

  const { id } = await params

  const bundle = await db
    .select()
    .from(storeBundles)
    .where(and(eq(storeBundles.id, id), eq(storeBundles.storeId, store.id)))
    .limit(1)

  if (!bundle[0]) notFound()

  const items = await db
    .select({
      productId: storeBundleItems.productId,
      variantId: storeBundleItems.variantId,
      quantity: storeBundleItems.quantity,
    })
    .from(storeBundleItems)
    .where(eq(storeBundleItems.bundleId, id))
    .orderBy(storeBundleItems.sortOrder)

  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      price: storeProducts.price,
      images: storeProducts.images,
      stock: storeProducts.stock,
      variants: storeProducts.variants,
    })
    .from(storeProducts)
    .where(and(eq(storeProducts.storeId, store.id), eq(storeProducts.isActive, true)))

  const b = bundle[0]

  return (
    <div className="space-y-6">
      <h1 className="ds-heading text-2xl font-bold">تعديل الحزمة</h1>
      <BundleForm
        products={products}
        initialData={{
          id: b.id,
          name: b.name,
          slug: b.slug,
          description: b.description,
          imageUrl: b.imageUrl,
          discountType: b.discountType,
          discountValue: b.discountValue,
          customPrice: b.customPrice,
          isActive: b.isActive,
          startsAt: b.startsAt?.toISOString() ?? null,
          endsAt: b.endsAt?.toISOString() ?? null,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }}
      />
    </div>
  )
}
```

### 1.8 مكونات Storefront (الحزم)

#### Bundle Card

```tsx
// src/app/store/_components/bundle-card.tsx
'use client'

import Link from 'next/link'
import { useStore } from '@/lib/tenant/store-context'
import { useCartStore } from '@/lib/stores/cart-store'

type BundleCardProps = {
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  items: Array<{
    productId: string
    productName: string
    productSlug: string
    productPrice: string
    productImages: string[]
    quantity: number
  }>
  originalPrice: string
  bundlePrice: string
  savings: string
  savingsPercent: number
  endsAt: string | null
}

export function BundleCard({
  name,
  slug,
  description,
  items,
  originalPrice,
  bundlePrice,
  savings,
  savingsPercent,
  endsAt,
}: BundleCardProps) {
  const { store } = useStore()
  const addItem = useCartStore((s) => s.addItem)
  const currency = (store.settings as Record<string, unknown>)?.currency as string ?? 'EGP'

  function handleAddBundle() {
    // Add all items individually with bundleId
    for (const item of items) {
      addItem({
        productId: item.productId,
        name: item.productName,
        price: Number(item.productPrice),
        image: item.productImages[0] ?? null,
        quantity: item.quantity,
      })
    }
  }

  return (
    <div className="card-surface rounded-xl overflow-hidden group">
      {/* Product thumbnails grid */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-[var(--ds-surface)]">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="aspect-square rounded overflow-hidden">
            {item.productImages[0] ? (
              <img
                src={item.productImages[0]}
                alt={item.productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
          </div>
        ))}
      </div>

      {/* Savings badge */}
      {savingsPercent > 0 && (
        <div className="bg-red-500 text-white text-center text-xs font-bold py-1">
          وفّر {savingsPercent}%
        </div>
      )}

      <div className="p-4 space-y-3">
        <h3 className="font-bold text-[var(--ds-text)]">{name}</h3>
        {description && (
          <p className="text-xs text-[var(--ds-text-muted)] line-clamp-2">{description}</p>
        )}

        {/* Items list */}
        <ul className="text-xs text-[var(--ds-text-muted)] space-y-1">
          {items.map((item, i) => (
            <li key={i}>
              {item.productName} {item.quantity > 1 && `×${item.quantity}`}
            </li>
          ))}
        </ul>

        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--ds-accent)]">
            {bundlePrice} {currency}
          </span>
          <span className="text-sm text-[var(--ds-text-muted)] line-through">
            {originalPrice} {currency}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddBundle}
          className="w-full ds-button ds-button-primary text-sm py-2"
        >
          أضف الحزمة للسلة
        </button>
      </div>
    </div>
  )
}
```

#### Bundles Section (الصفحة الرئيسية)

```tsx
// src/app/store/_components/bundles-section.tsx
import { BundleCard } from './bundle-card'

type BundlesSectionProps = {
  storeSlug: string
  bundles: Array<{
    name: string
    slug: string
    description: string | null
    imageUrl: string | null
    items: Array<{
      productId: string
      productName: string
      productSlug: string
      productPrice: string
      productImages: string[]
      quantity: number
    }>
    originalPrice: string
    bundlePrice: string
    savings: string
    savingsPercent: number
    endsAt: string | null
  }>
}

export function BundlesSection({ bundles }: BundlesSectionProps) {
  if (!bundles || bundles.length === 0) return null

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <h2 className="ds-heading text-2xl font-bold mb-6 text-center">
          🎁 حزم مخفضة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.slug} {...bundle} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

### 1.9 Checkout Integration (الحزم)

> **تعديل** `src/app/api/checkout/route.ts`

هذا التعديل **يُضاف** لدعم الحزم في الـ Checkout. المنطق:
- إذا الـ item فيه `bundleId` → نجلب بيانات الحزمة + نتأكد إنها نشطة
- خصم الحزمة يتحسب ويتطبّق كـ discount على الطلب
- كل منتج في الحزمة ينقص مخزونه بشكل مستقل

**أضف في checkout validation schema:**

```typescript
// في checkout items schema — أضف bundleId:
const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1),
  bundleId: z.string().uuid().optional(), // ← جديد P4-C
})
```

**أضف بعد validation وقبل إنشاء الطلب (داخل الـ transaction):**

```typescript
// Bundle discount calculation
let bundleDiscount = 0
const bundleIds = [...new Set(items.filter((i) => i.bundleId).map((i) => i.bundleId!))]

if (bundleIds.length > 0) {
  for (const bundleId of bundleIds) {
    const bundle = await tx
      .select()
      .from(storeBundles)
      .where(and(
        eq(storeBundles.id, bundleId),
        eq(storeBundles.storeId, store.id),
        eq(storeBundles.isActive, true),
      ))
      .limit(1)

    if (!bundle[0]) continue

    const b = bundle[0]
    const bundleItems = items.filter((i) => i.bundleId === bundleId)
    const bundleSubtotal = bundleItems.reduce((sum, item) => {
      const product = validatedProducts.find((p) => p.id === item.productId)
      return sum + (product ? Number(product.price) * item.quantity : 0)
    }, 0)

    if (b.discountType === 'percentage' && b.discountValue) {
      bundleDiscount += bundleSubtotal * (Number(b.discountValue) / 100)
    } else if (b.discountType === 'fixed' && b.discountValue) {
      bundleDiscount += Number(b.discountValue)
    } else if (b.discountType === 'custom_price' && b.customPrice) {
      bundleDiscount += bundleSubtotal - Number(b.customPrice)
    }
  }
}

// أضف bundleDiscount إلى totalDiscount:
const totalDiscount = couponDiscount + bundleDiscount
```

### 1.10 تعديل Store Homepage

> **تعديل** `src/app/store/page.tsx`

أضف import و fetch الحزم، ثم عرض `BundlesSection`:

```typescript
// أضف imports:
import { BundlesSection } from './_components/bundles-section'

// في الـ fetch (بعد products):
// Fetch active bundles
const bundlesRes = await fetch(
  `${process.env.NEXT_PUBLIC_APP_URL}/api/storefront/bundles`,
  { headers: { host: `${store.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` }, next: { revalidate: 300 } },
)
const bundlesData = bundlesRes.ok ? await bundlesRes.json() : { data: [] }

// في الـ JSX (بعد Featured Products وقبل Latest Products):
{Boolean((store.settings as Record<string, unknown>)?.bundlesEnabled) && (
  <BundlesSection storeSlug={store.slug} bundles={bundlesData.data ?? []} />
)}
```

> **ملاحظة بديلة**: لو الصفحة الرئيسية بتستخدم server-side queries مباشرة بدل fetch، استخدم الـ direct query pattern بنفس logic الـ storefront bundles API.

---

## 2. عداد تنازلي للعروض (Countdown Timer)

### 2.1 لا يحتاج جداول جديدة

- حقول `saleStartsAt` و `saleEndsAt` — تُضاف لجدول `storeProducts` مباشرة
- حقول StoreSettings الخمسة — تُضاف في JSONB

### 2.2 تعديل storeProducts

أضف في `storeProducts` table definition (بعد `translations`):

```typescript
  // P4-C: Sale countdown
  saleStartsAt: timestamp('sale_starts_at', { withTimezone: true }),
  saleEndsAt: timestamp('sale_ends_at', { withTimezone: true }),
```

### 2.3 تعديل Product Validation

في `src/lib/validations/product.ts` — أضف في `updateProductSchema`:

```typescript
  saleStartsAt: z.string().nullable().optional(),
  saleEndsAt: z.string().nullable().optional(),
```

### 2.4 تعديل Product Update API

في `src/app/api/dashboard/products/[id]/route.ts` — أضف في PUT handler:

```typescript
    if (data.saleStartsAt !== undefined) {
      updateData.saleStartsAt = data.saleStartsAt ? new Date(data.saleStartsAt) : null
    }
    if (data.saleEndsAt !== undefined) {
      updateData.saleEndsAt = data.saleEndsAt ? new Date(data.saleEndsAt) : null
    }
```

### 2.5 Countdown Timer Component (Reusable)

```tsx
// src/app/store/_components/countdown-timer.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

type CountdownTimerProps = {
  endDate: string // ISO date string
  size?: 'sm' | 'md' | 'lg'
  onExpired?: () => void
  className?: string
}

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calcTimeLeft(endDate: string): TimeLeft | null {
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function CountdownTimer({ endDate, size = 'md', onExpired, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calcTimeLeft(endDate))
  const [expired, setExpired] = useState(false)

  const handleExpired = useCallback(() => {
    setExpired(true)
    onExpired?.()
  }, [onExpired])

  useEffect(() => {
    const timer = setInterval(() => {
      const t = calcTimeLeft(endDate)
      if (!t) {
        clearInterval(timer)
        handleExpired()
        return
      }
      setTimeLeft(t)
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate, handleExpired])

  if (expired || !timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2',
    lg: 'text-lg gap-3',
  }

  const boxClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
  }

  const units = [
    { value: timeLeft.days, label: 'يوم' },
    { value: timeLeft.hours, label: 'ساعة' },
    { value: timeLeft.minutes, label: 'دقيقة' },
    { value: timeLeft.seconds, label: 'ثانية' },
  ]

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} ${className ?? ''}`} dir="rtl">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-1">
          <div className={`flex flex-col items-center justify-center rounded-lg bg-black/10 font-bold font-mono ${boxClasses[size]}`}>
            <span>{pad(unit.value)}</span>
            <span className="text-[0.5em] font-normal opacity-70">{unit.label}</span>
          </div>
          {i < units.length - 1 && <span className="font-bold opacity-50">:</span>}
        </div>
      ))}
    </div>
  )
}
```

### 2.6 Countdown Banner (أعلى المتجر)

```tsx
// src/app/store/_components/countdown-banner.tsx
'use client'

import { CountdownTimer } from './countdown-timer'
import { useState } from 'react'

type CountdownBannerProps = {
  text: string
  endDate: string
  bgColor: string
  textColor: string
}

export function CountdownBanner({ text, endDate, bgColor, textColor }: CountdownBannerProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div
      className="relative py-2 px-4 text-center"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span className="text-sm font-bold">{text}</span>
        <CountdownTimer
          endDate={endDate}
          size="sm"
          onExpired={() => setVisible(false)}
        />
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute top-1/2 left-2 -translate-y-1/2 opacity-70 hover:opacity-100 text-lg leading-none"
        style={{ color: textColor }}
        aria-label="إغلاق"
      >
        ×
      </button>
    </div>
  )
}
```

### 2.7 Product Sale Countdown

```tsx
// src/app/store/product/[slug]/_components/product-sale-countdown.tsx
'use client'

import { CountdownTimer } from '@/app/store/_components/countdown-timer'

type ProductSaleCountdownProps = {
  saleEndsAt: string
  compareAtPrice: string
  price: string
  currency: string
}

export function ProductSaleCountdown({
  saleEndsAt,
  compareAtPrice,
  price,
  currency,
}: ProductSaleCountdownProps) {
  const discount = Math.round(
    ((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100,
  )

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
        <span>🔥</span>
        <span>العرض ينتهي خلال:</span>
      </div>
      <CountdownTimer endDate={saleEndsAt} size="md" />
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-xl font-bold text-red-600">
          {price} {currency}
        </span>
        <span className="text-sm text-gray-500 line-through">
          {compareAtPrice} {currency}
        </span>
        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold">
          وفّر {discount}%
        </span>
      </div>
    </div>
  )
}
```

### 2.8 تعديل Store Layout — إضافة CountdownBanner

في `src/app/store/layout.tsx` — أضف import و render:

```typescript
// أضف import:
import { CountdownBanner } from './_components/countdown-banner'

// أضف قبل <StoreHeader> مباشرة (داخل div.store-theme-scope):
{Boolean((store.settings as Record<string, unknown>)?.countdownBannerEnabled) &&
  (store.settings as Record<string, unknown>)?.countdownBannerEndDate && (
  <CountdownBanner
    text={String((store.settings as Record<string, unknown>)?.countdownBannerText ?? 'تخفيضات محدودة!')}
    endDate={String((store.settings as Record<string, unknown>)?.countdownBannerEndDate)}
    bgColor={String((store.settings as Record<string, unknown>)?.countdownBannerBgColor ?? '#ef4444')}
    textColor={String((store.settings as Record<string, unknown>)?.countdownBannerTextColor ?? '#ffffff')}
  />
)}
```

### 2.9 تعديل Product Page — إضافة ProductSaleCountdown

في `src/app/store/product/[slug]/page.tsx` أو `product-details.tsx`:

```typescript
// أضف import:
import { ProductSaleCountdown } from './_components/product-sale-countdown'

// في الـ JSX — بعد السعر وقبل "أضف للسلة":
{product.saleEndsAt &&
  product.compareAtPrice &&
  Number(product.compareAtPrice) > Number(product.price) &&
  new Date(product.saleEndsAt) > new Date() && (
  <ProductSaleCountdown
    saleEndsAt={product.saleEndsAt.toISOString()}
    compareAtPrice={product.compareAtPrice}
    price={product.price}
    currency={store.settings.currency}
  />
)}
```

---

## 3. إثبات اجتماعي (Social Proof Popup)

### 3.1 لا يحتاج جداول جديدة

يعتمد على بيانات الطلبات الموجودة (`storeOrders` + `storeOrderItems`).

### 3.2 API Route — آخر 10 طلبات

```typescript
// src/app/api/storefront/social-proof/route.ts
import 'server-only'
import { desc, eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { storeOrders, storeOrderItems } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { apiError } from '@/lib/api/response'
import { NextResponse } from 'next/server'

/**
 * GET /api/storefront/social-proof — Last 10 orders (cached 5 min)
 */
export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const settings = store.settings as Record<string, unknown>
    if (!settings?.socialProofEnabled) {
      return apiSuccess([])
    }

    // Get last 10 delivered/confirmed orders
    const recentOrders = await db
      .select({
        id: storeOrders.id,
        customerName: storeOrders.customerName,
        governorate: sql<string>`(${storeOrders.shippingAddress}->>'governorate')`.as('governorate'),
        createdAt: storeOrders.createdAt,
      })
      .from(storeOrders)
      .where(and(
        eq(storeOrders.storeId, store.id),
        sql`${storeOrders.orderStatus} IN ('confirmed', 'processing', 'shipped', 'delivered')`,
      ))
      .orderBy(desc(storeOrders.createdAt))
      .limit(10)

    // Fetch first item for each order
    const proofs = await Promise.all(
      recentOrders.map(async (order) => {
        const item = await db
          .select({ name: storeOrderItems.name })
          .from(storeOrderItems)
          .where(eq(storeOrderItems.orderId, order.id))
          .limit(1)

        // Privacy: first name only
        const firstName = order.customerName.split(' ')[0]

        // Calculate "ago" text
        const diffMs = Date.now() - new Date(order.createdAt).getTime()
        const diffMins = Math.floor(diffMs / 60000)
        let ago: string
        if (diffMins < 60) {
          ago = `${diffMins} دقيقة`
        } else if (diffMins < 1440) {
          ago = `${Math.floor(diffMins / 60)} ساعة`
        } else {
          ago = `${Math.floor(diffMins / 1440)} يوم`
        }

        return {
          customerName: firstName,
          governorate: order.governorate ?? '',
          productName: item[0]?.name ?? 'منتج',
          ago,
        }
      }),
    )

    // Cache for 5 minutes
    return NextResponse.json(
      { success: true, data: proofs },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    )
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 3.3 Social Proof Popup Component

```tsx
// src/app/store/_components/social-proof-popup.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/tenant/store-context'

type SocialProofItem = {
  customerName: string
  governorate: string
  productName: string
  ago: string
}

export function SocialProofPopup() {
  const { store } = useStore()
  const settings = store.settings as Record<string, unknown>

  const interval = (settings?.socialProofInterval as number) ?? 30
  const duration = (settings?.socialProofDuration as number) ?? 5
  const position = (settings?.socialProofPosition as string) ?? 'bottom-left'

  const [proofs, setProofs] = useState<SocialProofItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Fetch proofs on mount
  useEffect(() => {
    fetch('/api/storefront/social-proof')
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.length) setProofs(json.data)
      })
      .catch(() => {})
  }, [])

  // Cycle through proofs
  const showNext = useCallback(() => {
    if (proofs.length === 0 || dismissed) return
    setVisible(true)

    // Hide after duration
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, duration * 1000)

    return () => clearTimeout(hideTimer)
  }, [proofs.length, dismissed, duration])

  useEffect(() => {
    if (proofs.length === 0) return

    // Show first one after a short delay
    const initialDelay = setTimeout(() => {
      showNext()
    }, 5000)

    // Then cycle
    const cycleTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % proofs.length)
      showNext()
    }, (interval + duration) * 1000)

    return () => {
      clearTimeout(initialDelay)
      clearInterval(cycleTimer)
    }
  }, [proofs, interval, duration, showNext])

  if (proofs.length === 0 || dismissed) return null

  const current = proofs[currentIndex]
  if (!current) return null

  const positionClass = position === 'bottom-right'
    ? 'left-4 sm:left-6'
    : 'right-4 sm:right-6'

  return (
    <div
      className={`fixed bottom-4 ${positionClass} z-50 transition-all duration-500 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white shadow-xl rounded-lg border border-gray-200 p-3 max-w-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm shrink-0">
          🛒
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {current.customerName} من {current.governorate}
          </p>
          <p className="text-xs text-gray-500 truncate">
            اشترى &quot;{current.productName}&quot; قبل {current.ago}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 text-xs leading-none shrink-0"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
```

### 3.4 تعديل Store Layout — إضافة SocialProofPopup

في `src/app/store/layout.tsx` — أضف:

```typescript
// أضف import:
import { SocialProofPopup } from './_components/social-proof-popup'

// أضف بعد <PwaInstallBanner /> وقبل إغلاق </div>:
{Boolean((store.settings as Record<string, unknown>)?.socialProofEnabled) && <SocialProofPopup />}
```

---

## 4. إشعار نفاد المخزون (Stock Alerts)

### 4.1 جدول قاعدة البيانات

أضف في `src/db/schema.ts`:

```typescript
// ============================================
// P4-C: STORE STOCK ALERTS
// ============================================
export const storeStockAlerts = pgTable('store_stock_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => storeProducts.id, { onDelete: 'cascade' })
    .notNull(),
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

### 4.2 Relations

```typescript
export const storeStockAlertsRelations = relations(storeStockAlerts, ({ one }) => ({
  store: one(stores, {
    fields: [storeStockAlerts.storeId],
    references: [stores.id],
  }),
  product: one(storeProducts, {
    fields: [storeStockAlerts.productId],
    references: [storeProducts.id],
  }),
}))
```

أضف في `storesRelations`:

```typescript
  stockAlerts: many(storeStockAlerts),
```

أضف في `storeProductsRelations`:

```typescript
  stockAlerts: many(storeStockAlerts),
```

### 4.3 Storefront API — تسجيل إشعار

```typescript
// src/app/api/storefront/stock-alerts/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { storeStockAlerts, storeProducts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { apiError } from '@/lib/api/response'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'
import { z } from 'zod'

const stockAlertSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().nullable().optional(),
  customerPhone: z.string().min(8).max(20).optional(),
  customerEmail: z.string().email().optional(),
}).refine(
  (data) => data.customerPhone || data.customerEmail,
  { message: 'يجب إدخال رقم الهاتف أو البريد الإلكتروني' },
)

/**
 * POST /api/storefront/stock-alerts — Rate limited
 */
export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const settings = store.settings as Record<string, unknown>
    if (!settings?.stockAlertsEnabled) {
      return apiError('خدمة الإشعارات غير مفعّلة', 403)
    }

    // Rate limit: 10 per 5 minutes per IP
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`stock-alert:${ip}`, { maxRequests: 10, windowSeconds: 300 })
    if (!allowed) return apiError('حاول مرة أخرى بعد قليل', 429)

    const body = await request.json()
    const parsed = stockAlertSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { productId, variantId, customerPhone, customerEmail } = parsed.data

    // Verify product exists and belongs to store
    const product = await db
      .select({ id: storeProducts.id, stock: storeProducts.stock })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, productId), eq(storeProducts.storeId, store.id)))
      .limit(1)

    if (!product[0]) return ApiErrors.notFound('المنتج')

    // Upsert: if already registered, just return success
    const identifier = customerPhone ?? customerEmail!
    const existing = await db
      .select({ id: storeStockAlerts.id })
      .from(storeStockAlerts)
      .where(and(
        eq(storeStockAlerts.storeId, store.id),
        eq(storeStockAlerts.productId, productId),
        eq(storeStockAlerts.status, 'waiting'),
        customerPhone
          ? eq(storeStockAlerts.customerPhone, identifier)
          : eq(storeStockAlerts.customerEmail, identifier),
      ))
      .limit(1)

    if (existing[0]) {
      return apiSuccess({ message: 'أنت مسجّل بالفعل لهذا المنتج' })
    }

    await db.insert(storeStockAlerts).values({
      storeId: store.id,
      productId,
      variantId: variantId ?? null,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
      status: 'waiting',
    })

    return apiSuccess({ message: 'تم التسجيل! هنبلّغك لما المنتج يرجع' }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 4.4 Storefront API — عدد المنتظرين

```typescript
// src/app/api/storefront/stock-alerts/count/[productId]/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { storeStockAlerts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { apiError } from '@/lib/api/response'

type Params = { params: Promise<{ productId: string }> }

/**
 * GET /api/storefront/stock-alerts/count/[productId]
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const { productId } = await params

    const result = await db
      .select({
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(storeStockAlerts)
      .where(and(
        eq(storeStockAlerts.storeId, store.id),
        eq(storeStockAlerts.productId, productId),
        eq(storeStockAlerts.status, 'waiting'),
      ))

    return apiSuccess({ count: result[0]?.count ?? 0 })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 4.5 Dashboard API — إخطار يدوي

```typescript
// src/app/api/dashboard/stock-alerts/notify/[productId]/route.ts
import 'server-only'
import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { storeStockAlerts, storeProducts } from '@/db/schema'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { sendEmail } from '@/lib/email/resend'

type Params = { params: Promise<{ productId: string }> }

/**
 * POST /api/dashboard/stock-alerts/notify/[productId] — Manual notify
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { productId } = await params

    const product = await db
      .select({ id: storeProducts.id, name: storeProducts.name, slug: storeProducts.slug })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, productId), eq(storeProducts.storeId, store.id)))
      .limit(1)

    if (!product[0]) return ApiErrors.notFound('المنتج')

    // Get all waiting alerts
    const alerts = await db
      .select()
      .from(storeStockAlerts)
      .where(and(
        eq(storeStockAlerts.storeId, store.id),
        eq(storeStockAlerts.productId, productId),
        eq(storeStockAlerts.status, 'waiting'),
      ))

    if (alerts.length === 0) {
      return apiSuccess({ notified: 0, message: 'لا يوجد عملاء منتظرين' })
    }

    const productUrl = `https://${store.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/product/${product[0].slug}`
    let notifiedCount = 0

    for (const alert of alerts) {
      try {
        if (alert.customerEmail) {
          await sendEmail({
            to: alert.customerEmail,
            subject: `🎉 المنتج "${product[0].name}" رجع متوفر!`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif;">
                <h2>🎉 خبر سعيد!</h2>
                <p>المنتج اللي كنت بتستنّاه — <strong>${product[0].name}</strong> — رجع متوفر دلوقتي!</p>
                <p style="margin: 20px 0;">
                  <a href="${productUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                    اطلبه دلوقتي
                  </a>
                </p>
                <p style="color: #666; font-size: 13px;">الكميات محدودة — لا تفوّتها!</p>
              </div>
            `,
          })
        }
        notifiedCount++
      } catch {
        // Continue with other alerts
      }
    }

    // Mark all as notified
    await db
      .update(storeStockAlerts)
      .set({ status: 'notified', notifiedAt: new Date() })
      .where(and(
        eq(storeStockAlerts.storeId, store.id),
        eq(storeStockAlerts.productId, productId),
        eq(storeStockAlerts.status, 'waiting'),
      ))

    return apiSuccess({ notified: notifiedCount })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 4.6 Auto-Trigger في Product Update

> **تعديل** `src/app/api/dashboard/products/[id]/route.ts`

أضف بعد `const updated = await db.update(storeProducts)...returning()` وقبل image cleanup:

```typescript
    // P4-C: Auto-trigger stock alerts when stock goes from 0 to positive
    if (data.stock !== undefined && data.stock > 0) {
      // Check if stock was 0 before
      const oldStock = existing.stock ?? 0
      if (oldStock === 0 || (typeof existing.stock === 'number' && existing.stock <= 0)) {
        // Fire-and-forget: notify waiting customers
        import('@/lib/stock-alerts/notify-stock-alerts').then(({ notifyStockAlerts }) =>
          notifyStockAlerts(store.id, id, updated[0]?.name ?? '').catch((err) =>
            console.error('[StockAlerts] Notification error:', err),
          ),
        ).catch(() => {})
      }
    }
```

**ملاحظة**: يحتاج أيضاً إضافة `stock` في الـ select الأوّلي للمنتج الحالي:

```typescript
    // تعديل الـ select الموجود — أضف stock:
    const existingProduct = await db
      .select({
        id: storeProducts.id,
        images: storeProducts.images,
        sku: storeProducts.sku,
        stock: storeProducts.stock,  // ← أضف هذا
      })
```

### 4.7 Stock Alert Notification Helper

```typescript
// src/lib/stock-alerts/notify-stock-alerts.ts
import 'server-only'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { storeStockAlerts, stores } from '@/db/schema'
import { sendEmail } from '@/lib/email/resend'

/**
 * Notify all waiting customers that a product is back in stock.
 * Called fire-and-forget from product update API.
 */
export async function notifyStockAlerts(
  storeId: string,
  productId: string,
  productName: string,
): Promise<void> {
  // Get store info for URL
  const store = await db
    .select({ slug: stores.slug })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1)

  if (!store[0]) return

  // Get all waiting alerts for this product
  const alerts = await db
    .select()
    .from(storeStockAlerts)
    .where(and(
      eq(storeStockAlerts.storeId, storeId),
      eq(storeStockAlerts.productId, productId),
      eq(storeStockAlerts.status, 'waiting'),
    ))

  if (alerts.length === 0) return

  // Send notifications
  for (const alert of alerts) {
    try {
      if (alert.customerEmail) {
        sendEmail({
          to: alert.customerEmail,
          subject: `🎉 "${productName}" رجع متوفر!`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif;">
              <h2>🎉 خبر سعيد!</h2>
              <p>المنتج <strong>${productName}</strong> رجع متوفر!</p>
              <p style="margin: 20px 0;">
                <a href="https://${store[0].slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/product/${productId}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                  اطلبه دلوقتي
                </a>
              </p>
            </div>
          `,
        }).catch(() => {})
      }
    } catch {
      // Continue
    }
  }

  // Mark all as notified
  await db
    .update(storeStockAlerts)
    .set({ status: 'notified', notifiedAt: new Date() })
    .where(and(
      eq(storeStockAlerts.storeId, storeId),
      eq(storeStockAlerts.productId, productId),
      eq(storeStockAlerts.status, 'waiting'),
    ))
}
```

### 4.8 Stock Alert Form (صفحة المنتج)

```tsx
// src/app/store/product/[slug]/_components/stock-alert-form.tsx
'use client'

import { useState } from 'react'

type StockAlertFormProps = {
  productId: string
  variantId?: string | null
}

export function StockAlertForm({ productId, variantId }: StockAlertFormProps) {
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim()) return

    setStatus('loading')

    const isEmail = contact.includes('@')
    const payload = {
      productId,
      variantId: variantId ?? null,
      ...(isEmail ? { customerEmail: contact } : { customerPhone: contact }),
    }

    try {
      const res = await fetch('/api/storefront/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(json.data?.message ?? 'تم التسجيل!')
      } else {
        setStatus('error')
        setMessage(json.error ?? 'حدث خطأ')
      }
    } catch {
      setStatus('error')
      setMessage('حدث خطأ في الاتصال')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-700 text-sm font-medium">✅ {message}</p>
      </div>
    )
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-orange-600">
        <span>🔔</span>
        <p className="text-sm font-medium">المنتج نفذ حالياً — بلّغني لما يرجع!</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="رقم الهاتف أو البريد الإلكتروني"
          className="ds-input flex-1 text-sm"
          required
          dir="ltr"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="ds-button ds-button-primary text-sm whitespace-nowrap"
        >
          {status === 'loading' ? 'جارٍ...' : 'بلّغني'}
        </button>
      </form>

      {status === 'error' && (
        <p className="text-red-500 text-xs">{message}</p>
      )}
    </div>
  )
}
```

### 4.9 تعديل Product Page — إضافة StockAlertForm

في صفحة المنتج (بعد زر «أضف للسلة» أو بدلاً من «نفذ من المخزون»):

```typescript
// أضف import:
import { StockAlertForm } from './_components/stock-alert-form'

// في الـ JSX — عندما المنتج نفذ:
{product.stock <= 0 &&
  Boolean((store.settings as Record<string, unknown>)?.stockAlertsEnabled) && (
  <StockAlertForm productId={product.id} />
)}
```

---

## 6. ملف Migration

```sql
-- migrations/p4c_sales_boosters.sql
-- P4-C: Sales Boosters Tables

-- =============================================
-- 1. STORE BUNDLES
-- =============================================
CREATE TABLE IF NOT EXISTS store_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  discount_type TEXT NOT NULL,
  discount_value DECIMAL(10,2),
  custom_price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bundle_store_slug ON store_bundles(store_id, slug);
CREATE INDEX IF NOT EXISTS idx_bundles_store ON store_bundles(store_id);

-- =============================================
-- 2. STORE BUNDLE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS store_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES store_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  variant_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bundle_item ON store_bundle_items(bundle_id, product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON store_bundle_items(bundle_id);

-- =============================================
-- 3. STORE STOCK ALERTS
-- =============================================
CREATE TABLE IF NOT EXISTS store_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  variant_id TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_account_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON store_stock_alerts(store_id, product_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_stock_alert ON store_stock_alerts(store_id, product_id, variant_id, customer_phone);

-- =============================================
-- 4. ADD SALE COLUMNS TO PRODUCTS
-- =============================================
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Bundles
ALTER TABLE store_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_bundles_select" ON store_bundles FOR SELECT USING (true);
CREATE POLICY "store_bundles_insert" ON store_bundles FOR INSERT WITH CHECK (true);
CREATE POLICY "store_bundles_update" ON store_bundles FOR UPDATE USING (true);
CREATE POLICY "store_bundles_delete" ON store_bundles FOR DELETE USING (true);

-- Bundle Items
ALTER TABLE store_bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_bundle_items_select" ON store_bundle_items FOR SELECT USING (true);
CREATE POLICY "store_bundle_items_insert" ON store_bundle_items FOR INSERT WITH CHECK (true);
CREATE POLICY "store_bundle_items_update" ON store_bundle_items FOR UPDATE USING (true);
CREATE POLICY "store_bundle_items_delete" ON store_bundle_items FOR DELETE USING (true);

-- Stock Alerts
ALTER TABLE store_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_stock_alerts_select" ON store_stock_alerts FOR SELECT USING (true);
CREATE POLICY "store_stock_alerts_insert" ON store_stock_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "store_stock_alerts_update" ON store_stock_alerts FOR UPDATE USING (true);
CREATE POLICY "store_stock_alerts_delete" ON store_stock_alerts FOR DELETE USING (true);
```

---

## 7. خطة الاختبار

### حزم المنتجات

| الرقم | الاختبار | النتيجة المتوقعة |
|-------|----------|-----------------|
| 1 | إنشاء حزمة بمنتجين + خصم 20% | تُنشأ بنجاح + items تُحفظ |
| 2 | إنشاء حزمة بمنتج واحد فقط | رسالة خطأ «لازم منتجين على الأقل» |
| 3 | إنشاء حزمة بـ slug مكرر | رسالة خطأ «الرابط مستخدم» |
| 4 | تعديل حزمة (تغيير اسم + إضافة منتج) | تُحدّث بنجاح |
| 5 | حذف حزمة | تُحذف + items تُحذف (CASCADE) |
| 6 | عرض الحزم النشطة في Storefront | تظهر النشطة فقط + حساب السعر صحيح |
| 7 | عرض حزمة بتاريخ انتهاء قديم | لا تظهر (منتهية) |
| 8 | إضافة حزمة للسلة | كل المنتجات تُضاف كـ items منفصلة |
| 9 | Checkout مع حزمة | خصم الحزمة يُطبّق + مخزون كل منتج ينقص |

### عداد تنازلي

| الرقم | الاختبار | النتيجة المتوقعة |
|-------|----------|-----------------|
| 1 | تفعيل countdown banner من الإعدادات | يظهر البانر أعلى المتجر |
| 2 | يوصل العداد لصفر | يختفي البانر تلقائياً |
| 3 | إغلاق البانر بـ × | يختفي البانر |
| 4 | منتج عليه saleEndsAt + compareAtPrice | يظهر العداد في صفحة المنتج |
| 5 | منتج بدون saleEndsAt | لا يظهر العداد |
| 6 | تعديل ألوان البانر | تتغير الألوان مباشرة |

### Social Proof

| الرقم | الاختبار | النتيجة المتوقعة |
|-------|----------|-----------------|
| 1 | تفعيل social proof | popup يبدأ بالظهور بعد 5 ثواني |
| 2 | لا توجد طلبات | لا يظهر شيء |
| 3 | 5 طلبات | يدوّر عليهم بالترتيب |
| 4 | إغلاق الـ popup | لا يظهر مرة أخرى |
| 5 | تغيير الموقع لـ bottom-right | ينتقل لليسار (RTL) |
| 6 | Privacy check | يظهر الاسم الأول فقط + المحافظة (مش العنوان الكامل) |

### إشعار المخزون

| الرقم | الاختبار | النتيجة المتوقعة |
|-------|----------|-----------------|
| 1 | منتج نفذ + تسجيل إشعار بإيميل | يُسجّل بنجاح |
| 2 | تسجيل نفس الشخص مرتين | رسالة «أنت مسجّل بالفعل» |
| 3 | عدد المنتظرين | يرجع العدد الصحيح |
| 4 | تحديث مخزون من 0 إلى 10 | Auto-trigger → إيميلات تُبعت + status → notified |
| 5 | تحديث مخزون من 5 إلى 10 | لا يحصل شيء (مكنش صفر) |
| 6 | إخطار يدوي من الداشبورد | إيميلات تُبعت + العدد يرجع صحيح |
| 7 | Rate limit: 11 طلب تسجيل | الـ 11 يفشل (429) |
| 8 | منتج فيه variants نفذ | التسجيل يشمل variantId |

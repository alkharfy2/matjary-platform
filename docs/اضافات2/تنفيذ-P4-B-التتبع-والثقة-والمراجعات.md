# دليل تنفيذ P4-B — التتبع والثقة والمراجعات

> **تاريخ الإنشاء**: 30 مارس 2026  
> **المرجعية**: اضافات-2.md → المرحلة P4-B  
> **الهدف**: دليل تنفيذ تفصيلي للمميزات الثلاثة بتاعة P4-B  
> **المستوى**: جاهز للتنفيذ (Copy-Paste Ready)  
> **الجهد**: ~4-6 أيام

---

## الفهرس

1. [نظرة عامة والأولويات](#نظرة-عامة-والأولويات)
2. [Facebook Conversion API — تكملة وتحسين](#1-facebook-conversion-api--تكملة-وتحسين)
3. [نظام المراجعات — التوسع والأتمتة](#2-نظام-المراجعات--التوسع-والأتمتة)
4. [صفحة تتبع الطلب — تحسينات](#3-صفحة-تتبع-الطلب--تحسينات)
5. [التكامل مع الأنظمة الموجودة](#4-التكامل-مع-الأنظمة-الموجودة)
6. [ملف Migration](#5-ملف-migration)
7. [خطة الاختبار](#7-خطة-الاختبار)
8. [الـ Prompt](#8-الـ-prompt)

---

## نظرة عامة والأولويات

### لماذا الثلاثة مع بعض؟

```
Facebook CAPI (#4) → بيانات إعلانات أدق → ROAS أحسن → مبيعات أكتر
        +
المراجعات (#5) → ثقة العميل ↑ → تحويل أعلى → مبيعات أكتر
        +
تتبع الطلب (#8) → العميل مرتاح → يقيّم إيجابي → المراجعات تتحسن
```

- الثلاثة بيخدموا دورة واحدة: **إعلان → شراء → تتبع → تقييم → إعلان أفضل**
- **CAPI** بيرفع جودة بيانات التاجر (ROAS أفضل)
- **المراجعات** بترفع التحويل (العميل يثق)
- **تتبع الطلب** بيقلل مشاكل "فين طلبي" + يخلي العميل يقيّم بعد التوصيل

### ترتيب التنفيذ

| الخطوة | الميزة | الجهد | السبب |
|--------|-------|-------|-------|
| 1 | Facebook CAPI — تكملة | 1-2 أيام | مش محتاج UI — بس server-side logic |
| 2 | المراجعات — توسع وأتمتة | 2-3 أيام | محتاج جدول جديد + صفحة token + أتمتة |
| 3 | تتبع الطلب — تحسينات | 0.5-1 يوم | تحسينات بسيطة على الموجود |

### ملخص الوضع الحالي (ما هو موجود بالفعل)

> **مهم جداً**: أجزاء كبيرة من P4-B **متنفذة بالفعل** من مراحل سابقة.  
> هذا الدليل يركز على ما **لم يتنفذ بعد** + التحسينات المطلوبة.

#### Facebook CAPI — الموجود ✅

| الملف | الحالة | الوصف |
|-------|--------|-------|
| `src/lib/tracking/facebook-capi.ts` | ✅ موجود | `sendConversionEvent()` بالكامل — SHA-256 hashing، event_id، test_event_code |
| `src/lib/tracking/facebook-pixel.ts` | ✅ موجود | Client-side: `trackPageView`, `trackViewContent`, `trackAddToCart`, `trackInitiateCheckout`, `trackPurchase`, `trackSearch` |
| `src/components/tracking/facebook-pixel-script.tsx` | ✅ موجود | حقن base code + PageView تلقائي |
| `src/components/tracking/tracking-scripts.tsx` | ✅ موجود | يجمع كل tracking scripts |
| `src/app/api/storefront/capi/track/route.ts` | ✅ موجود | API لإرسال ViewContent, AddToCart, InitiateCheckout, Search من Client |
| `src/app/api/checkout/route.ts` | ✅ يرسل Purchase | `sendConversionEvent(...)` fire-and-forget بعد إنشاء الطلب |
| StoreSettings | ✅ موجودة | `facebookPixelId`, `facebookConversionApiToken`, `facebookTestEventCode`, `facebookConversionApiEnabled` |

#### Facebook CAPI — المطلوب إضافته ❌

| المطلوب | الوصف |
|---------|-------|
| `hash-user-data.ts` | utility منفصل لـ SHA-256 hashing (مع التنسيق الصحيح لرقم الهاتف) |
| `event-deduplication.ts` | utility لتوليد event_id مشترك بين Client + Server |
| ViewContent Server-side | في `store/product/[slug]/page.tsx` — Server Component يبعت CAPI event |
| InitiateCheckout Server-side | في `store/checkout/page.tsx` — Server Component يبعت CAPI event |
| Lead Event | في `api/storefront/abandoned-cart/route.ts` — بعد حفظ السلة المتروكة |
| Purchase في Kashier Webhook | في `api/payments/kashier/webhook/route.ts` — بعد تأكيد الدفع |
| تحديث Graph API Version | من `v21.0` إلى `v25.0` |

#### المراجعات — الموجود ✅

| الملف | الحالة | الوصف |
|-------|--------|-------|
| `storeReviews` table | ✅ موجود | كل الأعمدة المحسّنة: `customerAccountId`, `isVerifiedPurchase`, `images`, `merchantReply`, `merchantReplyAt`, `helpfulCount`, `orderId` |
| `src/app/api/storefront/reviews/route.ts` | ✅ GET + POST | جلب المراجعات + إنشاء مراجعة (مع verified purchase check + auto-approve) |
| `src/app/api/storefront/reviews/[id]/helpful/route.ts` | ✅ موجود | تسجيل "مفيد" +1 |
| `src/app/api/dashboard/reviews/route.ts` | ✅ موجود | جلب المراجعات للتاجر |
| `src/app/api/dashboard/reviews/[id]/route.ts` | ✅ موجود | موافقة/رفض + رد التاجر |
| `src/app/(dashboard)/dashboard/reviews/` | ✅ موجود | صفحة إدارة المراجعات كاملة (approve/reject/reply/delete/search/stats) |
| `src/app/store/product/[slug]/_components/product-reviews.tsx` | ✅ موجود | عرض المراجعات + ملخص + نموذج إضافة + images + merchant reply + helpful |
| StoreSettings | ✅ موجودة | `reviewsEnabled`, `reviewAutoApprove`, `reviewImagesAllowed`, `reviewImagesMax` |

#### المراجعات — المطلوب إضافته ❌

| المطلوب | الوصف |
|---------|-------|
| جدول `storeReviewRequests` | جدول طلبات التقييم التلقائية (token-based) |
| صفحة `/store/review/[token]/` | صفحة تقييم بالتوكن (بدون تسجيل دخول) |
| سير العمل التلقائي | عند التوصيل → بعد X ساعة → إيميل يطلب تقييم |
| إعدادات الأتمتة | `autoReviewRequestEnabled`, `reviewRequestDelay`, `reviewRequestChannel`, `reviewLoyaltyPoints` |
| رفع صور التقييم | Upload endpoint + حدود (3 صور × 5MB) |
| النجوم في Product Card | إضافة ★★★★☆ في `product-card.tsx` |
| فلترة بالنجوم | في `product-reviews.tsx` — تصفية حسب عدد النجوم |

#### تتبع الطلب — الموجود ✅

| الملف | الحالة | الوصف |
|-------|--------|-------|
| `src/app/store/track/page.tsx` | ✅ موجود | Server Component مع metadata |
| `src/app/store/track/_components/track-order.tsx` | ✅ موجود | Client Component كامل: form + timeline + items + tracking info |
| `src/app/api/storefront/track/route.ts` | ✅ موجود | POST API — rate limit + phone verification + timeline builder |
| إيميل الشحن | ✅ موجود | في order status route: `OrderShippedEmail` مع trackingNumber |
| إيميل التوصيل | ✅ موجود | في order status route: `OrderDeliveredEmail` |

#### تتبع الطلب — المطلوب إضافته ❌

| المطلوب | الوصف |
|---------|-------|
| روابط شركات الشحن | `tracking-link.tsx` — تحويل trackingNumber لرابط تتبع حسب الشركة |
| تعبئة تلقائية من URL | دعم `?order=ORD-001` query param في صفحة التتبع |
| رابط التتبع في SMS/WhatsApp | إضافة لينك التتبع في رسالة الشحن |

---

## تغييرات مشتركة على StoreSettings

### الحقول الجديدة في StoreSettings (src/db/schema.ts)

```typescript
// === P4-B: Auto Review Request ===
autoReviewRequestEnabled: boolean      // default: true
reviewRequestDelay: number             // default: 2 — ساعات بعد التوصيل
reviewRequestChannel: 'email' | 'whatsapp' | 'both'  // default: 'email'
reviewLoyaltyPoints: number            // default: 5 — نقاط ولاء مقابل التقييم
```

> **ملاحظة**: الحقول التالية **موجودة بالفعل** في StoreSettings ولا تحتاج تعديل:
> - `reviewsEnabled: true`
> - `reviewAutoApprove: false`
> - `reviewImagesAllowed: true`
> - `reviewImagesMax: 3`
> - `facebookConversionApiEnabled: false`
> - `facebookPixelId`, `facebookConversionApiToken`, `facebookTestEventCode`

### الملفات المتأثرة

| الملف | التغيير |
|-------|--------|
| `src/db/schema.ts` | إضافة حقول P4-B لنوع `StoreSettings` + تعديل default |
| `src/lib/validations/store.ts` | إضافة حقول P4-B في schema التعديل |
| `src/app/api/dashboard/settings/route.ts` | السماح بتحديث الحقول الجديدة |

### لا يحتاج Migration لـ StoreSettings

`settings` هو JSONB — الحقول الجديدة بتترجع `undefined` لو مش موجودة، والكود بيتعامل معاها بـ default values. مش محتاجين SQL migration للـ settings.

---

## 1. Facebook Conversion API — تكملة وتحسين

### 1.1 الملف الموجود: facebook-capi.ts

> **لا تلمس الملف الحالي إلا لتحديث `GRAPH_API_VERSION`.**

الملف الحالي `src/lib/tracking/facebook-capi.ts` يعمل بكفاءة:
- SHA-256 hashing لبيانات المستخدم (email, phone)
- `event_id` للـ deduplication
- `test_event_code` للاختبار
- `action_source: 'website'`
- Error handling + logging

**التعديل الوحيد**: تحديث الإصدار:

```typescript
// src/lib/tracking/facebook-capi.ts — سطر 13
// قبل:
const GRAPH_API_VERSION = 'v21.0'
// بعد:
const GRAPH_API_VERSION = 'v25.0'
```

### 1.2 ملف جديد: hash-user-data.ts

```typescript
// src/lib/tracking/hash-user-data.ts
import 'server-only'
import { createHash } from 'crypto'

/**
 * SHA-256 hash لبيانات المستخدم المطلوبة في Facebook CAPI
 * كل القيم لازم تكون lowercase + trimmed قبل الهاش
 * الهاتف لازم يكون بالصيغة الدولية بدون + أو مسافات
 */

export function hashForCAPI(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
}

/**
 * تنسيق رقم الهاتف للـ CAPI
 * يحول أي صيغة لـ الصيغة الدولية (مثال: 01012345678 → 201012345678)
 */
export function formatPhoneForCAPI(phone: string, countryCode = '20'): string {
  // إزالة كل شيء ما عدا الأرقام
  const digits = phone.replace(/\D/g, '')

  // لو بيبدأ بـ 0 → استبدله بكود الدولة
  if (digits.startsWith('0')) {
    return countryCode + digits.slice(1)
  }

  // لو بيبدأ بكود الدولة → خلّيه زي ما هو
  if (digits.startsWith(countryCode)) {
    return digits
  }

  // غير كده → أضف كود الدولة
  return countryCode + digits
}

/**
 * بناء user_data object كامل ومهاش لـ CAPI
 */
export function buildCAPIUserData(data: {
  email?: string | null
  phone?: string | null
  firstName?: string | null
  city?: string | null
  country?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  fbc?: string | null
  fbp?: string | null
}): Record<string, unknown> {
  const userData: Record<string, unknown> = {}

  if (data.email) userData.em = [hashForCAPI(data.email)]
  if (data.phone) userData.ph = [hashForCAPI(formatPhoneForCAPI(data.phone))]
  if (data.firstName) userData.fn = [hashForCAPI(data.firstName)]
  if (data.city) userData.ct = [hashForCAPI(data.city)]
  if (data.country) userData.country = [hashForCAPI(data.country)]
  if (data.clientIpAddress) userData.client_ip_address = data.clientIpAddress
  if (data.clientUserAgent) userData.client_user_agent = data.clientUserAgent
  if (data.fbc) userData.fbc = data.fbc
  if (data.fbp) userData.fbp = data.fbp

  return userData
}
```

### 1.3 ملف جديد: event-deduplication.ts

```typescript
// src/lib/tracking/event-deduplication.ts

import { nanoid } from 'nanoid'

/**
 * توليد event_id فريد لـ Deduplication بين Client Pixel و Server CAPI.
 *
 * الفكرة:
 * - Client-side: fbq('track', 'Purchase', data, { eventID: eventId })
 * - Server-side: sendConversionEvent(..., eventId)
 * - Facebook بيدمجهم كحدث واحد ← لا تكرار
 *
 * الصيغة: {eventPrefix}_{nanoid}
 * أمثلة: purchase_abc123XY, viewcontent_def456ZW
 */
export function generateEventId(eventPrefix: string): string {
  return `${eventPrefix}_${nanoid(12)}`
}

/**
 * توليد event_id للـ Purchase event
 * يُستخدم في checkout لربط Client + Server
 */
export function generatePurchaseEventId(orderNumber: string): string {
  return `purchase_${orderNumber}`
}

/**
 * توليد event_id لأحداث المنتج
 */
export function generateProductEventId(
  event: 'viewcontent' | 'addtocart',
  productId: string,
): string {
  return `${event}_${productId}_${nanoid(8)}`
}

/**
 * توليد event_id للـ InitiateCheckout
 */
export function generateCheckoutEventId(): string {
  return `checkout_${nanoid(12)}`
}
```

### 1.4 إضافة ViewContent Server-side CAPI

في `src/app/store/product/[slug]/page.tsx` — أضف CAPI event في الـ Server Component:

```typescript
// في page.tsx بعد جلب بيانات المنتج والمتجر
// أضف هذا الاستيراد:
import { sendConversionEvent } from '@/lib/tracking/facebook-capi'
import { generateProductEventId } from '@/lib/tracking/event-deduplication'
import { headers } from 'next/headers'

// بعد جلب product و store بنجاح، وقبل return:
// === CAPI: ViewContent (fire-and-forget) ===
if (store.settings.facebookConversionApiEnabled &&
    store.settings.facebookPixelId &&
    store.settings.facebookConversionApiToken) {
  const headersList = await headers()
  const eventId = generateProductEventId('viewcontent', product.id)

  sendConversionEvent(
    {
      pixelId: store.settings.facebookPixelId,
      accessToken: store.settings.facebookConversionApiToken,
      testEventCode: store.settings.facebookTestEventCode,
    },
    'ViewContent',
    {
      clientIpAddress: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
      clientUserAgent: headersList.get('user-agent') ?? undefined,
    },
    {
      contentIds: [product.id],
      contentName: product.name,
      contentType: 'product',
      value: Number(product.price),
      currency: store.settings.currency,
    },
    `https://${store.slug}.matjary.com/product/${product.slug}`,
    eventId,
  ).catch(() => {}) // fire-and-forget
}

// === مهم: مرّر eventId للـ Client component عشان يبعته مع Client Pixel ===
// أضف eventId كـ prop لـ ProductDetails أو أي component يبعت client pixel event
```

**ملاحظة مهمة**: لازم تمرّر `eventId` للـ Client component عشان يبعته مع fbq:

```typescript
// في الـ Client component (product-details.tsx مثلاً)
// عند إرسال ViewContent من Client:
fbq('track', 'ViewContent', data, { eventID: viewContentEventId })
```

### 1.5 إضافة InitiateCheckout Server-side CAPI

> **⚠️ ملاحظة مهمة**: `src/app/store/checkout/page.tsx` هو **Client Component** (`'use client'`).
> لذلك **لا يمكن** استخدام `headers()` من `next/headers` أو استيراد `facebook-capi.ts` (اللي بيستخدم Node.js `crypto`) فيه مباشرة.
>
> **الحل**: الـ InitiateCheckout CAPI يتبعت عبر الـ API route الموجود `/api/storefront/capi/track` اللي **بالفعل يدعم InitiateCheckout**.
> مش محتاج أي تعديل — الـ Client Component بيبعت الحدث عبر `fetch()` للـ API route.

في `src/app/store/checkout/page.tsx` — استخدم الـ API route الموجود:

```typescript
// في checkout/page.tsx (Client Component) — عند تحميل الصفحة:
useEffect(() => {
  // بعت InitiateCheckout عبر الـ CAPI track API
  fetch('/api/storefront/capi/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'InitiateCheckout',
      data: {
        currency: store.settings.currency,
      },
      sourceUrl: window.location.href,
    }),
  }).catch(() => {})
}, [])
```

### 1.6 إضافة Lead Event في Abandoned Cart

في `src/app/api/storefront/abandoned-cart/route.ts` — أضف بعد حفظ السلة المتروكة:

```typescript
// أضف الاستيراد:
import { sendConversionEvent } from '@/lib/tracking/facebook-capi'
import { generateEventId } from '@/lib/tracking/event-deduplication'

// بعد حفظ السلة المتروكة بنجاح:
// === CAPI: Lead Event (fire-and-forget) ===
if (store.settings.facebookConversionApiEnabled &&
    store.settings.facebookPixelId &&
    store.settings.facebookConversionApiToken) {

  sendConversionEvent(
    {
      pixelId: store.settings.facebookPixelId,
      accessToken: store.settings.facebookConversionApiToken,
      testEventCode: store.settings.facebookTestEventCode,
    },
    'Lead' as any,  // Lead مش في الـ type الأصلي — هنعدل النوع
    {
      email: data.email,
      phone: data.phone,
      clientIpAddress: getClientIp(request),
      clientUserAgent: request.headers.get('user-agent') ?? undefined,
    },
    {
      currency: store.settings.currency,
      value: data.total,
    },
    request.headers.get('referer') ?? `https://${store.slug}.matjary.com`,
    generateEventId('lead'),
  ).catch(() => {})
}
```

**تعديل النوع CAPIEventName** في `facebook-capi.ts`:

```typescript
// أضف 'Lead' للنوع:
type CAPIEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Search'
  | 'Lead'  // ← جديد
```

### 1.7 إضافة Purchase CAPI في Kashier Webhook

في `src/app/api/payments/kashier/webhook/route.ts` — بعد تأكيد الدفع:

```typescript
// أضف الاستيراد:
import { sendConversionEvent } from '@/lib/tracking/facebook-capi'
import { generatePurchaseEventId } from '@/lib/tracking/event-deduplication'

// بعد تحديث حالة الدفع لـ 'paid':
// === CAPI: Purchase (fire-and-forget) ===
// لو الـ checkout route بعت Purchase event بالفعل، Facebook هيعمل dedup عبر orderNumber
if (store.settings.facebookConversionApiEnabled &&
    store.settings.facebookPixelId &&
    store.settings.facebookConversionApiToken) {

  sendConversionEvent(
    {
      pixelId: store.settings.facebookPixelId,
      accessToken: store.settings.facebookConversionApiToken,
      testEventCode: store.settings.facebookTestEventCode,
    },
    'Purchase',
    {
      email: order.customerEmail ?? undefined,
      phone: order.customerPhone,
    },
    {
      value: Number(order.total),
      currency: store.settings.currency,
      orderId: order.orderNumber,
      numItems: orderItems?.length,
      contentIds: orderItems?.map((i: any) => i.productId),
      contentType: 'product',
    },
    `https://${store.slug}.matjary.com`,
    generatePurchaseEventId(order.orderNumber),
  ).catch(() => {})
}
```

### 1.8 ملخص CAPI — الوضع بعد P4-B

| الحدث | Client Pixel | Server CAPI | Dedup eventId |
|-------|-------------|-------------|---------------|
| PageView | ✅ تلقائي (base code) | ❌ مش محتاج | — |
| ViewContent | ✅ `trackViewContent()` | ✅ product page (Server) | `viewcontent_{productId}_{nanoid}` |
| AddToCart | ✅ `trackAddToCart()` | ✅ `/api/storefront/capi/track` | `addtocart_{productId}_{nanoid}` |
| InitiateCheckout | ✅ `trackInitiateCheckout()` | ✅ checkout page (Server) | `checkout_{nanoid}` |
| Purchase | ✅ `trackPurchase()` | ✅ checkout API + Kashier webhook | `purchase_{orderNumber}` |
| Search | ✅ `trackSearch()` | ✅ `/api/storefront/capi/track` | — (مش حرج) |
| Lead | ❌ مش محتاج | ✅ abandoned-cart API | `lead_{nanoid}` |

---

## 2. نظام المراجعات — التوسع والأتمتة

### 2.1 جدول جديد: storeReviewRequests

أضف في `src/db/schema.ts`:

```typescript
// === P4-B: Review Requests ===
export const storeReviewRequests = pgTable('store_review_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => storeOrders.id, { onDelete: 'cascade' }).unique(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  customerName: text('customer_name'),
  status: text('status', { enum: ['pending', 'sent', 'completed', 'skipped'] }).default('pending').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  reviewToken: text('review_token').unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_review_requests_store').on(table.storeId),
  index('idx_review_requests_status').on(table.status),
  index('idx_review_requests_token').on(table.reviewToken),
])

// Relations
export const storeReviewRequestsRelations = relations(storeReviewRequests, ({ one }) => ({
  store: one(stores, {
    fields: [storeReviewRequests.storeId],
    references: [stores.id],
  }),
  order: one(storeOrders, {
    fields: [storeReviewRequests.orderId],
    references: [storeOrders.id],
  }),
}))
```

### 2.2 سير العمل التلقائي — Auto Review Request

#### الخطوة 1: إنشاء طلب تقييم عند التوصيل

في `src/app/api/dashboard/orders/[id]/status/route.ts` — أضف بعد section الـ emails (حوالي سطر 155):

```typescript
// === P4-B: Auto Review Request on Delivery ===
if (orderStatus === 'delivered' && existing[0].orderStatus !== 'delivered') {
  const reviewSettings = store.settings as Record<string, unknown> | null
  const autoReviewEnabled = reviewSettings?.autoReviewRequestEnabled !== false // default: true
  const reviewRequestDelay = Number(reviewSettings?.reviewRequestDelay ?? 2) // ساعات

  if (autoReviewEnabled && updatedOrder?.customerEmail) {
    // إنشاء طلب التقييم (بدون إرسال — سيُرسل بعد التأخير)
    import('@/lib/reviews/create-review-request').then(({ createReviewRequest }) =>
      createReviewRequest({
        storeId: store.id,
        orderId: updatedOrder.id,
        customerEmail: updatedOrder.customerEmail,
        customerPhone: updatedOrder.customerPhone,
        customerName: updatedOrder.customerName,
        delayHours: reviewRequestDelay,
        storeName: store.name,
        storeSlug: store.slug,
      }).catch((err) => console.error('[ReviewRequest] Error:', err))
    ).catch(() => {})
  }
}
```

#### الخطوة 2: ملف إنشاء طلب التقييم

```typescript
// src/lib/reviews/create-review-request.ts
import 'server-only'
import { db } from '@/db'
import { storeReviewRequests } from '@/db/schema'
import { nanoid } from 'nanoid'
import { sendEmail } from '@/lib/email/resend'

type CreateReviewRequestInput = {
  storeId: string
  orderId: string
  customerEmail: string | null
  customerPhone: string
  customerName: string
  delayHours: number
  storeName: string
  storeSlug: string
}

/**
 * ينشئ طلب تقييم ويجدول إرسال الإيميل.
 *
 * بما إن مفيش Cron jobs في المشروع (Vercel Serverless):
 * - ننشئ الطلب فوراً في DB بـ `status: 'pending'`
 * - نرسل الإيميل فوراً مع رسالة مناسبة
 * - التأخير (delayHours) ممكن يتنفذ لاحقاً عبر Vercel Cron أو edge function
 *
 * حالياً: الإرسال فوري (fire-and-forget) — أحسن من عدم الإرسال
 */
export async function createReviewRequest(input: CreateReviewRequestInput): Promise<void> {
  const reviewToken = nanoid(32)
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 يوم

  // إنشاء الطلب في DB
  await db.insert(storeReviewRequests).values({
    storeId: input.storeId,
    orderId: input.orderId,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerName: input.customerName,
    reviewToken,
    expiresAt,
    status: 'sent',
    sentAt: new Date(),
  }).onConflictDoNothing() // لو الطلب اتبعتله طلب تقييم قبل كده

  // إرسال الإيميل
  if (input.customerEmail) {
    const reviewUrl = `https://${input.storeSlug}.matjary.com/review/${reviewToken}`

    import('@/lib/email/templates/review-request').then(({ ReviewRequestEmail }) =>
      sendEmail({
        to: input.customerEmail!,
        subject: `⭐ قيّم تجربتك مع ${input.storeName}`,
        react: ReviewRequestEmail({
          storeName: input.storeName,
          customerName: input.customerName,
          reviewUrl,
        }),
      }).catch((err) => console.error('[ReviewRequest Email] Error:', err))
    ).catch(() => {})
  }
}
```

#### الخطوة 3: إيميل طلب التقييم

```typescript
// src/lib/email/templates/review-request.tsx
import * as React from 'react'

type ReviewRequestEmailProps = {
  storeName: string
  customerName: string
  reviewUrl: string
}

export function ReviewRequestEmail({ storeName, customerName, reviewUrl }: ReviewRequestEmailProps) {
  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma, Arial, sans-serif', lineHeight: 1.8, color: '#1a1a1a', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ padding: '32px 24px', backgroundColor: '#f7f7f7', borderRadius: '12px' }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>شكراً لتسوقك من {storeName}! ⭐</h1>
        <p style={{ fontSize: 15, color: '#4a4a4a' }}>
          مرحباً {customerName}،
        </p>
        <p style={{ fontSize: 15, color: '#4a4a4a' }}>
          يسعدنا أنك استلمت طلبك! نحب نسمع رأيك عن تجربتك معنا.
          تقييمك يساعد عملاء آخرين في اتخاذ قرار الشراء.
        </p>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a
            href={reviewUrl}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            ⭐ قيّم تجربتك
          </a>
        </div>
        <p style={{ fontSize: 13, color: '#888' }}>
          هذا الرابط صالح لمدة 14 يوم.
        </p>
      </div>
    </div>
  )
}
```

### 2.3 صفحة التقييم بالتوكن

```typescript
// src/app/store/review/[token]/page.tsx
import { db } from '@/db'
import { storeReviewRequests, storeOrders, storeOrderItems, stores } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { TokenReviewForm } from './_components/token-review-form'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'قيّم تجربتك' }
}

export default async function TokenReviewPage({ params }: Props) {
  const { token } = await params

  // التحقق من التوكن
  const reviewRequest = await db.query.storeReviewRequests.findFirst({
    where: eq(storeReviewRequests.reviewToken, token),
  })

  if (!reviewRequest) notFound()

  // تحقق من الصلاحية
  if (reviewRequest.expiresAt && new Date() > reviewRequest.expiresAt) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--ds-text)]">انتهت صلاحية الرابط</h1>
        <p className="mt-2 text-[var(--ds-text-muted)]">هذا الرابط لم يعد صالحاً. يمكنك تقييم المنتج من صفحته مباشرة.</p>
      </div>
    )
  }

  // لو التقييم اتعمل بالفعل
  if (reviewRequest.status === 'completed') {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--ds-text)]">شكراً لتقييمك! ⭐</h1>
        <p className="mt-2 text-[var(--ds-text-muted)]">لقد قمت بتقييم هذا الطلب بالفعل. شكراً لك!</p>
      </div>
    )
  }

  // جلب بيانات الطلب
  const order = await db.query.storeOrders.findFirst({
    where: eq(storeOrders.id, reviewRequest.orderId),
  })

  if (!order) notFound()

  // جلب عناصر الطلب
  const orderItems = await db.query.storeOrderItems.findMany({
    where: eq(storeOrderItems.orderId, order.id),
  })

  // جلب اسم المتجر
  const store = await db.query.stores.findFirst({
    where: eq(stores.id, reviewRequest.storeId),
    columns: { name: true, slug: true },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">قيّم تجربتك</h1>
        <p className="mt-2 text-[var(--ds-text-muted)]">
          شكراً لتسوقك من {store?.name}! نحب نسمع رأيك في المنتجات اللي اشتريتها.
        </p>
      </div>

      <TokenReviewForm
        token={token}
        orderId={order.id}
        storeId={reviewRequest.storeId}
        customerName={reviewRequest.customerName ?? order.customerName}
        items={orderItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          image: item.image,
          quantity: item.quantity,
        }))}
      />
    </div>
  )
}
```

### 2.4 نموذج التقييم بالتوكن (Client Component)

```typescript
// src/app/store/review/[token]/_components/token-review-form.tsx
'use client'

import { useState } from 'react'
import { Star, Camera, Loader2, CheckCircle } from 'lucide-react'

type OrderItem = {
  id: string
  productId: string
  name: string
  image: string | null
  quantity: number
}

type ItemReview = {
  productId: string
  rating: number
  comment: string
}

type TokenReviewFormProps = {
  token: string
  orderId: string
  storeId: string
  customerName: string
  items: OrderItem[]
}

export function TokenReviewForm({ token, orderId, storeId, customerName, items }: TokenReviewFormProps) {
  const [reviews, setReviews] = useState<Record<string, ItemReview>>(
    Object.fromEntries(items.map((item) => [item.productId, { productId: item.productId, rating: 5, comment: '' }]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const updateReview = (productId: string, field: keyof ItemReview, value: string | number) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId]!, [field]: value },
    }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/storefront/reviews/submit-by-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reviews: Object.values(reviews),
        }),
      })

      const json = await res.json()
      if (json.success) {
        setSubmitted(true)
      } else {
        setError(json.error || 'حدث خطأ')
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="surface-panel-elevated rounded-2xl p-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-xl font-bold text-[var(--ds-text)]">شكراً لتقييمك! ⭐</h2>
        <p className="mt-2 text-[var(--ds-text-muted)]">رأيك مهم لنا ولعملائنا.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.productId} className="surface-panel-elevated rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            {item.image && (
              <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
            )}
            <div>
              <h3 className="font-semibold text-[var(--ds-text)]">{item.name}</h3>
              <p className="text-xs text-[var(--ds-text-soft)]">الكمية: {item.quantity}</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">التقييم</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateReview(item.productId, 'rating', star)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (reviews[item.productId]?.rating ?? 5)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200 hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">التعليق (اختياري)</label>
            <textarea
              value={reviews[item.productId]?.comment ?? ''}
              onChange={(e) => updateReview(item.productId, 'comment', e.target.value)}
              className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={3}
              placeholder="شاركنا تجربتك مع هذا المنتج..."
              maxLength={1000}
            />
          </div>
        </div>
      ))}

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary, #000)' }}
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Star className="h-5 w-5" />}
        {submitting ? 'جاري الإرسال...' : 'إرسال التقييمات'}
      </button>
    </div>
  )
}
```

### 2.5 API Route — إرسال تقييم بالتوكن

```typescript
// src/app/api/storefront/reviews/submit-by-token/route.ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response'
import { db } from '@/db'
import { storeReviewRequests, storeReviews, storeOrders, storeOrderItems, storeLoyaltyPoints, stores } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize-html'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const submitByTokenSchema = z.object({
  token: z.string().min(10).max(100),
  reviews: z.array(z.object({
    productId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  })).min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`review-token:${ip}`, { maxRequests: 5, windowSeconds: 300 })
    if (!allowed) return apiError('حاول مرة أخرى بعد قليل', 429)

    const body = await request.json()
    const data = submitByTokenSchema.parse(body)

    // التحقق من التوكن
    const reviewRequest = await db.query.storeReviewRequests.findFirst({
      where: eq(storeReviewRequests.reviewToken, data.token),
    })

    if (!reviewRequest) return apiError('رابط التقييم غير صالح', 404)
    if (reviewRequest.status === 'completed') return apiError('تم تقييم هذا الطلب بالفعل', 400)
    if (reviewRequest.expiresAt && new Date() > reviewRequest.expiresAt) {
      return apiError('انتهت صلاحية رابط التقييم', 400)
    }

    // جلب الطلب
    const order = await db.query.storeOrders.findFirst({
      where: eq(storeOrders.id, reviewRequest.orderId),
    })

    if (!order) return apiError('الطلب غير موجود', 404)

    const storeSettings = await db.query.stores.findFirst({
      where: eq(stores.id, reviewRequest.storeId),
      columns: { settings: true },
    })

    const autoApprove = (storeSettings?.settings as any)?.reviewAutoApprove ?? false

    // التحقق من أن المنتجات المُقيّمة تنتمي فعلاً للطلب
    const orderItems = await db.query.storeOrderItems.findMany({
      where: eq(storeOrderItems.orderId, order.id),
      columns: { productId: true },
    })
    const validProductIds = new Set(orderItems.map((i) => i.productId))
    const invalidProducts = data.reviews.filter((r) => !validProductIds.has(r.productId))
    if (invalidProducts.length > 0) {
      return apiError('بعض المنتجات لا تنتمي لهذا الطلب', 400)
    }

    // إنشاء المراجعات
    const createdReviews = []
    for (const review of data.reviews) {
      const [created] = await db.insert(storeReviews).values({
        storeId: reviewRequest.storeId,
        productId: review.productId,
        orderId: reviewRequest.orderId,
        customerName: sanitizeText(reviewRequest.customerName ?? order.customerName),
        customerPhone: reviewRequest.customerPhone ?? order.customerPhone,
        rating: review.rating,
        comment: review.comment ? sanitizeText(review.comment) : null,
        isVerifiedPurchase: true, // ✅ من رابط التقييم = مؤكد
        isApproved: autoApprove,
      }).returning()
      createdReviews.push(created)
    }

    // تحديث حالة طلب التقييم
    await db.update(storeReviewRequests)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(storeReviewRequests.id, reviewRequest.id))

    // === إضافة نقاط ولاء (اختياري) ===
    const loyaltyPoints = Number((storeSettings?.settings as any)?.reviewLoyaltyPoints ?? 0)
    const loyaltyEnabled = Boolean((storeSettings?.settings as any)?.loyaltyEnabled)

    if (loyaltyEnabled && loyaltyPoints > 0 && reviewRequest.customerPhone) {
      db.insert(storeLoyaltyPoints).values({
        storeId: reviewRequest.storeId,
        customerPhone: reviewRequest.customerPhone,
        points: loyaltyPoints,
        type: 'earned',
        notes: `كسب ${loyaltyPoints} نقطة مقابل تقييم طلب #${order.orderNumber}`,
      }).catch(() => {})
    }

    return apiSuccess({
      count: createdReviews.length,
      message: autoApprove ? 'تم نشر تقييماتك بنجاح! شكراً لك ⭐' : 'تم إرسال تقييماتك وستُنشر بعد المراجعة. شكراً لك ⭐',
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 2.6 النجوم في Product Card

عدّل `src/app/store/_components/product-card.tsx` — أضف عرض النجوم تحت السعر:

```typescript
// في Props اللي بيستقبلها ProductCard:
// أضف:
avgRating?: number | null
totalReviews?: number | null

// في JSX — بعد السعر وقبل زر "أضف للسلة":
{avgRating != null && totalReviews != null && totalReviews > 0 && (
  <div className="flex items-center gap-1.5 text-xs">
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
    <span className="text-[var(--ds-text-soft)]">({totalReviews})</span>
  </div>
)}
```

**ملاحظة**: تحتاج تجيب `avgRating` و `totalReviews` من DB query اللي بتجيب المنتجات. ممكن تعمل subquery أو LEFT JOIN مع storeReviews. الأسهل هو عمل function مساعدة:

```typescript
// src/lib/queries/product-ratings.ts
import 'server-only'
import { db } from '@/db'
import { storeReviews } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

/**
 * جلب ملخص التقييم لمنتج أو أكتر
 */
export async function getProductRatings(storeId: string, productIds: string[]): Promise<Map<string, { avgRating: number; totalReviews: number }>> {
  if (productIds.length === 0) return new Map()

  const results = await db
    .select({
      productId: storeReviews.productId,
      avgRating: sql<number>`ROUND(AVG(${storeReviews.rating}), 1)`,
      totalReviews: sql<number>`COUNT(*)`,
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

  const map = new Map<string, { avgRating: number; totalReviews: number }>()
  for (const row of results) {
    map.set(row.productId, {
      avgRating: Number(row.avgRating),
      totalReviews: Number(row.totalReviews),
    })
  }
  return map
}
```

### 2.7 فلترة المراجعات حسب عدد النجوم

في `src/app/store/product/[slug]/_components/product-reviews.tsx` — أضف state وزرائر فلترة:

```typescript
// أضف في الـ state:
const [filterRating, setFilterRating] = useState<number | null>(null)

// أضف في الـ fetchReviews:
// عدّل الـ URL ليشمل filter:
const filterParam = filterRating ? `&rating=${filterRating}` : ''
const res = await fetch(`/api/storefront/reviews?productId=${productId}${filterParam}`)

// أضف زرائر الفلترة بعد الـ Summary وقبل الـ Reviews list:
{summary && summary.totalCount > 0 && (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => { setFilterRating(null); fetchReviews() }}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        filterRating === null
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)]'
      }`}
    >
      الكل ({summary.totalCount})
    </button>
    {[5, 4, 3, 2, 1].map((r) => (
      summary.ratingDistribution[r] > 0 && (
        <button
          key={r}
          onClick={() => { setFilterRating(r); fetchReviews() }}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            filterRating === r
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)]'
          }`}
        >
          {r} <Star className="h-3 w-3 fill-current" /> ({summary.ratingDistribution[r]})
        </button>
      )
    ))}
  </div>
)}
```

في `src/app/api/storefront/reviews/route.ts` — أضف دعم الفلترة:

```typescript
// في GET handler — بعد استخراج productId و page:
const ratingFilter = request.nextUrl.searchParams.get('rating')

// في where clause — أضف:
...(ratingFilter ? [eq(storeReviews.rating, Number(ratingFilter))] : []),
```

### 2.8 رفع صور التقييم

> **ملاحظة**: رفع الصور يعتمد على نظام رفع الصور الموجود في المشروع (Supabase Storage أو أي CDN).
> الخطوات هنا تتضمن الـ API endpoint والربط — الأسبلود نفسه يستخدم نفس نمط رفع صور المنتجات الموجود.

في نموذج التقييم `product-reviews.tsx` — أضف دعم الصور:

```typescript
// أضف state:
const [images, setImages] = useState<File[]>([])

// أضف input في الفورم:
<div>
  <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">صور (اختياري)</label>
  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--ds-border)] p-3 transition-colors hover:bg-[var(--ds-hover)]">
    <Camera className="h-5 w-5 text-[var(--ds-text-soft)]" />
    <span className="text-sm text-[var(--ds-text-soft)]">
      {images.length > 0 ? `${images.length} صورة` : 'أضف صور (حتى 3)'}
    </span>
    <input
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []).slice(0, 3)
        setImages(files)
      }}
    />
  </label>
  {images.length > 0 && (
    <div className="mt-2 flex gap-2">
      {images.map((file, i) => (
        <div key={i} className="relative h-16 w-16">
          <img src={URL.createObjectURL(file)} alt="" className="h-full w-full rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

### 2.9 إعدادات المراجعات في الداشبورد

أضف في صفحة إعدادات المتجر `/api/dashboard/settings/` دعم للحقول الجديدة:

```typescript
// في src/lib/validations/store.ts — أضف في updateStoreSettingsSchema:
// P4-B: Auto Review Request
autoReviewRequestEnabled: z.boolean().optional(),
reviewRequestDelay: z.number().int().min(1).max(72).optional(),
reviewRequestChannel: z.enum(['email', 'whatsapp', 'both']).optional(),
reviewLoyaltyPoints: z.number().int().min(0).max(100).optional(),
```

---

## 3. صفحة تتبع الطلب — تحسينات

### 3.1 الحالة الحالية

صفحة تتبع الطلب **متنفذة بالكامل**:
- ✅ `store/track/page.tsx` — Server Component
- ✅ `store/track/_components/track-order.tsx` — Form + Timeline + Items
- ✅ `api/storefront/track/route.ts` — Rate limit + Phone verification + Timeline builder
- ✅ إيميلات الشحن والتوصيل في order status route

### 3.2 تحسين: تعبئة تلقائية من URL

في `track-order.tsx` — أضف دعم query params:

```typescript
// أضف في الأعلى:
import { useSearchParams } from 'next/navigation'

// في الـ component:
const searchParams = useSearchParams()

// عدّل useState:
const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '')

// أضف useEffect لتتبع تلقائي:
useEffect(() => {
  const orderParam = searchParams.get('order')
  if (orderParam) {
    setOrderNumber(orderParam)
  }
}, [searchParams])
```

### 3.3 تحسين: روابط شركات الشحن

أضف ملف مساعد لروابط التتبع:

```typescript
// src/lib/shipping/tracking-urls.ts

/**
 * روابط تتبع الشحنات لشركات الشحن المشهورة في مصر والمنطقة العربية
 */
const SHIPPING_TRACKING_URLS: Record<string, (trackingNumber: string) => string> = {
  // مصر
  'بوسطا': (tn) => `https://bosta.co/tracking-shipment/?tracking_key=${tn}`,
  'bosta': (tn) => `https://bosta.co/tracking-shipment/?tracking_key=${tn}`,
  'شيب بوكس': (tn) => `https://www.shipblu.com/en/tracking/?tracking_no=${tn}`,
  'shipblu': (tn) => `https://www.shipblu.com/en/tracking/?tracking_no=${tn}`,
  'mylerz': (tn) => `https://track.mylerz.com/shipment/tracking?trackingNumbers=${tn}`,
  'ارامكس': (tn) => `https://www.aramex.com/track/results?ShipmentNumber=${tn}`,
  'aramex': (tn) => `https://www.aramex.com/track/results?ShipmentNumber=${tn}`,
  'dhl': (tn) => `https://www.dhl.com/eg-ar/home/tracking.html?tracking-id=${tn}`,
  'fedex': (tn) => `https://www.fedex.com/fedextrack/?trknbr=${tn}`,
  'j&t': (tn) => `https://www.jtexpress.eg/trajectoryQuery?billcodes=${tn}`,
  // السعودية
  'سمسا': (tn) => `https://www.smsaexpress.com/ar/trackingdetails?tracknumbers=${tn}`,
  'smsa': (tn) => `https://www.smsaexpress.com/ar/trackingdetails?tracknumbers=${tn}`,
  'ناقل': (tn) => `https://www.naqelexpress.com/en/tracking?waybill=${tn}`,
  'naqel': (tn) => `https://www.naqelexpress.com/en/tracking?waybill=${tn}`,
  'سبل': (tn) => `https://splonline.com.sa/ar/mtrack/?tracknumbers=${tn}`,
  'spl': (tn) => `https://splonline.com.sa/ar/mtrack/?tracknumbers=${tn}`,
  'زاجل': (tn) => `https://www.zajil.com/en/tracking?tracking_number=${tn}`,
  'zajil': (tn) => `https://www.zajil.com/en/tracking?tracking_number=${tn}`,
}

export function getTrackingUrl(shippingCompany: string, trackingNumber: string): string | null {
  const key = shippingCompany.trim().toLowerCase()
  const urlFn = SHIPPING_TRACKING_URLS[key]
  return urlFn ? urlFn(trackingNumber) : null
}

export function getKnownShippingCompanies(): string[] {
  return [...new Set(Object.keys(SHIPPING_TRACKING_URLS))]
}
```

في `track-order.tsx` — عدّل قسم عرض رقم التتبع:

```typescript
// أضف استيراد:
import { getTrackingUrl } from '@/lib/shipping/tracking-urls'

// عدّل عرض Tracking number — بعد عرض شركة الشحن:
{result.trackingNumber && result.shippingCompany && (() => {
  const url = getTrackingUrl(result.shippingCompany, result.trackingNumber!)
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--color-primary, #000)' }}
    >
      تتبع الشحنة ↗
    </a>
  ) : null
})()}
```

### 3.4 تحسين: رابط التتبع في إيميل الشحن

في `src/lib/email/templates/order-shipped.tsx` — أضف رابط التتبع:

```typescript
// أضف prop جديد:
type OrderShippedEmailProps = {
  storeName: string
  orderNumber: string
  customerName: string
  trackingNumber: string | null
  shippingCompany: string | null
  storeSlug?: string  // ← جديد
}

// في body الإيميل — أضف بعد عرض trackingNumber:
{storeSlug && (
  <p style={{ margin: '16px 0' }}>
    <a
      href={`https://${storeSlug}.matjary.com/track?order=${orderNumber}`}
      style={{
        backgroundColor: '#000',
        color: '#fff',
        padding: '10px 24px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 'bold',
      }}
    >
      تتبع طلبك
    </a>
  </p>
)}
```

---

## 4. التكامل مع الأنظمة الموجودة

### 4.1 تعديلات Schema (src/db/schema.ts)

```typescript
// 1. أضف حقول P4-B في StoreSettings type:
// بعد حقول P4-A (customerAccountsEnabled, wishlistEnabled, إلخ):

  // === P4-B: Auto Review Request ===
  autoReviewRequestEnabled: boolean
  reviewRequestDelay: number
  reviewRequestChannel: 'email' | 'whatsapp' | 'both'
  reviewLoyaltyPoints: number

// 2. أضف في default StoreSettings:
// بعد skipCartEnabled:

  // P4-B: Auto Review Request
  autoReviewRequestEnabled: true,
  reviewRequestDelay: 2,
  reviewRequestChannel: 'email',
  reviewLoyaltyPoints: 5,

// 3. أضف جدول storeReviewRequests (من القسم 2.1 فوق)
// 4. أضف storeReviewRequestsRelations
// 5. حدّث storesRelations بإضافة:
  reviewRequests: many(storeReviewRequests),
```

### 4.2 تعديلات Validations (src/lib/validations/store.ts)

```typescript
// أضف في updateStoreSettingsSchema:
// بعد حقول P4-A:

  // P4-B: Auto Review Request
  autoReviewRequestEnabled: z.boolean().optional(),
  reviewRequestDelay: z.number().int().min(1).max(72).optional(),
  reviewRequestChannel: z.enum(['email', 'whatsapp', 'both']).optional(),
  reviewLoyaltyPoints: z.number().int().min(0).max(100).optional(),
```

### 4.3 تعديل facebook-capi.ts

```typescript
// تغييران فقط:

// 1. تحديث الإصدار (سطر 13):
const GRAPH_API_VERSION = 'v25.0'

// 2. إضافة 'Lead' للنوع:
type CAPIEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Search'
  | 'Lead'
```

### 4.4 ملخص التعديلات على الملفات الموجودة

| الملف | التعديل |
|-------|--------|
| `src/db/schema.ts` | إضافة StoreSettings P4-B + جدول storeReviewRequests + relations |
| `src/lib/validations/store.ts` | إضافة حقول P4-B في updateStoreSettingsSchema |
| `src/lib/tracking/facebook-capi.ts` | تحديث version v25.0 + إضافة 'Lead' type |
| `src/app/store/product/[slug]/page.tsx` | إضافة ViewContent CAPI server-side |
| `src/app/store/checkout/page.tsx` | إضافة InitiateCheckout CAPI server-side |
| `src/app/api/storefront/abandoned-cart/route.ts` | إضافة Lead CAPI event |
| `src/app/api/payments/kashier/webhook/route.ts` | إضافة Purchase CAPI event |
| `src/app/api/dashboard/orders/[id]/status/route.ts` | إضافة auto review request on delivery |
| `src/app/store/_components/product-card.tsx` | إضافة النجوم |
| `src/app/store/product/[slug]/_components/product-reviews.tsx` | إضافة فلترة بالنجوم + صور |
| `src/app/api/storefront/reviews/route.ts` | إضافة دعم فلترة بالنجوم |
| `src/app/store/track/_components/track-order.tsx` | تعبئة تلقائية + رابط تتبع الشحنة |
| `src/lib/email/templates/order-shipped.tsx` | إضافة رابط التتبع |

### 4.5 ملخص الملفات الجديدة

| الملف | الوصف |
|-------|-------|
| `src/lib/tracking/hash-user-data.ts` | SHA-256 hashing + phone formatting لـ CAPI |
| `src/lib/tracking/event-deduplication.ts` | توليد event_id لـ Client-Server dedup |
| `src/lib/reviews/create-review-request.ts` | إنشاء طلب تقييم + إرسال إيميل |
| `src/lib/email/templates/review-request.tsx` | إيميل طلب التقييم |
| `src/app/store/review/[token]/page.tsx` | صفحة التقييم بالتوكن (Server) |
| `src/app/store/review/[token]/_components/token-review-form.tsx` | نموذج التقييم (Client) |
| `src/app/api/storefront/reviews/submit-by-token/route.ts` | API إرسال تقييم بتوكن |
| `src/lib/queries/product-ratings.ts` | query ملخص التقييمات لـ Product Cards |
| `src/lib/shipping/tracking-urls.ts` | روابط تتبع شركات الشحن |

---

## 5. ملف Migration

```sql
-- migrations/p4b_review_requests.sql
-- P4-B: Review Requests Table

-- جدول طلبات التقييم التلقائية
CREATE TABLE IF NOT EXISTS store_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  review_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT store_review_requests_order_unique UNIQUE(order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_requests_store ON store_review_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON store_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON store_review_requests(review_token);

-- Enable RLS
ALTER TABLE store_review_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Merchants can manage their store's review requests
CREATE POLICY "Merchants manage review requests"
  ON store_review_requests
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Service role policy for API operations
CREATE POLICY "Service role full access review requests"
  ON store_review_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## 6. خطة الاختبار

### Facebook CAPI

#### اختبار 1: تحديث إصدار Graph API
```
1. تحقق إن `GRAPH_API_VERSION` = 'v25.0' في facebook-capi.ts
```

#### اختبار 2: ViewContent Server-side Event
```
1. اعمل متجر تجريبي مع Facebook Pixel ID + CAPI Token + testEventCode
2. ادخل صفحة منتج
3. تحقق في Facebook Events Manager:
   - ViewContent event موجود
   - event_source = 'website'
   - لو server + browser events متطابقة → Facebook يعرضهم كـ "Deduplicated"
```

#### اختبار 3: InitiateCheckout Server-side Event
```
1. ادخل صفحة Checkout
2. تحقق في Events Manager → InitiateCheckout event
```

#### اختبار 4: Lead Event
```
1. أضف منتج للسلة
2. أدخل بيانات (اسم + تلفون + إيميل) ثم اغلق الصفحة (abandoned cart)
3. تحقق في Events Manager → Lead event مع بيانات المستخدم (hashed)
```

#### اختبار 5: Purchase في Kashier Webhook
```
1. اعمل طلب بدفع Kashier
2. بعد تأكيد الدفع → تحقق من Purchase event في Events Manager
3. تأكد إن الـ event_id = 'purchase_{orderNumber}' (dedup)
```

#### اختبار 6: Event Deduplication
```
1. اعمل طلب شراء
2. تحقق إن:
   - Browser Pixel بعت Purchase
   - Server CAPI بعت Purchase
   - Facebook بيعرضهم كحدث واحد (Deduplicated)
```

### نظام المراجعات

#### اختبار 7: إنشاء طلب تقييم تلقائي
```
1. اعمل طلب → غيّر حالته لـ "delivered"
2. تحقق في DB: سجل جديد في store_review_requests:
   - status = 'sent'
   - review_token ≠ null
   - expires_at = الآن + 14 يوم
3. تحقق إن الإيميل اتبعت (Resend dashboard)
```

#### اختبار 8: صفحة التقييم بالتوكن
```
1. افتح /review/{token} ← من الإيميل
2. تحقق:
   - المنتجات ظاهرة مع صورها وأسمائها
   - ممكن تقيّم كل منتج (نجوم + تعليق)
   - بعد الإرسال → رسالة نجاح
3. أعد فتح نفس الرابط → "تم تقييم هذا الطلب بالفعل"
4. انتظر 14 يوم (أو عدّل expires_at في DB) → "انتهت صلاحية الرابط"
```

#### اختبار 9: المراجعة من التوكن = Verified Purchase
```
1. بعد التقييم بالتوكن → تحقق في DB:
   - is_verified_purchase = true
   - شارة "مشتري مؤكد ✅" ظاهرة في واجهة المتجر
```

#### اختبار 10: نقاط الولاء مقابل التقييم
```
1. فعّل loyaltyEnabled + reviewLoyaltyPoints = 10
2. قيّم عبر توكن
3. تحقق إن 10 نقاط ولاء اتضافت للعميل
```

#### اختبار 11: النجوم في Product Card
```
1. أضف مراجعات لمنتج (بعضها approved)
2. تحقق إن ★★★★☆ (4.2) ظاهرة تحت السعر في product-card
3. منتج بدون مراجعات → لا يظهر شيء
```

#### اختبار 12: فلترة المراجعات
```
1. أضف مراجعات بتقييمات مختلفة (1-5)
2. في صفحة المنتج → اضغط على فلتر "5 ★"
3. تحقق إن بس المراجعات بـ 5 نجوم ظاهرة
4. اضغط "الكل" → ترجع كل المراجعات
```

### تتبع الطلب

#### اختبار 13: تعبئة تلقائية من URL
```
1. ادخل /track?order=ORD-001
2. تحقق إن حقل "رقم الطلب" متعبّي تلقائياً بـ "ORD-001"
```

#### اختبار 14: رابط تتبع شركة الشحن
```
1. اعمل طلب مع shippingCompany = "بوسطا" + trackingNumber = "BST-123"
2. ابحث عن الطلب في صفحة التتبع
3. تحقق إن زر "تتبع الشحنة ↗" ظاهر ويوّدي لـ https://bosta.co/tracking-shipment/?tracking_key=BST-123
```

#### اختبار 15: رابط التتبع في إيميل الشحن
```
1. غيّر حالة الطلب لـ "shipped"
2. تحقق من الإيميل:
   - رابط "تتبع طلبك" موجود
   - يوّدي لـ https://store.matjary.com/track?order=ORD-001
```

---

## 7. الـ Prompt

### ملخص التنفيذ

```
P4-B = 3 مميزات:

1. Facebook CAPI — تكملة:
   - hash-user-data.ts (utility)
   - event-deduplication.ts (nanoid-based event_id)
   - ViewContent CAPI في product page
   - InitiateCheckout CAPI في checkout page
   - Lead CAPI في abandoned-cart
   - Purchase CAPI في Kashier webhook
   - تحديث Graph API v25.0
   - إضافة 'Lead' لـ CAPIEventName

2. المراجعات — توسع:
   - جدول storeReviewRequests
   - صفحة /store/review/[token]/ (token-based review)
   - API /api/storefront/reviews/submit-by-token
   - auto review request عند التوصيل
   - إيميل طلب التقييم
   - نقاط ولاء مقابل التقييم
   - النجوم في Product Card + query helper
   - فلترة المراجعات بالنجوم
   - إعدادات: autoReviewRequestEnabled, reviewRequestDelay, reviewRequestChannel, reviewLoyaltyPoints

3. تتبع الطلب — تحسينات:
   - تعبئة تلقائية من ?order= query param
   - روابط شركات الشحن (tracking-urls.ts)
   - رابط التتبع في إيميل الشحن

SQL Migration: migrations/p4b_review_requests.sql (جدول واحد فقط)
ملفات جديدة: 9 ملفات
ملفات معدّلة: 13 ملف
```

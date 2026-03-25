# خطة تنفيذ — دفع اشتراك الخطة (Subscription Payment Gate)

> **التاريخ**: 3 مارس 2026  
> **الحالة**: مسودة — في انتظار المراجعة

---

## الفكرة باختصار

```
┌───────────────────────────────────────────────────────────────┐
│                         التاجر الجديد                          │
│                                                               │
│  1. يسجل دخول → Onboarding → يختار خطة → يُنشئ المتجر       │
│  2. يروح Dashboard عادي → يضيف منتجات، كوبونات، إلخ          │
│  3. لما حد يزور الموقع (Storefront):                         │
│     ├─ خطة مجانية أو مدفوع + is_paid=true → يظهر الموقع 🟢  │
│     └─ خطة مدفوعة + is_paid=false → صفحة "ادفع الأول" 🔴     │
│        └─ زر "ادفع الآن" → Kashier → Webhook → is_paid=true  │
│           └─ صفحة نجاح → زر "روح لموقعك"                     │
└───────────────────────────────────────────────────────────────┘
```

---

## التفاصيل التقنية

### 1. تعديل قاعدة البيانات — إضافة `is_paid` على stores

**الملف**: `src/db/schema.ts`

```typescript
// في جدول stores — نضيف بعد plan:
isPaid: boolean('is_paid').default(false).notNull(),
subscriptionAmount: decimal('subscription_amount', { precision: 10, scale: 2 }),  // المبلغ المتوقع وقت إنشاء الجلسة
subscriptionPaidAt: timestamp('subscription_paid_at', { withTimezone: true }),      // امتى دفع بالظبط
subscriptionTransactionId: text('subscription_transaction_id'),                    // Kashier transaction ID
```

**Migration SQL:**
```sql
ALTER TABLE stores ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN subscription_amount DECIMAL(10,2);
ALTER TABLE stores ADD COLUMN subscription_paid_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN subscription_transaction_id TEXT;

-- المتاجر الموجودة على خطة free تكون مدفوعة تلقائياً (مش محتاجة دفع)
UPDATE stores SET is_paid = true WHERE plan = 'free';
```

**الحقول الجديدة:**
| الحقل | الغرض |
|-------|-------|
| `is_paid` | هل المتجر مفعّل (دفع أو مجاني) |
| `subscription_amount` | المبلغ المحفوظ وقت إنشاء جلسة الدفع — للتحقق في الـ webhook |
| `subscription_paid_at` | تاريخ الدفع — للسجلات والنزاعات |
| `subscription_transaction_id` | معرف Kashier — مطلوب للاسترداد أو النزاعات |

**ملاحظة**: الخطة المجانية `is_paid = true` من البداية — لأن مش محتاج يدفع حاجة.

---

### 2. تعديل إنشاء المتجر — `POST /api/stores`

**الملف**: `src/app/api/stores/route.ts`

عند إنشاء المتجر، نحدد `is_paid` بناءً على الخطة:

```typescript
// بعد ما نعرف resolvedPlan:
const selectedPlan = planId
  ? await db.select({ priceMonthly: platformPlans.priceMonthly }).from(platformPlans).where(eq(platformPlans.id, planId)).limit(1)
  : null

const isFree = !selectedPlan?.[0] || parseFloat(selectedPlan[0].priceMonthly) === 0

const newStore = await db.insert(stores).values({
  merchantId: merchantRow.id,
  name, slug,
  contactEmail: merchantRow.email,
  plan: resolvedPlan,
  isPaid: isFree,   // ← free = true، مدفوع = false
})
```

---

### 3. تعديل `resolveStore()` — إرجاع `isPaid`

**الملف**: `src/lib/tenant/resolve-store.ts`

```typescript
// نضيف isPaid في الـ select + في ResolvedStore type
export type ResolvedStore = {
  // ... الحقول الموجودة
  isPaid: boolean       // ← جديد
}
```

---

### 4. تعديل Storefront Layout — بوابة الدفع

**الملف**: `src/app/store/layout.tsx`

هنا البوابة الأساسية. بعد ما نتأكد المتجر موجود ونشط:

```typescript
// بعد التحقق من isActive:
if (!store.isPaid) {
  // خطة مدفوعة + لم يدفع بعد → صفحة "ادفع الأول"
  return <StorePaymentGate store={store} />
}

// باقي الكود عادي...
```

**المنطق:**
- `isPaid = true` → يظهر الموقع طبيعي ✅
- `isPaid = false` → يظهر صفحة `StorePaymentGate` بدل الموقع 🔴

**مهم: Dashboard لا يتأثر أبداً** — البوابة فقط في `store/layout.tsx` (الـ Storefront)

---

### 5. إنشاء صفحة بوابة الدفع — `StorePaymentGate`

**ملف جديد**: `src/app/store/_components/store-payment-gate.tsx`

**النوع**: `'use client'` — لأن فيه `onClick` يستدعي API + `useState` للـ loading

**الوصف**: صفحة كاملة تُعرض بدل الموقع لما التاجر ما دفعش

**Props** (يمررها الـ Layout كـ Server Component):
```typescript
type StorePaymentGateProps = {
  storeId: string
  storeName: string
  storeSlug: string
  planName: string        // ← من platform_plans — يمرره الـ layout
  planPrice: string       // ← من platform_plans.price_monthly — يمرره الـ layout
}
```

**⚠️ مهم**: الـ `store` object من `resolveStore()` مش فيه اسم الخطة أو سعرها.
لازم الـ Layout (Server Component) يجلب بيانات الخطة من `platform_plans` ويمررها كـ props:

```typescript
// في store/layout.tsx (Server Component):
if (!store.isPaid) {
  const plan = await db.select({ name: platformPlans.name, priceMonthly: platformPlans.priceMonthly })
    .from(platformPlans).where(eq(platformPlans.id, store.plan)).limit(1)

  return <StorePaymentGate
    storeId={store.id}
    storeName={store.name}
    storeSlug={store.slug}
    planName={plan[0]?.name ?? 'مدفوعة'}
    planPrice={plan[0]?.priceMonthly ?? '0'}
  />
}
```

**المحتوى:**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│        🔒 متجرك جاهز لكنه بانتظار التفعيل       │
│                                                  │
│   أنت اخترت خطة [اسم الخطة]                     │
│   سعر الخطة: [السعر] ج.م / شهر                  │
│                                                  │
│         [ ادفع الآن وفعّل متجرك ]                │
│                                                  │
│   💡 يمكنك إضافة منتجات وتجهيز متجرك من         │
│      لوحة التحكم قبل الدفع                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

**الزر "ادفع الآن":**
- يستدعي `POST /api/payments/subscription/create` ← يُنشئ جلسة Kashier
- يحوّل التاجر لصفحة الدفع على Kashier:
  `window.location.href = response.data.paymentUrl`
- الـ API call يشتغل من أي domain (subdomain أو root) — مش مشكلة
- الـ redirect بعدها لـ Kashier مباشرة

---

### 6. إنشاء API لجلسة دفع الاشتراك

**ملف جديد**: `src/app/api/payments/subscription/create/route.ts`

**الوصف**: ينشئ جلسة Kashier لدفع اشتراك الخطة (مش للطلبات — ده للاشتراك)

**Zod Validation** (ملف جديد: `src/lib/validations/subscription.ts`):
```typescript
import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  storeId: z.uuidv4({ error: 'معرف المتجر غير صالح' }),
})
```

```
POST /api/payments/subscription/create
Body: { storeId: string }  ← Zod validated بـ createSubscriptionSchema
Auth: يحتاج Clerk auth (التاجر صاحب المتجر)
Rate Limit: 10 طلبات / ساعة لكل IP (منع spam إنشاء جلسات)

المنطق:
1. Rate limit check عبر rateLimit()
2. Zod validation على body
3. تحقق من المصادقة عبر getAuthenticatedMerchant()
4. اجلب المتجر + تأكد إن store.merchantId === merchant.id (تحقق ملكية)
5. تأكد إن is_paid = false (لسه ما دفعش)
6. اجلب سعر الخطة من platform_plans عبر store.plan
7. خزّن المبلغ المتوقع في subscriptionAmount على المتجر (حماية ضد تغيير السعر)
8. أنشئ جلسة Kashier بالمبلغ
9. ارجع { paymentUrl } للـ redirect

Response: { success: true, data: { paymentUrl: string } }
Errors:
  401 — UNAUTHORIZED
  403 — FORBIDDEN  
  404 — STORE_NOT_FOUND
  409 — ALREADY_PAID
  422 — VALIDATION_ERROR
  429 — RATE_LIMITED
  500 — INTERNAL_ERROR
```

**الكود الكامل المتوقع (يستخدم auth helpers الموجودة):**
```typescript
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores, platformPlans } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'
import { createSubscriptionSchema } from '@/lib/validations/subscription'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = getClientIp(request)
    const rl = rateLimit(`sub:create:${ip}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) return apiError('تم تجاوز الحد الأقصى للطلبات', 429, 'RATE_LIMITED')

    // 2. Zod validation
    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    // 3. Auth — باستخدام getAuthenticatedMerchant() الموجودة
    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    // 4. جلب المتجر + تحقق ملكية
    const storeRow = await db.select().from(stores)
      .where(eq(stores.id, parsed.data.storeId)).limit(1)
    if (!storeRow[0]) return ApiErrors.storeNotFound()

    if (storeRow[0].merchantId !== merchant.id) {
      return apiError('ليس لديك صلاحية على هذا المتجر', 403, 'FORBIDDEN')
    }

    // 5. تأكد مش مدفوع بالفعل
    if (storeRow[0].isPaid) {
      return apiError('المتجر مُفعّل بالفعل', 409, 'ALREADY_PAID')
    }

    // 6-9. جلب الخطة + تخزين المبلغ + إنشاء جلسة Kashier...
    // ...

    return apiSuccess({ paymentUrl }, 200)
  } catch (error) {
    console.error('POST /api/payments/subscription/create error:', error)
    return ApiErrors.internal()
  }
}
```

**الفرق عن جلسة دفع الطلبات:**
- هنا المبلغ = سعر الخطة (من `platform_plans.price_monthly`)
- الـ `merchantOrderId` = `sub_<storeId>_<timestamp>` (لتمييزه عن طلبات المتجر + منع التكرار)
- الـ `merchantRedirect` = `https://{ROOT_DOMAIN}/subscription-result?storeId=xxx` (على الـ root domain مش الـ subdomain)
- الـ `serverWebhook` = `https://{ROOT_DOMAIN}/api/payments/subscription/webhook`

---

### 7. إنشاء Webhook لدفع الاشتراك

**ملف جديد**: `src/app/api/payments/subscription/webhook/route.ts`

**الوصف**: يستقبل إشعار من Kashier بعد ما التاجر يدفع

```
POST /api/payments/subscription/webhook
Body: Kashier webhook payload (same format)
Auth: Signature verification (HMAC-SHA256)

المنطق:
1. تحقق من التوقيع ← verifyKashierSignature()
2. استخلص storeId من merchantOrderId (يبدأ بـ sub_<storeId>_<timestamp>)
3. اجلب المتجر + subscriptionAmount المخزن عليه
4. تحقق من تطابق المبلغ المدفوع = subscriptionAmount (حماية ضد تلاعب)
5. Idempotency check: لو is_paid = true بالفعل → تجاهل (return 200)
6. لو paymentStatus = SUCCESS:
   - UPDATE stores SET is_paid = true, subscriptionPaidAt = now(),
     subscriptionTransactionId = transactionId WHERE id = storeId
   - Log: "تم تفعيل المتجر بعد الدفع"
7. لو paymentStatus = FAILED:
   - لا تغيير — المتجر يظل is_paid = false
   - Log: "فشل دفع اشتراك المتجر"
8. ارجع 200 لـ Kashier
```

---

### 8. صفحة نتيجة دفع الاشتراك

**ملف جديد**: `src/app/(platform)/subscription-result/page.tsx`

**الوصف**: Kashier يحوّل التاجر لهنا بعد الدفع

**حالة النجاح:**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│        ✅ تم تفعيل متجرك بنجاح!                 │
│                                                  │
│        تم الدفع وتفعيل الخطة بنجاح              │
│        متجرك جاهز الآن لاستقبال الزوار           │
│                                                  │
│         [ زيارة موقعك ]  [ لوحة التحكم ]         │
│                                                  │
└─────────────────────────────────────────────────┘
```

**حالة الفشل:**
```
┌─────────────────────────────────────────────────┐
│                                                  │
│        ❌ فشل الدفع                              │
│                                                  │
│        لم يتم إكمال عملية الدفع.                 │
│        يمكنك المحاولة مرة أخرى.                  │
│                                                  │
│         [ حاول مرة أخرى ]  [ لوحة التحكم ]       │
│                                                  │
└─────────────────────────────────────────────────┘
```

**النوع**: `'use client'` — لأن فيه `useState`, `useEffect`, `setInterval` (polling)

**المنطق:**
- Kashier يحول التاجر لـ `https://{ROOT_DOMAIN}/subscription-result?storeId=xxx&status=success|failure`
- الصفحة على الـ root domain (مش الـ subdomain) لأنها تحت `(platform)` layout
- نعتمد على الـ Webhook لتحديث الـ DB، مش على الـ redirect parameters (أأمن)
- الصفحة تعمل polling عبر `GET /api/payments/subscription/status?storeId=xxx` كل 2 ثانية لمدة 30 ثانية لحد ما `is_paid = true` (لأن الـ webhook ممكن يتأخر شوية)

---

### 9. إضافة زر "فعّل متجرك" في Dashboard

**الملف**: `src/app/(dashboard)/layout.tsx` أو Banner component

**المنطق**: لو التاجر فاتح الداشبورد و `is_paid = false` ← نعرض بانر تذكيري (مش blocking):

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ متجرك غير مفعّل بعد — الزوار لن يستطيعوا رؤية موقعك.   │
│                                    [ فعّل متجرك الآن ]       │
└──────────────────────────────────────────────────────────────┘
```

الزر يستدعي `POST /api/payments/subscription/create` مباشرة من الـ subdomain (API routes شغالة على أي domain) ← يحصل على `paymentUrl` ← يعمل `window.location.href = paymentUrl` لـ Kashier. لكن الداشبورد يفضل شغال طبيعي.

---

### 10. إنشاء API لحالة الاشتراك (Polling)

**ملف جديد**: `src/app/api/payments/subscription/status/route.ts`

**الوصف**: صفحة النتيجة بتعمل polling — محتاجين endpoint يرجع حالة `isPaid`

```
GET /api/payments/subscription/status?storeId=xxx
Auth: يحتاج Clerk auth (التاجر صاحب المتجر فقط)

المنطق:
1. Zod validation على storeId query param (z.uuidv4)
2. تحقق من المصادقة عبر getAuthenticatedMerchant()
3. اجلب المتجر + تأكد إن store.merchantId = merchant.id (تحقق ملكية)
4. ارجع { isPaid: boolean, slug: string }

Response: { success: true, data: { isPaid: boolean, slug: string } }
Errors:
  401 — UNAUTHORIZED
  403 — FORBIDDEN
  404 — STORE_NOT_FOUND
  422 — VALIDATION_ERROR
  500 — INTERNAL_ERROR
```

**الكود المتوقع (يستخدم auth helpers الموجودة):**
```typescript
import { getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    // ... جلب المتجر + تحقق ملكية + إرجاع isPaid
    return apiSuccess({ isPaid: storeRow.isPaid, slug: storeRow.slug })
  } catch (error) {
    console.error('GET /api/payments/subscription/status error:', error)
    return ApiErrors.internal()
  }
}
```

**أمان**: لو ما تحققناش من الملكية، أي حد يقدر يعرف هل متجر معين مدفوع ولا لأ.

---

### 11. حماية Storefront APIs (مش بس الـ Layout)

**المشكلة**: `store/layout.tsx` يحجب الـ UI، لكن الـ Storefront API routes (اللي بتجيب منتجات وكاتيجوريز) مش محمية.

**الحل**: إضافة check على `isPaid` في `getStorefrontData()` أو في الـ storefront queries:

**الملف**: `src/lib/queries/storefront.ts`

```typescript
export async function getStorefrontData(storeId: string) {
  // التحقق إن المتجر مدفوع قبل ما نرجع أي بيانات
  const store = await db.select({ isPaid: stores.isPaid })
    .from(stores).where(eq(stores.id, storeId)).limit(1)

  if (!store[0]?.isPaid) return null   // ← مش هنرجع بيانات لو مش مدفوع

  // باقي الـ queries عادي...
}
```

**ملاحظة بديلة**: ممكن بدل ما نعدل كل query، نعتمد على إن الـ layout هو اللي بيعمل الـ check ومش بيمرر `children` أصلاً. لكن الـ defense-in-depth أحسن.

---

### 12. تعديل Super Admin — التحكم في `isPaid`

**الملف**: `src/app/api/admin/stores/[id]/route.ts`

**المشكلة**: لو التاجر عنده مشكلة أو عايز trial — مفيش طريقة الـ Super Admin يفعّل المتجر يدوياً.

**الحل**: إضافة `isPaid` كـ field مسموح في `PATCH /api/admin/stores/[id]`:

```typescript
// في updateAdminStoreSchema — نضيف:
isPaid: z.boolean().optional()
```

كذلك عند تغيير الخطة من Super Admin:
```typescript
// لو Super Admin حوّل من paid → free:
if (newPlan === 'free') await db.update(stores).set({ isPaid: true })

// لو Super Admin حوّل من free → paid:
if (oldPlan === 'free' && newPlan !== 'free') await db.update(stores).set({ isPaid: false })
```

---

## ملخص الملفات

### ملفات تتعدل:
| # | الملف | التعديل |
|---|-------|--------|
| 1 | `src/db/schema.ts` | إضافة `isPaid` + `subscriptionAmount` + `subscriptionPaidAt` + `subscriptionTransactionId` |
| 2 | `src/app/api/stores/route.ts` | تعيين `isPaid` حسب نوع الخطة عند الإنشاء |
| 3 | `src/lib/tenant/resolve-store.ts` | إرجاع `isPaid` في `ResolvedStore` type + select |
| 4 | `src/app/store/layout.tsx` | إضافة check لـ `isPaid` + جلب بيانات الخطة → عرض `StorePaymentGate` |
| 5 | `src/lib/payments/kashier.ts` | إضافة helper function `createSubscriptionSession()` |
| 6 | `src/app/(dashboard)/layout.tsx` | بانر تذكيري لما `isPaid = false` |
| 7 | `src/lib/queries/storefront.ts` | إضافة check على `isPaid` قبل إرجاع بيانات المتجر (defense-in-depth) |
| 8 | `src/app/api/admin/stores/[id]/route.ts` | إضافة `isPaid` toggle + مزامنة مع تغيير الخطة |
| 9 | `src/lib/validations/store.ts` | إضافة `isPaid` لـ `updateAdminStoreSchema` |

### ملفات جديدة:
| # | الملف | الغرض |
|---|-------|-------|
| 1 | `src/app/store/_components/store-payment-gate.tsx` | `'use client'` — صفحة "ادفع الأول" تظهر بدل الموقع |
| 2 | `src/app/api/payments/subscription/create/route.ts` | إنشاء جلسة Kashier لدفع الاشتراك |
| 3 | `src/app/api/payments/subscription/webhook/route.ts` | استقبال إشعار Kashier + تحديث `is_paid` |
| 4 | `src/app/api/payments/subscription/status/route.ts` | Polling endpoint لصفحة النتيجة |
| 5 | `src/app/(platform)/subscription-result/page.tsx` | `'use client'` — صفحة نتيجة الدفع (نجاح/فشل) + polling |
| 6 | `src/lib/validations/subscription.ts` | Zod v4 schema: `createSubscriptionSchema` |
| 7 | `migrations/add_is_paid_to_stores.sql` | Migration SQL |

---

## ترتيب التنفيذ

```
الخطوة 1:  Migration + Schema                (أساس كل شيء — 4 حقول جديدة)
الخطوة 2:  تعديل POST /api/stores            (إنشاء المتجر بـ isPaid الصح)
الخطوة 3:  تعديل resolveStore                (إرجاع isPaid)
الخطوة 4:  Subscription Create API           (إنشاء جلسة دفع + تحقق ملكية)
الخطوة 5:  Subscription Webhook              (استقبال نتيجة الدفع + تحقق مبلغ + idempotency)
الخطوة 6:  Subscription Status API (Polling) (endpoint لصفحة النتيجة)
الخطوة 7:  Subscription Result Page          (صفحة نتيجة الدفع + polling)
الخطوة 8:  StorePaymentGate Component        (بوابة الدفع في الـ storefront)
الخطوة 9:  تعديل Storefront Layout           (تفعيل البوابة)
الخطوة 10: حماية Storefront APIs             (defense-in-depth على queries)
الخطوة 11: Dashboard Banner                  (تذكير التاجر)
الخطوة 12: تعديل Super Admin                 (toggle isPaid + مزامنة مع تغيير الخطة)
```

---

## أسئلة مفتوحة (نقاط محتاجة قرارك)

### س1: هل الدفع شهري متكرر (Recurring) ولا دفعة واحدة؟
- **لو دفعة واحدة**: يدفع مرة → `is_paid = true` للأبد ← أبسط في التنفيذ
- **لو شهري متكرر**: محتاج `paid_until` (تاريخ انتهاء الاشتراك) + cron job يتأكد كل يوم ← أعقد
- **اقتراحي**: نبدأ بدفعة واحدة شهرية (يدفع شهر واحد)، ونضيف الـ recurring لاحقاً

### س2: هل التاجر يقدر يغير خطته بعد الدفع؟
- مثلاً اشترك في Basic وعايز يترقى لـ Pro ← هل يدفع الفرق؟
- **اقتراحي**: نأجل هذا لمرحلة لاحقة — حالياً يدفع الخطة اللي اختارها وبس

### س3: الـ `StorePaymentGate` — تظهر لمين بالظبط؟
- **خيار أ**: تظهر لأي حد يزور الموقع (زائر عادي أو التاجر نفسه) ← هذا الأبسط
- **خيار ب**: تظهر للتاجر بس لما يزور موقعه (الزوار العاديين يشوفوا "المتجر قيد الإنشاء")
- **اقتراحي**: خيار أ — صفحة واحدة للكل فيها "هذا المتجر قيد التفعيل" مع زر الدفع (الزر يظهر للتاجر فقط لو logged in)

### س4: هل نحتاج جدول `store_subscriptions` منفصل؟
- لتتبع تاريخ المدفوعات، تاريخ انتهاء الاشتراك، إلخ
- **اقتراحي**: حالياً `is_paid` على `stores` كافي. نضيف جدول منفصل لاحقاً لو احتجنا تاريخ المدفوعات

---

## ملاحظات أمنية

1. **الـ Webhook هو المصدر الرسمي** لتحديث `is_paid` — مش الـ redirect من Kashier
2. **التحقق من التوقيع** إلزامي على الـ subscription webhook (زي ما هو في الـ order webhook)
3. **التحقق من المبلغ**: المبلغ المدفوع لازم يساوي `subscriptionAmount` المخزن على المتجر وقت إنشاء الجلسة (مش سعر الخطة الحالي — لأن السعر ممكن يتغير بين إنشاء الجلسة والدفع)
4. **الـ Dashboard لا يُحجب أبداً** — التاجر لازم يقدر يستخدم الداشبورد حتى لو ما دفعش
5. **تحقق الملكية صريح**: `store.merchantId === merchant.id` في كل endpoint (create + status) — لمنع تاجر من الدفع لمتجر حد تاني
6. **Idempotency**: الـ webhook لازم يتجاهل لو `is_paid = true` بالفعل — منع معالجة مكررة
7. **حماية مزدوجة للـ Storefront**: UI gate في الـ layout + data gate في الـ queries — defense-in-depth
8. **Storefront API routes**: مش بس الـ layout — الـ queries كمان لازم تتحقق من `isPaid`
9. **Super Admin override**: لازم يقدر يعمل toggle لـ `isPaid` يدوياً + مزامنة تلقائية عند تغيير الخطة
10. **Redirect URLs**: لازم تكون على الـ root domain (مش الـ subdomain) لأن صفحة النتيجة تحت `(platform)` layout
11. **Rate Limiting**: `POST /api/payments/subscription/create` محتاج rate limiting — 10 طلبات/ساعة لكل IP (منع spam)
12. **try/catch**: كل API route لازم يكون ملفوف في `try/catch` مع `console.error` + `ApiErrors.internal()`
13. **Error codes**: كل `apiError()` لازم يكون فيه code ثالث: `apiError(msg, status, 'CODE')`

---

## قواعد التنفيذ (Checklist لكل خطوة)

- [ ] استخدام `getAuthenticatedMerchant()` أو `verifyStoreOwnership()` — **مش كود auth يدوي**
- [ ] Zod v4 validation لكل input: `z.uuidv4()` مش `z.string().uuid()`، `{ error: '...' }` مش `'...'`
- [ ] كل `apiError()` فيه error code: `apiError(msg, status, 'CODE')`
- [ ] `apiSuccess()` / `apiError()` / `ApiErrors.*` فقط — **لا `NextResponse.json()` مباشرة**
- [ ] كل API route ملفوف في `try/catch`
- [ ] رسائل الأخطاء بالعربية
- [ ] `@/` imports — لا relative paths
- [ ] Server Components أولاً — `'use client'` فقط عند الحاجة (مذكور صراحةً في الخطة)
- [ ] Tailwind v4: `shadow-xs` مش `shadow-sm`, RTL-first: `ps-4 pe-2 ms-auto text-start`
- [ ] بعد كل خطوة: `npx tsc --noEmit` — لازم 0 errors
- [ ] تحديث `Agent.md` بعد كل تعديل

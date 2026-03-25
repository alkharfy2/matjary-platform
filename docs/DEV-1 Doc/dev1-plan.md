# خطة تنفيذ Dev 1 — المصادقة والـ Middleware والـ API والتكامل

> **المسؤول**: Dev 1
> **تاريخ الخطة**: 21 فبراير 2026
> **الحالة**: قيد التنفيذ

---

## الفهرس

1. [نظرة عامة](#1-نظرة-عامة)
2. [تحليل الوضع الحالي — ما تم وما لم يتم](#2-تحليل-الوضع-الحالي)
3. [المراجعة الأمنية الشاملة — عزل المتاجر](#3-المراجعة-الأمنية)
4. [المهام مقسمة بالأولوية والتبعيات](#4-المهام-بالتفصيل)
5. [خريطة التبعيات مع Dev 2 و Dev 3](#5-خريطة-التبعيات)
6. [تحليل الصعوبات والمخاطر](#6-تحليل-الصعوبات)
7. [المهارات المطلوبة](#7-المهارات-المطلوبة)
8. [تقييم القدرة على التنفيذ بالـ AI](#8-تقييم-القدرة)
9. [جدول زمني مقترح](#9-الجدول-الزمني)
10. [ملاحظات التكامل لـ Dev 2 و Dev 3](#10-ملاحظات-التكامل)
11. [قائمة المراجعة النهائية](#11-قائمة-المراجعة)

---

## 1. نظرة عامة

Dev 1 مسؤول عن **البنية التحتية للمنصة بالكامل** — يعني كل API وكل خدمة يعتمد عليها Dev 2 (لوحة التحكم) و Dev 3 (واجهة المتجر). بدون شغل Dev 1، لا Dev 2 ولا Dev 3 يقدروا يشتغلوا بشكل كامل.

### نطاق المسؤولية

```
┌─────────────────────────────────────────────────┐
│                    Dev 1                         │
├─────────────────────────────────────────────────┤
│ ✅ Clerk Webhook (موجود — يحتاج تحسين)          │
│ ✅ Middleware (موجود — يحتاج تحسين)              │
│ ✅ Auth helpers (موجودة وجاهزة)                  │
│ ✅ API Response helpers (موجودة وجاهزة)          │
│ ✅ Store CRUD API (موجود وجاهز)                  │
│ ✅ Checkout API (موجود — Kashier TODO)           │
│ ✅ Coupon Validate API (موجود وجاهز)             │
│ ✅ Shipping Calculate API (موجود وجاهز)          │
│ ✅ Super Admin APIs (موجودة وجاهزة)              │
│ ✅ Validations (Zod schemas — جاهزة)             │
│                                                  │
│ 🔴 Onboarding → ربط بـ API حقيقي                │
│ 🔴 Super Admin Pages → ربط ببيانات حقيقية       │
│ 🔴 إصلاح ثغرات أمنية (عزل المتاجر)             │
│ 🔴 Kashier Payment Integration                   │
│ 🟡 Rate Limiting                                 │
│ 🟡 تحسينات Clerk Webhook                        │
│ 🟡 تحسينات Middleware                            │
└─────────────────────────────────────────────────┘
```

---

## 2. تحليل الوضع الحالي

### ✅ مكتمل وجاهز (لا يحتاج تغيير)

| الملف | الحالة | ملاحظات |
|-------|--------|---------|
| `src/middleware.ts` | ✅ مكتمل | Subdomain routing + Clerk auth + rewrite للـ store + حماية Dashboard + حماية API |
| `src/lib/api/auth.ts` | ✅ مكتمل | `getAuthenticatedMerchant()` + `verifyStoreOwnership()` + `isSuperAdmin()` |
| `src/lib/api/response.ts` | ✅ مكتمل | `apiSuccess()` + `apiError()` + `ApiErrors.*` |
| `src/app/api/webhooks/clerk/route.ts` | ✅ مكتمل | Creates/Updates/Deletes merchants تلقائياً |
| `src/app/api/stores/route.ts` | ✅ مكتمل | POST — إنشاء متجر مع Zod validation + conflict handling |
| `src/app/api/stores/[id]/route.ts` | ✅ مكتمل | GET + PUT — بيانات وتعديل المتجر |
| `src/app/api/checkout/route.ts` | ⚠️ 95% مكتمل | Checkout كامل بالـ transaction — **Kashier placeholder فقط** |
| `src/app/api/coupons/validate/route.ts` | ✅ مكتمل | يتحقق من صلاحية الكوبون |
| `src/app/api/shipping/calculate/route.ts` | ✅ مكتمل | يحسب تكلفة الشحن حسب المحافظة |
| `src/app/api/admin/analytics/route.ts` | ✅ مكتمل | إحصائيات كاملة للـ Super Admin |
| `src/app/api/admin/stores/route.ts` | ✅ مكتمل | قائمة المتاجر + بحث + فلترة + pagination |
| `src/app/api/admin/stores/[id]/route.ts` | ✅ مكتمل | GET + PATCH (toggle active, change plan) |
| `src/app/api/admin/merchants/route.ts` | ✅ مكتمل | قائمة التجار + بحث + pagination |
| `src/app/api/admin/plans/route.ts` | ✅ مكتمل | GET (list) + POST (create) |
| `src/app/api/admin/plans/[id]/route.ts` | ✅ مكتمل | PUT (update) + DELETE |
| `src/lib/validations/store.ts` | ✅ مكتمل | كل Zod schemas للمتجر |
| `src/lib/validations/order.ts` | ✅ مكتمل | كل Zod schemas للطلبات والكوبونات والشحن |
| `src/(super-admin)/layout.tsx` | ✅ مكتمل | Auth guard + sidebar + header |

### 🔴 يحتاج تنفيذ (المهام المتبقية)

| المهمة | الأولوية | التأثير على Dev 2/3 | التعقيد |
|--------|----------|---------------------|---------|
| ربط Onboarding بـ API حقيقي | 🔴 عالية | **يمنع** Dev 2 + Dev 3 من اختبار أي شيء | ⭐ سهل || 🔒 إصلاح ثغرات عزل المتاجر (13 ملف) | 🔴 عالية | **أمان حرج** — يؤثر على كل APIs | ⭐ سهل (ميكانيكي) || Super Admin Overview — بيانات حقيقية | 🔴 عالية | لا يؤثر مباشرة لكن مطلوب | ⭐ سهل |
| Super Admin Stores — بيانات حقيقية | 🔴 عالية | لا يؤثر مباشرة لكن مطلوب | ⭐⭐ متوسط |
| Super Admin Merchants — بيانات حقيقية | 🟡 متوسطة | لا يؤثر مباشرة | ⭐ سهل |
| Super Admin Plans — بيانات حقيقية | 🟡 متوسطة | لا يؤثر مباشرة | ⭐⭐ متوسط |
| Kashier Payment Integration | 🟡 متوسطة | Dev 3 يحتاجه لـ "الدفع الإلكتروني" | ⭐⭐⭐ صعب |
| Rate Limiting | 🟢 منخفضة | حماية — مش blocking | ⭐⭐ متوسط |
| تحسينات Clerk Webhook | 🟢 منخفضة | يعمل حالياً لكن ممكن يتحسن | ⭐ سهل |

---

## 3. المراجعة الأمنية الشاملة — عزل المتاجر (Tenant Isolation) 🔒

> تم إجراء مراجعة أمنية كاملة لكل الـ 33 ملف API + Auth + Tenant resolution في 21 فبراير 2026

### ملخص النتائج

```
┌──────────────────────────────────────────────────────────────┐
│              🔒 تقرير المراجعة الأمنية                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ ثغرات حرجة (Critical):     0 — لا يوجد                   │
│  ⚠️  ثغرات متوسطة (Medium):     6 — تحتاج إصلاح فوري         │
│  💡 تحسينات منخفضة (Low):       7 — تُنفذ لاحقاً             │
│                                                               │
│  ✅ كل Dashboard routes تستخدم verifyStoreOwnership()        │
│  ✅ كل Admin routes تستخدم isSuperAdmin()                    │
│  ✅ كل API routes فيها try/catch (لا stack traces مسرّب)     │
│  ✅ كل SELECT queries فيها storeId filter                    │
│  ✅ Zod validation موجود في أغلب POST/PUT                    │
│  ✅ escapeLike() مستخدم في كل ILIKE (منع SQL injection)      │
│  ✅ Pagination محدود بـ Math.min(50) (منع DoS)               │
│  ✅ Supabase Storage مُقسّم per-store ({storeId}/{folder}/)  │
│  ✅ Webhook signature verification (svix) ✅                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### ⚠️ ثغرات متوسطة — تحتاج إصلاح فوري

#### M1: UPDATE/DELETE بدون storeId في WHERE clause (13 موقع)

**المشكلة**: كل الـ `[id]` routes تتحقق من الملكية عبر SELECT أولاً (صح ✅)، لكن بعدها تعمل UPDATE/DELETE بـ `eq(table.id, id)` **بدون** `storeId`. ده يخالف مبدأ Defense-in-Depth — لو حصل race condition أو refactor خاطئ، ممكن يتعدل record تبع متجر تاني.

**الملفات المتأثرة (13 موقع):**

| الملف | العملية |
|-------|--------|
| `api/dashboard/products/[id]/route.ts` | UPDATE + DELETE |
| `api/dashboard/categories/[id]/route.ts` | UPDATE + DELETE |
| `api/dashboard/coupons/[id]/route.ts` | UPDATE + DELETE |
| `api/dashboard/shipping/[id]/route.ts` | UPDATE + DELETE |
| `api/dashboard/pages/[id]/route.ts` | UPDATE + DELETE |
| `api/dashboard/design/hero-slides/[id]/route.ts` | DELETE |
| `api/dashboard/customers/[id]/route.ts` | UPDATE |
| `api/dashboard/orders/[id]/status/route.ts` | UPDATE |

**الإصلاح**: تغيير كل `.where(eq(table.id, id))` لـ `.where(and(eq(table.id, id), eq(table.storeId, store.id)))`

```typescript
// ❌ الحالي (خطر)
await db.update(storeProducts)
  .set(updateData)
  .where(eq(storeProducts.id, id))

// ✅ الإصلاح (آمن — defense-in-depth)
await db.update(storeProducts)
  .set(updateData)
  .where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
```

---

#### M2: جلب طلبات العميل بدون storeId filter

**الملف**: `api/dashboard/customers/[id]/route.ts`
**المشكلة**: الطلبات تُجلب بـ `customerId` فقط بدون `storeId`

```typescript
// ❌ الحالي
.where(eq(storeOrders.customerId, id))

// ✅ الإصلاح
.where(and(eq(storeOrders.customerId, id), eq(storeOrders.storeId, store.id)))
```

---

#### M3: جلب بيانات العميل من الطلب بدون storeId

**الملف**: `api/dashboard/orders/[id]/route.ts`
**المشكلة**: العميل يُجلب بـ `customerId` فقط

```typescript
// ❌ الحالي
.where(eq(storeCustomers.id, order[0].customerId))

// ✅ الإصلاح
.where(and(eq(storeCustomers.id, order[0].customerId), eq(storeCustomers.storeId, store.id)))
```

---

#### M4: لا يوجد Zod validation على تعديل العميل

**الملف**: `api/dashboard/customers/[id]/route.ts`
**المشكلة**: يستخدم `typeof` يدوي بدل Zod — يسمح بمرور بيانات غير متوقعة

**الإصلاح**: إنشاء `updateCustomerSchema` في `src/lib/validations/`

---

#### M5: لا يوجد Zod validation على PATCH متجر في Admin

**الملف**: `api/admin/stores/[id]/route.ts`
**المشكلة**: نفس M4 — تحقق يدوي بـ `typeof`

**الإصلاح**: إنشاء `updateAdminStoreSchema`

---

#### M6: verifyStoreOwnership() fallback غير محدد السلوك

**الملف**: `src/lib/api/auth.ts`
**المشكلة**: لو مفيش `x-store-slug` header، بتجيب أول متجر للتاجر بدون ترتيب. لو (مستقبلاً) التاجر عنده أكتر من متجر، السلوك غير متوقع.

**الإصلاح**: إما نرجع `null` لو مفيش slug (أكتر أماناً)، أو نضيف `ORDER BY createdAt ASC`

---

### 💡 تحسينات منخفضة — تُنفذ لاحقاً

| # | المشكلة | الملف | الأولوية |
|---|---------|-------|----------|
| L1 | `resolveStore()` لا يفلتر بـ `isActive` — متجر معطّل ممكن يظهر | `lib/tenant/resolve-store.ts` | 🟡 |
| L2 | لا يوجد Zod validation على date parameters في analytics | `api/dashboard/analytics/route.ts` | 🟢 |
| L3 | `deleteImage()` يقبل أي path بدون تحقق من storeId | `lib/supabase/storage.ts` | 🟡 |
| L4 | لا يوجد Zod validation على query params في Admin GET | `api/admin/stores/route.ts` | 🟢 |
| L5 | Admin DELETE plan لا يتحقق من وجود الخطة أولاً | `api/admin/plans/[id]/route.ts` | 🟢 |
| L6 | Upload route يستخدم validation يدوي بدل Zod | `api/dashboard/upload/route.ts` | 🟢 |
| L7 | `isSuperAdmin()` يدعم admin واحد فقط | `lib/api/auth.ts` | 🟢 |

---

### جدول أمني شامل — حالة كل API Route

| # | الملف | Auth | storeId Filter | Zod | try/catch | الحكم |
|---|-------|------|---------------|-----|-----------|-------|
| 1 | dashboard/products/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 2 | dashboard/products/[id]/route.ts | ✅ | ⚠️ M1 | ✅ | ✅ | ⚠️ WARN |
| 3 | dashboard/orders/route.ts | ✅ | ✅ | — | ✅ | ✅ PASS |
| 4 | dashboard/orders/[id]/route.ts | ✅ | ⚠️ M3 | — | ✅ | ⚠️ WARN |
| 5 | dashboard/orders/[id]/status/route.ts | ✅ | ⚠️ M1 | ✅ | ✅ | ⚠️ WARN |
| 6 | dashboard/categories/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 7 | dashboard/categories/[id]/route.ts | ✅ | ⚠️ M1 | ✅ | ✅ | ⚠️ WARN |
| 8 | dashboard/coupons/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 9 | dashboard/coupons/[id]/route.ts | ✅ | ⚠️ M1 | ✅ | ✅ | ⚠️ WARN |
| 10 | dashboard/shipping/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 11 | dashboard/shipping/[id]/route.ts | ✅ | ⚠️ M1 | ✅ | ✅ | ⚠️ WARN |
| 12 | dashboard/pages/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 13 | dashboard/pages/[id]/route.ts | ✅ | ⚠️ M1 | ✅ | ✅ | ⚠️ WARN |
| 14 | dashboard/design/theme/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 15 | dashboard/design/hero-slides/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 16 | dashboard/design/hero-slides/[id]/route.ts | ✅ | ⚠️ M1 | — | ✅ | ⚠️ WARN |
| 17 | dashboard/customers/route.ts | ✅ | ✅ | ❌ M4 | ✅ | ⚠️ WARN |
| 18 | dashboard/customers/[id]/route.ts | ✅ | ⚠️ M1+M2 | ❌ M4 | ✅ | ⚠️ WARN |
| 19 | dashboard/analytics/route.ts | ✅ | ✅ | ❌ L2 | ✅ | ✅ PASS |
| 20 | dashboard/settings/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 21 | dashboard/upload/route.ts | ✅ | ✅ | ❌ L6 | ✅ | ✅ PASS |
| 22 | admin/analytics/route.ts | ✅ | — | — | ✅ | ✅ PASS |
| 23 | admin/stores/route.ts | ✅ | — | ❌ L4 | ✅ | ✅ PASS |
| 24 | admin/stores/[id]/route.ts | ✅ | — | ❌ M5 | ✅ | ⚠️ WARN |
| 25 | admin/merchants/route.ts | ✅ | — | ❌ L4 | ✅ | ✅ PASS |
| 26 | admin/plans/route.ts | ✅ | — | ✅ | ✅ | ✅ PASS |
| 27 | admin/plans/[id]/route.ts | ✅ | — | ✅ | ✅ | ✅ PASS |
| 28 | coupons/validate/route.ts | عام | ✅ | ✅ | ✅ | ✅ PASS |
| 29 | shipping/calculate/route.ts | عام | ✅ | ✅ | ✅ | ✅ PASS |
| 30 | checkout/route.ts | عام | ✅ | ✅ | ✅ | ✅ PASS |
| 31 | stores/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 32 | stores/[id]/route.ts | ✅ | ✅ | ✅ | ✅ | ✅ PASS |
| 33 | webhooks/clerk/route.ts | Svix ✅ | — | — | ✅ | ✅ PASS |

### ترتيب أولوية الإصلاحات الأمنية

```
  الأولوية 1 (فوري):  M1 — إضافة storeId في 13 موقع UPDATE/DELETE
  الأولوية 2 (فوري):  M2 + M3 — إضافة storeId في cross-table lookups
  الأولوية 3 (مهم) :  M4 + M5 — إضافة Zod schemas للـ bodies غير المحمية
  الأولوية 4 (مهم) :  M6 — تأمين verifyStoreOwnership() fallback
  الأولوية 5 (لاحقاً): L1–L7 — تحسينات عامة
```

---

## 4. المهام بالتفصيل

---

### المهمة 0: إصلاح الثغرات الأمنية 🔴🔒 (الأعلى أولوية)

**الأولوية**: فوري — **قبل أي مهمة تانية**
**التعقيد**: ⭐ سهل (تغييرات ميكانيكية)
**عدد الملفات**: 13+ ملف

**المطلوب:**

#### 0أ. إضافة storeId لكل UPDATE/DELETE (M1)
```typescript
// في كل [id] route:
// قبل:
.where(eq(storeProducts.id, id))

// بعد:
.where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
```

#### 0ب. إصلاح cross-table lookups (M2 + M3)
إضافة `storeId` filter عند جلب طلبات العميل وبيانات العميل من الطلب.

#### 0ج. إضافة Zod schemas (M4 + M5)
- إنشاء `updateCustomerSchema` في `src/lib/validations/`
- إنشاء `updateAdminStoreSchema` في `src/lib/validations/store.ts`

#### 0د. تأمين verifyStoreOwnership() fallback (M6)
```typescript
// الحل: ارجع null لو مفيش slug — أكتر أماناً
if (!slug) return { merchant, store: null }
```

**المخرجات:** كل API route يكون فيه **double protection** — SELECT check + WHERE clause في UPDATE/DELETE

---

### المهمة 1: ربط Onboarding بـ API حقيقي 🔴

**الأولوية**: فوري — **Blocker لـ Dev 2 و Dev 3**
**الملف**: `src/app/(platform)/onboarding/page.tsx`
**التعقيد**: ⭐ سهل

**الوضع الحالي:**
- الصفحة موجودة بـ 3 خطوات (wizard UI)
- Step 1 يجمع: `name`, `slug`, `category`
- Steps 2 و 3 نصوص placeholder
- زر "إنشاء المتجر" يعرض `alert()` فقط — لا يتصل بأي API

**المطلوب:**
```typescript
// بدل alert() — استدعي POST /api/stores
const response = await fetch('/api/stores', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: storeName, slug: storeSlug, category }),
})

if (response.ok) {
  const { data } = await response.json()
  // Redirect إلى الداشبورد على الـ subdomain
  window.location.href = `${protocol}://${data.slug}.${rootDomain}/dashboard`
} else {
  const { error } = await response.json()
  // عرض الخطأ للمستخدم
  setErrorMessage(error)
}
```

**المخرجات:**
- المستخدم يسجل دخول ← يُنشئ متجر ← يتحول تلقائياً للداشبورد
- Dev 2 و Dev 3 يقدروا يختبروا شغلهم

**ملاحظات:**
- الـ API `/api/stores` موجود وشغال ✅
- الـ Zod validation موجود ✅
- محتاج بس نربط الـ UI بالـ API + نعمل error handling + redirect

---

### المهمة 2: Super Admin Overview — بيانات حقيقية 🔴

**الأولوية**: عالية
**الملف**: `src/app/(super-admin)/super-admin/page.tsx`
**التعقيد**: ⭐ سهل

**الوضع الحالي:**
- الصفحة تعرض 4 stat cards كلهم بقيمة "0"
- لا يوجد data fetching

**المطلوب:**
- جلب البيانات من `/api/admin/analytics` (API موجود وجاهز ✅)
- أو مباشرة من DB (Server Component) باستخدام Drizzle
- عرض: إجمالي المتاجر، التجار، الطلبات، الإيرادات
- عرض: آخر 10 متاجر + آخر 20 نشاط

**النهج الأفضل**: Server Component يجلب البيانات مباشرة من DB (أسرع من API call)

```typescript
// src/app/(super-admin)/super-admin/page.tsx
import { db } from '@/db'
import { stores, merchants, storeOrders } from '@/db/schema'
import { count, sum } from 'drizzle-orm'

export default async function SuperAdminPage() {
  const [storeCount] = await db.select({ value: count() }).from(stores)
  const [merchantCount] = await db.select({ value: count() }).from(merchants)
  // ... إلخ
}
```

---

### المهمة 3: Super Admin Stores — بيانات حقيقية 🔴

**الأولوية**: عالية
**الملف**: `src/app/(super-admin)/super-admin/stores/page.tsx`
**التعقيد**: ⭐⭐ متوسط

**الوضع الحالي:**
- جدول HTML فارغ بدون بيانات حقيقية
- بحث وفلتر UI موجودين لكنهم لا يعملوا

**المطلوب:**
- جلب المتاجر من DB (أو من `/api/admin/stores`)
- عرضهم في الجدول مع: اسم المتجر، التاجر، الخطة، عدد المنتجات، الحالة
- Search + Filter بالخطة والحالة
- زر تفعيل/إلغاء تفعيل (PATCH `/api/admin/stores/[id]`)
- Pagination

**ملاحظة**: يحتاج Client Component لأجل البحث والفلترة

---

### المهمة 4: Super Admin Merchants — بيانات حقيقية 🟡

**الأولوية**: متوسطة
**الملف**: `src/app/(super-admin)/super-admin/merchants/page.tsx`
**التعقيد**: ⭐ سهل

**المطلوب:**
- جلب التجار من DB أو `/api/admin/merchants`
- عرض: الاسم، الإيميل، عدد المتاجر، تاريخ التسجيل
- بحث بالإيميل
- Pagination

---

### المهمة 5: Super Admin Plans — بيانات حقيقية + CRUD 🟡

**الأولوية**: متوسطة
**الملف**: `src/app/(super-admin)/super-admin/plans/page.tsx`
**التعقيد**: ⭐⭐ متوسط

**الوضع الحالي:**
- 3 كروت hardcoded (Free / Basic / Pro)
- زر "تعديل" لا يعمل

**المطلوب:**
- جلب الخطط من DB (أو `/api/admin/plans`)
- عرض ديناميكي مع كل المعلومات
- إضافة/تعديل/حذف خطة عبر dialog/modal
- الـ APIs موجودة: GET, POST `/api/admin/plans` + PUT, DELETE `/api/admin/plans/[id]` ✅

---

### المهمة 6: Kashier Payment Integration 🟡

**الأولوية**: متوسطة (يؤثر على Dev 3 — checkout)
**الملفات الجديدة**:
- `src/app/api/payments/kashier/create/route.ts`
- `src/app/api/payments/kashier/webhook/route.ts`
**التعقيد**: ⭐⭐⭐ صعب

**المطلوب:**

#### 6أ. إنشاء جلسة دفع (POST /api/payments/kashier/create)
```
المدخلات: orderId, amount, customerName, customerEmail
المخرجات: { redirectUrl: string }
يُستدعى من: POST /api/checkout عندما paymentMethod = 'kashier'
```

#### 6ب. Webhook استلام الإشعار (POST /api/payments/kashier/webhook)
```
يُستقبل من: Kashier servers
الإجراء: تحديث payment_status في store_orders
- payment success → payment_status = 'paid', paid_at = now()
- payment failed → payment_status = 'failed'
```

#### 6ج. تعديل checkout ليستدعي Kashier
```typescript
// في POST /api/checkout:
if (paymentMethod === 'kashier') {
  const kashierResponse = await createKashierSession(order)
  return apiSuccess({ orderId, orderNumber, total, paymentUrl: kashierResponse.redirectUrl }, 201)
}
```

**التحديات:**
- يحتاج حساب Kashier sandbox/test
- يحتاج فهم Kashier API documentation
- يحتاج webhook signature verification
- يحتاج اختبار End-to-End مع بوابة الدفع

**المتغيرات البيئية المطلوبة:**
```env
KASHIER_MERCHANT_ID=MID-xxx
KASHIER_API_KEY=xxx
KASHIER_API_SECRET=xxx
KASHIER_MODE=test   # test | live
```

---

### المهمة 7: تحسينات Clerk Webhook 🟢

**الأولوية**: منخفضة (يعمل حالياً)
**الملف**: `src/app/api/webhooks/clerk/route.ts`
**التعقيد**: ⭐ سهل

**التحسينات المقترحة:**
1. ✅ ~~Error handling~~ — موجود بالفعل
2. ✅ ~~Handle user without email~~ — يرجع 400 إذا مفيش email
3. 🟡 إضافة logging أفضل (مش مجرد `console.error`)
4. 🟡 إضافة `avatar_url` من Clerk data عند `user.created` و `user.updated`
5. 🟡 إضافة retry logic عند فشل DB operation

---

### المهمة 8: Rate Limiting 🟢

**الأولوية**: منخفضة (حماية — مش blocking)
**التعقيد**: ⭐⭐ متوسط

**الخيارات:**
1. **Vercel Edge Config + KV** — الأسهل على Vercel
2. **upstash/ratelimit** — مكتبة جاهزة مع Redis
3. **بسيط في Memory** — يعمل لكن مش scalable

**الـ Endpoints اللي تحتاج rate limiting:**
- `POST /api/stores` — منع spam إنشاء متاجر
- `POST /api/checkout` — منع spam طلبات
- `POST /api/coupons/validate` — منع brute force للكوبونات
- `POST /api/webhooks/clerk` — عنده حماية بالـ signature أصلاً

---

## 5. خريطة التبعيات مع Dev 2 و Dev 3

### ما يحتاجه Dev 2 من Dev 1

```
Dev 2 (Dashboard) يعتمد على:
┌──────────────────────────────────────────────────────┐
│ ✅ verifyStoreOwnership()         ← جاهز             │
│ ✅ apiSuccess() / apiError()      ← جاهز             │
│ ✅ middleware (x-store-slug)      ← جاهز             │
│ ✅ Zod schemas                    ← جاهز             │
│ ✅ uploadImage() / deleteImage()  ← جاهز             │
│ ✅ getCurrentStore()              ← جاهز             │
│                                                       │
│ 🔴 Onboarding يعمل ← لازم يتربط علشان               │
│    Dev 2 يقدر ينشئ متجر ويختبر الداشبورد              │
└──────────────────────────────────────────────────────┘
```

**الخلاصة**: Dev 2 **جاهز يشتغل** ← فاضل بس المهمة 1 (Onboarding) علشان ينشئ متجر تجريبي.

### ما يحتاجه Dev 3 من Dev 1

```
Dev 3 (Storefront) يعتمد على:
┌──────────────────────────────────────────────────────┐
│ ✅ middleware rewrite (/ → /store)  ← جاهز           │
│ ✅ getCurrentStore()                ← جاهز           │
│ ✅ StoreProvider / useStore()       ← جاهز           │
│ ✅ POST /api/checkout               ← جاهز (COD)     │
│ ✅ POST /api/coupons/validate       ← جاهز           │
│ ✅ POST /api/shipping/calculate     ← جاهز           │
│                                                       │
│ 🔴 Onboarding يعمل ← لازم ينشئ متجر                 │
│ 🟡 Kashier ← عشان يدعم "الدفع الإلكتروني"            │
│    (ممكن يشتغل بـ COD الأول)                          │
└──────────────────────────────────────────────────────┘
```

**الخلاصة**: Dev 3 **جاهز يشتغل** ← Checkout بالـ COD جاهز. Kashier مش blocking — ممكن يتأجل.

### ما يحتاجه Dev 1 من Dev 2

```
Dev 1 يحتاج من Dev 2:
┌──────────────────────────────────────────────────────┐
│ 🔵 لا شيء blocking!                                 │
│                                                       │
│ 🟢 Dashboard APIs (products, orders, etc.)           │
│    Dev 2 هو اللي بيبنيها — Dev 1 مش مسؤول عنها      │
│    لكن Dev 1 بنى الـ auth helpers اللي Dev 2         │
│    بيستخدمها                                          │
└──────────────────────────────────────────────────────┘
```

### ما يحتاجه Dev 1 من Dev 3

```
Dev 1 يحتاج من Dev 3:
┌──────────────────────────────────────────────────────┐
│ 🔵 لا شيء blocking!                                 │
│                                                       │
│ 🟢 Checkout UI ← Dev 3 يبنيها ويتصل بالـ API        │
│    الـ API جاهز — Dev 3 بس يستخدمه                   │
└──────────────────────────────────────────────────────┘
```

### رسم بياني للتبعيات

```
                    ┌───────────┐
            ┌──────→│   Dev 1   │◄──────┐
            │       │ (APIs +   │       │
            │       │ Auth +    │       │
            │       │ Infra)    │       │
            │       └─────┬─────┘       │
            │             │             │
     يعتمد على      يوفّر لـ      يوفّر لـ
            │        ┌────┴────┐        │
            │        │         │        │
       ┌────┴───┐  ┌─▼──┐  ┌──▼──┐ ┌───┴────┐
       │ Clerk  │  │Dev2│  │Dev3 │ │Kashier │
       │Supabase│  │    │  │     │ │(خارجي) │
       │  (3rd) │  └────┘  └─────┘ └────────┘
```

---

## 6. تحليل الصعوبات والمخاطر

### ⭐ سهل — ممكن يتنفذ بسرعة

| المهمة | السبب |
|--------|-------|
| إصلاح الثغرات الأمنية (M1-M6) | تغييرات ميكانيكية — إضافة `storeId` في WHERE |
| ربط Onboarding بـ API | الـ API جاهز + الواجهة جاهزة — محتاج ربط فقط |
| Super Admin Overview | API جاهز — محتاج data fetching فقط |
| Super Admin Merchants | نفس النمط — data fetch + عرض |
| تحسينات Webhook | تعديلات بسيطة على كود موجود |

### ⭐⭐ متوسط — يحتاج وقت ومجهود

| المهمة | السبب |
|--------|-------|
| Super Admin Stores | يحتاج search/filter/pagination + toggle actions |
| Super Admin Plans | يحتاج CRUD كامل بـ dialog forms |
| Rate Limiting | يحتاج اختيار solution + implementation |

### ⭐⭐⭐ صعب — يحتاج خبرة خاصة

| المهمة | السبب |
|--------|-------|
| Kashier Integration | خدمة خارجية + Webhook verification + Error handling + لازم حساب تجريبي |

### المخاطر الرئيسية

| المخاطر | الاحتمال | التأثير | الحل |
|---------|----------|---------|------|
| Kashier API documentation ناقصة أو متغيرة | متوسط | عالي | نبدأ بـ COD فقط ونأجل Kashier |
| Wildcard subdomain مش شغال محلياً | منخفض | عالي | hosts file + `.env.local` (موجود في الـ docs) |
| Clerk webhook يفشل في Production | منخفض | عالي | نختبر بـ ngrok أو Clerk CLI |
| Race conditions في checkout | منخفض | عالي | ✅ محلول — الـ checkout يستخدم DB transaction + atomic checks |
| Rate limit يمنع مستخدمين شرعيين | منخفض | متوسط | نبدأ بحدود سخية (100 req/min) |

---

## 7. المهارات المطلوبة

### مهارات أساسية (لازم تكون موجودة)

| المهارة | المستوى | مستخدمة في |
|---------|---------|-----------|
| TypeScript (strict mode) | متقدم | كل الكود |
| Next.js 15 App Router | متقدم | middleware, API routes, server components |
| Drizzle ORM | متوسط | كل database queries |
| Zod v4 | متوسط | كل validation |
| Clerk Auth | متوسط | webhook, middleware, auth helpers |

### مهارات إضافية (مفيدة)

| المهارة | المستوى | مستخدمة في |
|---------|---------|-----------|
| Tailwind CSS v4 | أساسي | Super Admin pages |
| React Server Components | متوسط | Super Admin pages |
| Payment Gateway APIs | متوسط | Kashier integration |
| Webhook Security | متوسط | Clerk + Kashier webhooks |
| Rate Limiting patterns | أساسي | حماية APIs |

### مهارات **مش مطلوبة** لـ Dev 1

- ❌ Zustand (ده شغل Dev 3 — cart store)
- ❌ Complex UI / animations / drag-and-drop (ده شغل Dev 2)
- ❌ SEO optimization (ده شغل Dev 3)
- ❌ Supabase Storage بشكل مباشر (helper جاهز)

---

## 8. تقييم القدرة على التنفيذ بالـ AI

### ✅ يقدر الـ AI ينفذه بالكامل

| المهمة | ثقة التنفيذ | ملاحظات |
|--------|------------|--------|
| إصلاح الثغرات الأمنية (M1-M6) | 🟢 100% | تغييرات ميكانيكية — pattern واحد يتكرر |
| ربط Onboarding بـ API | 🟢 100% | كود بسيط — fetch + redirect + error handling |
| Super Admin Overview | 🟢 100% | Server Component + Drizzle queries |
| Super Admin Stores | 🟢 95% | Client Component + API calls + table + search |
| Super Admin Merchants | 🟢 100% | مشابه للـ Stores لكن أبسط |
| Super Admin Plans CRUD | 🟢 95% | APIs جاهزة + Dialog forms |
| تحسينات Webhook | 🟢 100% | تعديلات بسيطة |
| Rate Limiting (basic) | 🟢 90% | مكتبة جاهزة أو in-memory |

### ⚠️ يقدر الـ AI ينفذه جزئياً

| المهمة | ثقة التنفيذ | ما يقدر عليه | ما لا يقدر عليه |
|--------|------------|-------------|-----------------|
| Kashier Integration | 🟡 70% | كتابة الكود الكامل بناءً على الـ docs | **اختبار حقيقي** مع Kashier sandbox — يحتاج credentials حقيقية + تجربة |

### ❌ لا يقدر الـ AI ينفذه

| المهمة | السبب |
|--------|-------|
| إنشاء حساب Clerk / Supabase / Kashier | يحتاج تسجيل دخول فعلي على مواقع خارجية |
| إعداد DNS / hosts file | يحتاج صلاحيات admin على الجهاز |
| اختبار Webhook E2E | يحتاج ngrok أو أداة tunneling |
| Deployment على Vercel | يحتاج حساب Vercel + ربط GitHub |

---

## 9. الجدول الزمني المقترح

### الأسبوع 1 — الأمان والأساسيات (Blockers أولاً)

```
يوم 1: 🔴🔒 المهمة 0 — إصلاح الثغرات الأمنية
  ├── M1: إضافة storeId في 13 موقع UPDATE/DELETE
  ├── M2+M3: إصلاح cross-table lookups
  ├── M4+M5: إضافة Zod schemas ناقصة
  ├── M6: تأمين verifyStoreOwnership() fallback
  └── اختبار: تأكد كل mutation فيها double protection

يوم 2: 🔴 المهمة 1 — ربط Onboarding بـ API
  ├── تحديث onboarding/page.tsx
  ├── ربط بـ POST /api/stores
  ├── Error handling + loading state
  ├── Redirect لـ subdomain.matjary.com/dashboard
  └── اختبار: تسجيل → إنشاء متجر → redirect

يوم 3: 🔴 المهمة 2 — Super Admin Overview (بيانات حقيقية)
  ├── تحويل لـ Server Component + Drizzle queries
  ├── Stat cards ديناميكية
  ├── آخر المتاجر + سجل النشاط
  └── اختبار: matjary.local:3000/super-admin

يوم 4: 🔴 المهمة 3 — Super Admin Stores (جدول حقيقي)
  ├── Client Component + API calls
  ├── جدول مع بحث + فلترة (حسب الخطة والحالة)
  ├── Toggle تفعيل/إلغاء
  ├── Pagination
  └── اختبار: عرض وتعديل حالة متجر
```

**🎯 نهاية الأسبوع 1:** الأمان مُحكم + Dev 2 و Dev 3 يقدروا يبدأوا شغلهم.

### الأسبوع 2 — التحسينات

```
يوم 5: 🟡 المهمة 4 — Super Admin Merchants
  ├── جدول التجار + بحث
  └── اختبار

يوم 6: 🟡 المهمة 5 — Super Admin Plans CRUD
  ├── عرض الخطط ديناميكياً
  ├── Dialog لإضافة/تعديل خطة
  ├── حذف خطة
  └── اختبار كامل

يوم 7: 🟢 المهمة 7 — تحسينات Webhook
  ├── إضافة avatar_url
  ├── تحسين logging
  └── Activity log لكل عملية
```

### الأسبوع 3 — Kashier + Polish

```
يوم 8-10: 🟡 المهمة 6 — Kashier Integration
  ├── دراسة Kashier API docs
  ├── إنشاء /api/payments/kashier/create
  ├── إنشاء /api/payments/kashier/webhook
  ├── تعديل /api/checkout لدعم Kashier
  ├── اختبار مع sandbox
  └── ربط مع Dev 3 (checkout UI)

يوم 11: 🟢 المهمة 8 — Rate Limiting (اختياري)
  ├── تثبيت @upstash/ratelimit أو حل بديل
  ├── تطبيق على endpoints الحساسة
  └── اختبار

يوم 12: مراجعة شاملة + Bug fixes
```

---

## 10. ملاحظات التكامل لـ Dev 2 و Dev 3

### رسالة لـ Dev 2 (Dashboard)

> **كل الـ Auth helpers جاهزة** — استخدم `verifyStoreOwnership()` في كل API route.
>
> **Pattern لكل Dashboard API route:**
> ```typescript
> import { verifyStoreOwnership } from '@/lib/api/auth'
> import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'
>
> export async function GET() {
>   try {
>     const { merchant, store } = await verifyStoreOwnership()
>     if (!merchant) return ApiErrors.unauthorized()
>     if (!store) return ApiErrors.storeNotFound()
>
>     // ... your logic with store.id
>     return apiSuccess(data)
>   } catch (error) {
>     console.error('Error:', error)
>     return ApiErrors.internal()
>   }
> }
> ```
>
> **الـ Validations جاهزة في `src/lib/validations/`** — استخدمها بدل ما تنشئ schemas جديدة.
>
> **رفع الصور**: استخدم `uploadImage(store.id, folder, file)` من `@/lib/supabase/storage`.

### رسالة لـ Dev 3 (Storefront)

> **الـ Checkout API جاهز** — `POST /api/checkout` شغال بالكامل مع COD.
>
> **Kashier هيتضاف لاحقاً** — ابدأ بدعم COD فقط. لما Kashier يكون جاهز، الـ API هيرجع `paymentUrl` وأنت هتعمل `window.location.href = paymentUrl`.
>
> **كوبونات وشحن**: استخدم:
> - `POST /api/coupons/validate` — body: `{ storeId, code, subtotal }`
> - `POST /api/shipping/calculate` — body: `{ storeId, governorate }`
>
> **getCurrentStore()** في Server Components بيرجع بيانات المتجر (theme, settings, etc.) — استخدمها لتطبيق ألوان المتجر.

---

## 11. قائمة المراجعة النهائية

### 🔒 قبل تسليم أي مهمة — مراجعة أمنية:

- [x] كل SELECT query فيه `storeId` filter (ما عدا merchants + platform_plans)
- [x] كل UPDATE query فيه `and(eq(id), eq(storeId))` — ليس `eq(id)` فقط!
- [x] كل DELETE query فيه `and(eq(id), eq(storeId))` — ليس `eq(id)` فقط!
- [x] كل cross-table lookup (JOIN / sub-query) فيه `storeId`
- [x] `verifyStoreOwnership()` في كل dashboard API route
- [x] `isSuperAdmin()` في كل admin API route
- [x] لا يوجد endpoint يرجع بيانات بدون auth + storeId check
- [x] `deleteImage()` يتحقق من storeId في path
- [x] لا يوجد error response يسرّب stack trace أو internal data

### قبل تسليم أي مهمة — جودة الكود:

- [x] لا يوجد `any` في الكود ← **مُثبَّت بالبحث 27/02/2026**
- [x] Zod v4 validation لكل input — مع `{ error: '...' }` مش `'...'`
- [x] رسائل الأخطاء بالعربية
- [x] Error handling (try/catch) في كل API route
- [x] `apiSuccess()` / `apiError()` / `ApiErrors.*` فقط — لا `NextResponse.json()` مباشرة
- [x] `@/` imports — لا relative paths ← **مُصلَح 27/02/2026**
- [x] Server Components أولاً — `'use client'` فقط عند الحاجة
- [ ] Tailwind v4 classes (`shadow-xs` مش `shadow-sm`, `rounded-xs` مش `rounded-sm` إلخ) ← يحتاج مراجعة
- [ ] RTL-first (`ps-`, `pe-`, `ms-`, `me-`) ← يحتاج مراجعة
- [x] `npx tsc --noEmit` يمر بنجاح (0 errors) ← **Exit code: 0 — 27/02/2026**

---

## ملخص تنفيذي

```
┌─────────────────────────────────────────────────────────┐
│                    خلاصة Dev 1 Plan                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 إجمالي المهام: 9 مهام (+ 1 أمنية عاجلة)            │
│  ✅ مكتمل بالفعل: ~70% من البنية التحتية                │
│  🔒 ثغرات حرجة: 0 | متوسطة: 6 | تحسينات: 7            │
│  🔴 Blockers: مهمتان (أمنية + Onboarding)               │
│  ⭐ سهل: 6 مهام                                         │
│  ⭐⭐ متوسط: 2 مهمة                                     │
│  ⭐⭐⭐ صعب: 1 مهمة (Kashier)                            │
│                                                          │
│  🤖 AI يقدر ينفذ: ~92% من المهام                        │
│  👨‍💻 يحتاج بشري: إعداد حسابات خارجية + اختبار E2E      │
│                                                          │
│  ⏰ الزمن المتوقع: 2-3 أسابيع                           │
│  🎯 الأولوية القصوى 1: المهمة 0 (أمان) ← Day 1         │
│  🎯 الأولوية القصوى 2: المهمة 1 (Onboarding) ← Day 2   │
│                                                          │
│  ✅ Dev 2 جاهز يشتغل بعد المهمة 0 + 1                   │
│  ✅ Dev 3 جاهز يشتغل بعد المهمة 0 + 1 (COD أولاً)      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

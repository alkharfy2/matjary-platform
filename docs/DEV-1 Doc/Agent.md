# Agent Memory — ملف الذاكرة

> هذا الملف يُحدّث تلقائياً بعد كل تعديل أو إنشاء ملف.  
> **قبل أي عمل**: اقرأ القسم المتعلق بالمهمة الحالية.  
> **بعد كل عمل**: حدّث هذا الملف.

---

## الحالة العامة

| البند | القيمة |
|-------|--------|
| المهمة الحالية | **نظام المحفظة ورسوم الطلبات (Wallet & Order Fee) — ✅ مكتمل** |
| تاريخ البدء | 21 فبراير 2026 |
| آخر تحديث | 7 مارس 2026 |
| الخطة المرجعية | `docs/dev1-plan.md` + `docs/plan-subscription-payment.md` + `docs/plan-wallet-order-fee.md` |
| ✅ آخر إصلاح | Wallet & Order Fee System — خطوة كاملة (13 ملف) |
| ✅ الحالة السابقة | كل شيء شغال — DB متصل، APIs تعمل، بوابة الدفع جاهزة |
| ✅ المهمة المنجزة | Wallet & Order Fee System — مكتملة بالكامل |

---

## القواعد الحرجة (اقرأها قبل أي كود)

1. **كل query لازم يكون فيه `storeId`** — ما عدا `merchants` + `platform_plans` + `platform_activity_log`
2. **TypeScript strict — لا `any` أبداً**
3. **Zod v4** — استخدم `{ error: '...' }` مش `'...'` و `z.email()` مش `z.string().email()`
4. **رسائل الأخطاء بالعربية**
5. **`apiSuccess()` / `apiError()` / `ApiErrors.*`** — لا `NextResponse.json()` مباشرة
6. **`@/` imports** — لا relative paths
7. **Server Components أولاً** — `'use client'` فقط عند الحاجة
8. **Tailwind v4** classes: `shadow-xs` مش `shadow-sm`, `rounded-xs` مش `rounded-sm`
9. **RTL-first**: `ps-4 pe-2 ms-auto text-start` مش `pl-4 pr-2 ml-auto text-left`
10. **Defense-in-Depth**: كل UPDATE/DELETE لازم يكون فيه `and(eq(table.id, id), eq(table.storeId, store.id))`

---

## المهام المنجزة

### Task 0: إصلاح الثغرات الأمنية 🔒 ✅ (21/02/2026)

**M1 — إضافة storeId في UPDATE/DELETE (13 موقع)**: تم إضافة `and(eq(table.id, id), eq(table.storeId, store.id))` في كل UPDATE/DELETE عبر 8 ملفات.

**M2 — جلب طلبات العميل بدون storeId**: تم إضافة `eq(storeOrders.storeId, store.id)` في `customers/[id]/route.ts` GET.

**M3 — جلب بيانات العميل من الطلب بدون storeId**: تم إضافة `eq(storeCustomers.storeId, store.id)` في `orders/[id]/route.ts` GET.

**M4 — لا يوجد Zod validation على تعديل العميل**: تم إنشاء `src/lib/validations/customer.ts` مع `updateCustomerSchema` واستخدامه في `customers/[id]/route.ts`.

**M5 — لا يوجد Zod validation على PATCH متجر في Admin**: تم إضافة `updateAdminStoreSchema` في `src/lib/validations/store.ts` واستخدامه في `admin/stores/[id]/route.ts`.

**M6 — verifyStoreOwnership() fallback غير محدد**: تم إزالة الـ fallback — لو مفيش `x-store-slug` header يرجع `{ merchant, store: null }` بدل ما يجيب أول متجر.

### Task 1: ربط Onboarding بـ API حقيقي ✅ (21/02/2026)

- استبدال `alert()` بـ `fetch('/api/stores', { method: 'POST' })`
- إضافة `isSubmitting` + `errorMessage` states
- عند النجاح: redirect لـ `{slug}.{rootDomain}/dashboard`
- عند الفشل: عرض رسالة الخطأ بالعربية
- disabled state على الأزرار أثناء الإرسال

### Task 2: Super Admin Overview — بيانات حقيقية ✅ (21/02/2026)

- تحويل من صفحة static بأصفار إلى **async Server Component** بـ queries حقيقية
- 4 stat cards: إجمالي المتاجر، المتاجر النشطة، التجار، إجمالي الإيراد
- توزيع المتاجر حسب الخطة (free/basic/pro)
- آخر 10 متاجر مع اسم التاجر والإيميل
- آخر 20 نشاط من `platformActivityLog`
- استخدام `formatPrice` و `formatDate` و `formatRelativeTime`

### Task 3: Super Admin Stores — بيانات حقيقية ✅ (21/02/2026)

- Client Component مع بحث بالاسم + فلترة بالحالة + فلترة بالخطة
- جدول: اسم المتجر/slug، التاجر، الخطة (badge)، الحالة (badge)، التاريخ
- زر تفعيل/تعطيل يستدعي `PATCH /api/admin/stores/[id]`
- Pagination كاملة

### Task 4: Super Admin Merchants — بيانات حقيقية ✅ (21/02/2026)

- Client Component مع بحث بالإيميل
- جدول: الاسم/الهاتف، الإيميل، المتجر/slug، الخطة، التاريخ
- Pagination كاملة

### Task 5: Super Admin Plans — CRUD كامل ✅ (21/02/2026)

- Client Component يجلب الخطط من `GET /api/admin/plans`
- عرض كـ cards مع: الاسم، السعر، الحدود، المميزات، حالة النشاط
- إضافة خطة جديدة عبر dialog → `POST /api/admin/plans`
- تعديل خطة عبر dialog → `PUT /api/admin/plans/[id]`
- حذف خطة مع تأكيد → `DELETE /api/admin/plans/[id]`
- المميزات: textarea بسطر لكل ميزة → يتحول لـ array
- Error handling + loading states + Arabic messages

### Task 6: Kashier Payment Integration ✅ (22/02/2026)

**6أ. Helper Library — `src/lib/payments/kashier.ts`:**
- `createKashierSession()` — ينشئ جلسة دفع عبر Kashier Payment Sessions API v3
- يرسل POST لـ `{test-api|api}.kashier.io/v3/payment/sessions` مع headers (Authorization + api-key)
- يرجع `{ sessionId, redirectUrl }` — الرابط لصفحة الدفع
- يحفظ `kashierOrderId` على الطلب في DB
- `verifyKashierSignature()` — HMAC-SHA256 verification للـ webhook
- Hash string: `merchantOrderId + orderId + amount + currency + paymentStatus`
- يستخدم `crypto.timingSafeEqual` لمنع timing attacks
- `getConfig()` — يجلب env vars مع validation

**6ب. Create Payment Route — `src/app/api/payments/kashier/create/route.ts`:**
- POST endpoint لإنشاء جلسة دفع لطلب موجود (retry)
- Zod validation على orderId
- يتحقق: طريقة الدفع kashier، لم يُدفع بعد
- يجلب عملة المتجر من settings
- يستدعي `createKashierSession()`
- يحدث paymentStatus → 'awaiting_payment'

**6ج. Webhook Route — `src/app/api/payments/kashier/webhook/route.ts`:**
- POST endpoint يستقبل إشعارات من خوادم Kashier
- التحقق من التوقيع (signature verification)
- التحقق من تطابق المبلغ (defense-in-depth)
- تجنب المعالجة المكررة (idempotent)
- SUCCESS → paymentStatus='paid' + paidAt=now() + kashierPaymentId
- FAILED → paymentStatus='failed' + kashierPaymentId
- PENDING → لا تغيير
- Logging مفصل لكل حالة

**6د. تعديل Checkout — `src/app/api/checkout/route.ts`:**
- إضافة import لـ `createKashierSession`
- عند `paymentMethod === 'kashier'`: يستدعي `createKashierSession()` بعد إنشاء الطلب
- يرجع `paymentUrl` في الـ response
- لو فشل Kashier: يرجع الطلب بدون paymentUrl مع رسالة خطأ (الطلب محفوظ — العميل يمكنه إعادة المحاولة)

**المتغيرات البيئية المطلوبة:**
```
KASHIER_MERCHANT_ID=MID-xxx
KASHIER_API_KEY=xxx
KASHIER_API_SECRET=xxx
KASHIER_MODE=test
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Task 7: تحسينات Clerk Webhook ✅ (22/02/2026)

- **Structured Logging**: JSON-based لوجينج مع `source`, `timestamp`, `message` + بيانات إضافية
- **avatar_url**: إضافة `image_url` من Clerk data لـ `avatarUrl` في `user.created` و `user.updated`
- **Retry Logic**: `withRetry()` مع exponential backoff (100ms, 200ms, 400ms) لكل عمليات DB
- لوجينج لكل حدث: created/updated/deleted/skipped/retry/failed

### Task 8: Rate Limiting ✅ (22/02/2026)

**ملف جديد: `src/lib/api/rate-limit.ts`**
- Sliding Window Counter algorithm في الذاكرة (In-Memory)
- `rateLimit(identifier, config)` → `{ allowed, remaining, resetAt }`
- `getClientIp(request)` — يدعم Vercel, Cloudflare, nginx proxies
- تنظيف دوري للمدخلات المنتهية (كل 5 دقائق)

**الـ Endpoints المحمية:**
- `POST /api/stores` — 5 طلبات / ساعة
- `POST /api/checkout` — 20 طلب / دقيقة
- `POST /api/coupons/validate` — 30 طلب / دقيقة

**ملاحظة**: للـ production مع عدة instances — استبدل بـ Upstash Redis أو Vercel KV

### تحسينات L1–L7 (أولوية منخفضة) ✅ (22/02/2026)

**L1 — `resolveStore()` لا يفلتر بـ `isActive`:**
- إضافة `options.activeOnly` parameter اختياري
- عند `activeOnly: true` → يضيف `eq(stores.isActive, true)` للـ WHERE
- Default false للحفاظ على التوافقية (storefront layout يعرض "المتجر موقوف" للمتاجر المعطّلة)

**L2 — لا Zod على date parameters في analytics:**
- إضافة `analyticsQuerySchema` مع `z.coerce.date().optional()` لـ `from` و `to`
- إرجاع خطأ 422 عند تاريخ غير صالح بدل تمرير `Invalid Date`

**L3 — `deleteImage()` بدون تحقق storeId:**
- إضافة `storeId` parameter اختياري
- التحقق `path.startsWith(storeId/)` — يمنع حذف ملفات متجر آخر
- Defense-in-depth: يرمي خطأ إذا المسار لا ينتمي للمتجر

**L4 — لا Zod على query params في Admin GET:**
- `adminStoresQuerySchema`: search (max 100), status (enum), plan (max 50), page (min 1), limit (1-50)
- `adminMerchantsQuerySchema`: search (max 100), page (min 1), limit (1-50)
- إرجاع خطأ 422 عند معاملات غير صالحة

**L5 — Admin DELETE plan بدون تحقق وجود:**
- إضافة `.returning()` والتحقق من `deleted[0]`
- إرجاع 404 إذا الخطة غير موجودة

**L6 — Upload route بـ validation يدوي:**
- إنشاء `uploadMetaSchema` مع `z.enum()` للـ folder
- استبدال `includes()` اليدوي بـ `safeParse()`

**L7 — `isSuperAdmin()` يدعم admin واحد فقط:**
- تعديل ليدعم عدة admins عبر `SUPER_ADMIN_CLERK_ID` مفصولة بفاصلة
- مثال: `SUPER_ADMIN_CLERK_ID=user_abc,user_xyz`
- يستخدم `.split(',').map(trim).filter(Boolean).includes(userId)`

---

## المهام قيد التنفيذ

لا توجد مهام قيد التنفيذ حالياً — كل المهام المخططة مكتملة ✅

---

## Task 9: نظام المحفظة ورسوم الطلبات ✅ (07/03/2026)

**المرجع**: `docs/plan-wallet-order-fee.md`

**الفكرة**: التاجر يشحن رصيداً عبر Kashier. عند فتح تفاصيل أي طلب للمرة الأولى، يُخصم `orderFee` (يحدده السوبر آدمن في `platform_plans`) من الرصيد ذرياً. لو الرصيد أقل من الرسوم → تفاصيل الطلب تظهر مضبّبة مع دعوة لشحن المحفظة.

**الملفات المعدّلة:**
| # | الملف | التعديل |
|---|-------|--------|
| 1 | `src/db/schema.ts` | إضافة `balance` على merchants + `isFeeDeducted` على storeOrders + جدول `merchantWalletTransactions` + Relations |
| 2 | `src/lib/payments/kashier.ts` | إضافة `createWalletSession()` helper |
| 3 | `src/app/api/dashboard/wallet/route.ts` | إضافة `storeId` في الـ response |
| 4 | `src/app/api/dashboard/orders/[id]/route.ts` | Blur logic + atomic fee deduction |
| 5 | `src/app/(dashboard)/dashboard/orders/[id]/page.tsx` | Blur overlay UI + `blurred`/`orderFee`/`currentBalance` في Order type |
| 6 | `src/app/(dashboard)/layout.tsx` | إضافة "المحفظة 💰" في sidebar بعد "الطلبات" |

**الملفات الجديدة:**
| # | الملف | الغرض |
|---|-------|-------|
| 1 | `migrations/add_wallet_system.sql` | Migration SQL: balance + is_fee_deducted + merchant_wallet_transactions |
| 2 | `src/lib/validations/wallet.ts` | Zod schemas: `createWalletSessionSchema` + `walletStatusQuerySchema` |
| 3 | `src/app/api/payments/wallet/create/route.ts` | POST — إنشاء جلسة Kashier للشحن (rate limited 10/hour) |
| 4 | `src/app/api/payments/wallet/webhook/route.ts` | POST — استقبال Kashier webhook + atomic balance update + idempotency |
| 5 | `src/app/api/payments/wallet/status/route.ts` | GET — polling endpoint للـ wallet-result page |
| 6 | `src/app/api/dashboard/wallet/route.ts` | GET — balance + orderFee + آخر 50 معاملة |
| 7 | `src/app/(dashboard)/dashboard/wallet/page.tsx` | صفحة المحفظة: رصيد + شحن + سجل المعاملات |
| 8 | `src/app/(platform)/wallet-result/page.tsx` | صفحة نتيجة شحن المحفظة + polling |

**النقاط التقنية الحرجة:**
- `db.transaction()` + `.for('update')` → row-level lock يمنع race conditions في خصم الرسوم
- إعادة تحقق من `currentBalance >= orderFee` داخل الـ tx بعد الـ lock
- Idempotency في webhook: التحقق من `reference` (kashier orderId) قبل المعالجة
- `merchantOrderId` للمحفظة: `wallet_<merchantId>_<timestamp>` (بخلاف `sub_` للاشتراك)
- `blurred: true` يُرجع فقط: id, orderNumber, orderStatus, paymentStatus, total, createdAt, orderFee, currentBalance
- `blurred: false` يُرجع كل البيانات بما فيها customer + shippingAddress + items

---

**المرجع**: `docs/plan-subscription-payment.md`

تم تنفيذ بوابة دفع اشتراك الخطة بالكامل — 12 خطوة:

**ملفات تم تعديلها:**
| # | الملف | التعديل |
|---|-------|--------|
| 1 | `src/db/schema.ts` | إضافة `isPaid` + `subscriptionAmount` + `subscriptionPaidAt` + `subscriptionTransactionId` على stores |
| 2 | `src/app/api/stores/route.ts` | تعيين `isPaid` حسب نوع الخطة عند الإنشاء (free=true, paid=false) |
| 3 | `src/lib/tenant/resolve-store.ts` | إرجاع `isPaid` في `ResolvedStore` type + select |
| 4 | `src/app/store/layout.tsx` | إضافة check لـ `isPaid` + جلب بيانات الخطة → عرض `StorePaymentGate` |
| 5 | `src/lib/payments/kashier.ts` | إضافة `createSubscriptionSession()` helper |
| 6 | `src/app/(dashboard)/layout.tsx` | بانر تذكيري لما `isPaid = false` |
| 7 | `src/lib/queries/storefront.ts` | إضافة check على `isPaid` في `getStorefrontData()` (defense-in-depth) |
| 8 | `src/app/api/admin/stores/[id]/route.ts` | إضافة `isPaid` toggle + مزامنة مع تغيير الخطة |
| 9 | `src/lib/validations/store.ts` | إضافة `isPaid` لـ `updateAdminStoreSchema` |

**ملفات جديدة:**
| # | الملف | الغرض |
|---|-------|-------|
| 1 | `src/app/store/_components/store-payment-gate.tsx` | `'use client'` — صفحة "ادفع الأول" بدل الموقع |
| 2 | `src/app/api/payments/subscription/create/route.ts` | إنشاء جلسة Kashier لدفع الاشتراك |
| 3 | `src/app/api/payments/subscription/webhook/route.ts` | استقبال إشعار Kashier + تحديث `is_paid` |
| 4 | `src/app/api/payments/subscription/status/route.ts` | Polling endpoint لصفحة النتيجة |
| 5 | `src/app/(platform)/subscription-result/page.tsx` | `'use client'` — صفحة نتيجة الدفع + polling |
| 6 | `src/lib/validations/subscription.ts` | Zod schema: `createSubscriptionSchema` |
| 7 | `migrations/add_is_paid_to_stores.sql` | Migration SQL |
| 8 | `src/app/(dashboard)/subscription-banner.tsx` | `'use client'` — بانر تذكيري في Dashboard |

### Task 0: إصلاح الثغرات الأمنية 🔒

**المرجع**: `docs/dev1-plan.md` → Section 3 + المهمة 0

#### M1: إضافة storeId في UPDATE/DELETE (13 موقع)

| # | الملف | العملية | الحالة |
|---|-------|---------|--------|
| 1 | `src/app/api/dashboard/products/[id]/route.ts` | UPDATE + DELETE | ✅ |
| 2 | `src/app/api/dashboard/categories/[id]/route.ts` | UPDATE + DELETE | ✅ |
| 3 | `src/app/api/dashboard/coupons/[id]/route.ts` | UPDATE + DELETE | ✅ |
| 4 | `src/app/api/dashboard/shipping/[id]/route.ts` | UPDATE + DELETE | ✅ |
| 5 | `src/app/api/dashboard/pages/[id]/route.ts` | UPDATE + DELETE | ✅ |
| 6 | `src/app/api/dashboard/design/hero-slides/[id]/route.ts` | DELETE | ✅ |
| 7 | `src/app/api/dashboard/customers/[id]/route.ts` | UPDATE | ✅ |
| 8 | `src/app/api/dashboard/orders/[id]/status/route.ts` | UPDATE | ✅ |

#### M2: جلب طلبات العميل بدون storeId
- **الملف**: `src/app/api/dashboard/customers/[id]/route.ts`
- **الحالة**: ✅

#### M3: جلب بيانات العميل من الطلب بدون storeId
- **الملف**: `src/app/api/dashboard/orders/[id]/route.ts`
- **الحالة**: ✅

#### M4: لا يوجد Zod validation على تعديل العميل
- **الملف**: `src/app/api/dashboard/customers/[id]/route.ts`
- **إنشاء**: `src/lib/validations/customer.ts`
- **الحالة**: ✅

#### M5: لا يوجد Zod validation على PATCH متجر في Admin
- **الملف**: `src/app/api/admin/stores/[id]/route.ts`
- **تعديل**: `src/lib/validations/store.ts`
- **الحالة**: ✅

#### M6: verifyStoreOwnership() fallback غير محدد
- **الملف**: `src/lib/api/auth.ts`
- **الحالة**: ✅

---

## المهام القادمة

| # | المهمة | الأولوية | الحالة |
|---|--------|----------|--------|
| 2 | Super Admin Overview — بيانات حقيقية | 🔴 عالية | ✅ |
| 3 | Super Admin Stores — بيانات حقيقية | 🔴 عالية | ✅ |
| 4 | Super Admin Merchants — بيانات حقيقية | 🟡 متوسطة | ✅ |
| 5 | Super Admin Plans — بيانات حقيقية + CRUD | 🟡 متوسطة | ✅ |
| 6 | Kashier Payment Integration | 🟡 متوسطة | ✅ |
| 7 | تحسينات Clerk Webhook | 🟢 منخفضة | ✅ |
| 8 | Rate Limiting | 🟢 منخفضة | ✅ |

---

## الملفات المعدّلة

| التاريخ | الملف | نوع التعديل | المهمة |
|---------|-------|------------|--------|
| 21/02/2026 | `src/app/api/dashboard/products/[id]/route.ts` | أمان: storeId في UPDATE+DELETE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/dashboard/categories/[id]/route.ts` | أمان: storeId في UPDATE+DELETE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/dashboard/coupons/[id]/route.ts` | أمان: storeId في UPDATE+DELETE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/dashboard/shipping/[id]/route.ts` | أمان: storeId في UPDATE+DELETE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/dashboard/pages/[id]/route.ts` | أمان: storeId في UPDATE+DELETE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/dashboard/design/hero-slides/[id]/route.ts` | أمان: storeId في DELETE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/dashboard/customers/[id]/route.ts` | أمان: storeId + M2 + M4 Zod | Task 0 - M1,M2,M4 |
| 21/02/2026 | `src/app/api/dashboard/orders/[id]/route.ts` | أمان: M3 storeId في customer lookup | Task 0 - M3 |
| 21/02/2026 | `src/app/api/dashboard/orders/[id]/status/route.ts` | أمان: storeId في UPDATE | Task 0 - M1 |
| 21/02/2026 | `src/app/api/admin/stores/[id]/route.ts` | M5: Zod validation | Task 0 - M5 |
| 21/02/2026 | `src/lib/api/auth.ts` | M6: إزالة fallback غير آمن | Task 0 - M6 |
| 21/02/2026 | `src/lib/validations/store.ts` | إضافة updateAdminStoreSchema | Task 0 - M5 |
| 21/02/2026 | `src/app/(platform)/onboarding/page.tsx` | ربط بـ API + error handling + redirect | Task 1 |
| 21/02/2026 | `src/app/(super-admin)/super-admin/page.tsx` | Server Component + DB queries حقيقية | Task 2 |
| 21/02/2026 | `src/app/(super-admin)/super-admin/stores/page.tsx` | Client Component + بحث/فلترة/toggle/pagination | Task 3 |
| 21/02/2026 | `src/app/(super-admin)/super-admin/merchants/page.tsx` | Client Component + بحث/pagination | Task 4 |
| 21/02/2026 | `src/app/(super-admin)/super-admin/plans/page.tsx` | Client Component + CRUD كامل عبر dialog | Task 5 |
| 25/02/2026 | `src/app/(super-admin)/super-admin/page.tsx` | إعادة كتابة: async Server Component + fetch analytics API | Task 2 (re-impl) |
| 25/02/2026 | `src/app/(super-admin)/super-admin/stores/page.tsx` | إعادة كتابة: Client + بحث/فلترة/toggle/pagination حقيقية | Task 3 (re-impl) |
| 25/02/2026 | `src/app/(super-admin)/super-admin/merchants/page.tsx` | إعادة كتابة: Client + بحث/pagination حقيقية | Task 4 (re-impl) |
| 25/02/2026 | `src/app/(super-admin)/super-admin/plans/page.tsx` | إعادة كتابة: Client + create/edit/delete dialogs | Task 5 (re-impl) |
| 25/02/2026 | `src/app/(super-admin)/layout.tsx` | استبدال nav ثابت بـ SuperAdminNav client component | Task 5 (re-impl) |
| 25/02/2026 | `src/app/(super-admin)/super-admin-nav.tsx` | **جديد** SuperAdminNav client component مع usePathname | Task 5 (re-impl) |
| 22/02/2026 | `src/app/api/checkout/route.ts` | ربط Kashier + import createKashierSession + rate limiting | Task 6 + Task 8 |
| 22/02/2026 | `src/app/api/webhooks/clerk/route.ts` | structured logging + avatar_url + retry logic | Task 7 |
| 22/02/2026 | `src/app/api/stores/route.ts` | إضافة rate limiting | Task 8 |
| 22/02/2026 | `src/app/api/stores/route.ts` | Lazy merchant creation — لو Clerk webhook فات، يخلق merchant من بيانات Clerk تلقائياً | Bug Fix |
| 22/02/2026 | `src/middleware.ts` | إصلاح: `/auth` routes على subdomain كانت تـrender محلياً → redirect للـ root domain | Bug Fix |
| 22/02/2026 | `src/middleware.ts` | إضافة redirect لـ `/sign-in` و `/sign-up` على subdomain → root domain (Clerk default paths) | Bug Fix |
| 22/02/2026 | `src/app/layout.tsx` | إضافة signInUrl + signUpUrl + fallbackRedirectUrl لـ ClerkProvider | Bug Fix |
| 22/02/2026 | `.env.local` | إضافة NEXT_PUBLIC_CLERK_SIGN_IN_URL + SIGN_UP_URL + AFTER_SIGN variants | Bug Fix |
| 22/02/2026 | `src/app/api/coupons/validate/route.ts` | إضافة rate limiting | Task 8 |
| 22/02/2026 | `src/lib/tenant/resolve-store.ts` | إضافة activeOnly option | L1 |
| 22/02/2026 | `src/app/api/dashboard/analytics/route.ts` | Zod validation على date params | L2 |
| 22/02/2026 | `src/lib/supabase/storage.ts` | deleteImage storeId check | L3 |
| 22/02/2026 | `src/app/api/admin/stores/route.ts` | Zod validation على query params | L4 |
| 22/02/2026 | `src/app/api/admin/merchants/route.ts` | Zod validation على query params | L4 |
| 22/02/2026 | `src/app/api/admin/plans/[id]/route.ts` | DELETE يتحقق من وجود الخطة | L5 |
| 22/02/2026 | `src/app/api/dashboard/upload/route.ts` | Zod validation على folder | L6 |
| 22/02/2026 | `src/lib/api/auth.ts` | isSuperAdmin يدعم عدة admins | L7 |
| 22/02/2026 | `src/lib/validations/store.ts` | إضافة planId لـ createStoreSchema | Plan Selection |
| 22/02/2026 | `src/app/api/stores/route.ts` | قبول planId + التحقق منه في DB | Plan Selection |
| 27/02/2026 | `src/app/api/admin/analytics/route.ts` | Promise.all + unstable_cache + Number() + تحديد أعمدة recentActivity | Analytics Perf |
| 27/02/2026 | `src/lib/validations/store.ts` | z.email() بدل z.string().email() (Zod v4) | Code Quality |
| 27/02/2026 | `src/lib/validations/order.ts` | ترجمة رسائل خطأ couponSchemaBase للعربية | Code Quality |
| 27/02/2026 | `src/app/api/payments/kashier/webhook/route.ts` | استبدال NextResponse.json() بـ apiSuccess/apiError + رسائل عربية | Code Quality |
| 27/02/2026 | `src/app/store/product/[slug]/page.tsx` | إصلاح relative import → @/ alias | Code Quality |
| 27/02/2026 | `src/app/store/page/[slug]/page.tsx` | إصلاح relative import → @/ alias | Code Quality |
| 27/02/2026 | `src/app/store/category/[slug]/page.tsx` | إصلاح relative import → @/ alias | Code Quality |
| 27/02/2026 | `src/app/(dashboard)/dashboard/products/new/page.tsx` | إصلاح relative import → @/ alias | Code Quality |
| 27/02/2026 | `src/app/(dashboard)/dashboard/products/[id]/page.tsx` | إصلاح relative import → @/ alias | Code Quality |

---

## الملفات المنشأة

| التاريخ | الملف | الغرض | المهمة |
|---------|-------|-------|--------|
| 21/02/2026 | `Agent.md` | ملف الذاكرة | — |
| 21/02/2026 | `src/lib/validations/customer.ts` | Zod schema لتعديل العميل | Task 0 - M4 |
| 22/02/2026 | `src/lib/payments/kashier.ts` | Helper functions: createSession + verifySignature | Task 6 |
| 22/02/2026 | `src/app/api/payments/kashier/create/route.ts` | إنشاء جلسة دفع لطلب موجود (retry) | Task 6 |
| 22/02/2026 | `src/app/api/payments/kashier/webhook/route.ts` | استقبال إشعارات من Kashier + تحديث حالة الدفع | Task 6 |
| 22/02/2026 | `src/lib/api/rate-limit.ts` | Rate limiter utility + presets | Task 8 |
| 22/02/2026 | `src/app/api/plans/route.ts` | GET /api/plans — عام بدون auth | Plan Selection |
| 22/02/2026 | `migrations/dev1_tables.sql` | SQL لإنشاء جداول Dev 1 فقط + seed الخطط | DB Setup |
| 22/02/2026 | `migrations/dev1_rls.sql` | RLS policies لجداول Dev 1 | DB Security |
| 22/02/2026 | `migrations/001_create_all_tables.sql` | SQL لإنشاء كل الجداول (كل المطورين) | DB Setup |
| 25/02/2026 | `src/app/(super-admin)/super-admin-nav.tsx` | SuperAdminNav — client component مع active link highlighting | Task 5 (re-impl) |

---

## ملاحظات مهمة

- **MCP Server**: لم يُستخدم بعد — سيتم التوثيق هنا عند الاستخدام
- **الخطة**: `docs/dev1-plan.md` هي المرجع الأساسي — أي تعارض يُحل بالرجوع لها
- **الأمان**: كل ملف يتعدل لازم يمر بقائمة المراجعة الأمنية (Section 11 في الخطة)

---

## ✅ مشكلة محلولة — ملف .env.local في المكان الخاطئ (22/02/2026)

### المشكلة
```
POST http://localhost:3000/api/stores 404 (Not Found)
```
ملف `.env.local` كان في `D:\MakaStore\` (المجلد الأب) بدلاً من `D:\MakaStore\matjary-platform\` (مجلد المشروع).

### السبب الجذري
- Next.js يبحث عن `.env.local` في مجلد المشروع فقط
- بدون `DATABASE_URL`، كان `db/index.ts` يرمي خطأ عند تحميل الـ module
- كل API route تستورد `@/db` كانت تفشل في التسجيل → تُرجع 404 بدل 500

### الحل المُطبّق
```powershell
Copy-Item "D:\MakaStore\.env.local" "D:\MakaStore\matjary-platform\.env.local"
```
ثم إعادة تشغيل السيرفر: `npm run dev`

---

---

## قائمة المراجعة لكل تعديل

- [ ] كل SELECT query فيه `storeId` filter
- [ ] كل UPDATE query فيه `and(eq(id), eq(storeId))`
- [ ] كل DELETE query فيه `and(eq(id), eq(storeId))`
- [ ] لا يوجد `any`
- [ ] Zod v4 validation لكل input
- [ ] رسائل الأخطاء بالعربية
- [ ] `try/catch` في كل API route
- [ ] `apiSuccess()` / `apiError()` فقط
- [ ] `@/` imports
- [ ] `npx tsc --noEmit` يمر بنجاح
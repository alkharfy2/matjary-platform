# خطة تنفيذ — نظام المحفظة ورسوم الطلبات (Wallet & Order Fee)

> **التاريخ**: 6 مارس 2026
> **الحالة**: مسودة — في انتظار تأكيد قرار مفتوح واحد (انظر القسم 0)
> **المرجع**: `docs/plan-subscription-payment.md` (نفس النمط)

---

## 0. قرار مفتوح — يحتاج تأكيد من صاحب المشروع

> ⚠️ **هذا القرار يغير التصميم الكامل للنظام — لازم يتأكد قبل التنفيذ**

**السؤال**: امتى بالظبط يتخصم الـ fee من رصيد التاجر؟

| الخيار | التفسير | المميزات | العيوب |
|--------|---------|---------|--------|
| **أ) عند مشاهدة التفاصيل أول مرة** | أول ما التاجر يفتح تفاصيل الطلب ورصيده كافي، يتخصم فوراً | بسيط جداً، لا يحتاج action إضافي | قد يُفاجأ التاجر بالخصم |
| **ب) عند تأكيد الطلب (confirmed)** | لما التاجر يضغط "قبول الطلب"، يتخصم الـ fee | معقول — الخصم مرتبط بـ action واضح | يحتاج زر "قبول" واضح |
| **ج) عند الشحن (shipped)** | لما التاجر يغير الحالة لـ "تم الشحن"، يتخصم الـ fee | التاجر متأكد ان الطلب حيُنفَّذ | يزيد التعقيد — ماذا لو النرصيد نقص بين التأكيد والشحن؟ |
الاجابه
خيار أ — عند مشاهدة التفاصيل أول مرة (المقترح): أسهل للتنفيذ، لو رصيده كافي وفتح التفاصيل → اتخصم
**التفسير المختار مبدئياً (أ) — مشاهدة التفاصيل أول مرة:**
- عند `GET /api/dashboard/orders/[id]` لأول مرة بعد ما الرصيد يكفي → يتخصم + `isFeeDeducted = true`
- بعدها: دايماً مرئي مهما كان الرصيد
- لو الرصيد مش كافي: يُرجع البيانات مع `blurred: true`

---

## 1. الفكرة باختصار

```
┌────────────────────────────────────────────────────────────────┐
│                    نظام المحفظة ورسوم الطلبات                   │
│                                                                │
│  التاجر → يشحن محفظته عبر Kashier                             │
│  Super Admin → يحدد رسوم الطلب في platform_plans.order_fee    │
│                                                                │
│  عميل يطلب → طلب يظهر في قائمة الطلبات                       │
│    ↓                                                           │
│  زر "عرض التفاصيل" ← لو رصيد < رسوم الطلب = بلور 🔴         │
│                      لو رصيد >= رسوم الطلب = واضح 🟢         │
│                        └─ يتخصم fee مرة واحدة تلقائياً        │
│                                                                │
│  صفحة /dashboard/wallet:                                      │
│    - الرصيد الحالي                                             │
│    - رسوم الطلب (من الخطة)                                     │
│    - تاريخ المعاملات                                           │
│    - زر "شحن المحفظة" → Kashier → webhook → يُحدث الرصيد     │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. تعديلات قاعدة البيانات

### 2أ. `merchants` — إضافة رصيد المحفظة

```typescript
// في src/db/schema.ts — جدول merchants:
balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
```

**ملاحظة**: الرصيد على `merchants` مش `stores` لأن كل تاجر عنده محفظة واحدة
(حتى لو غيّرنا القيد مستقبلاً وسمحنا بأكثر من متجر لنفس التاجر)

---

### 2ب. جدول جديد: `merchant_wallet_transactions`

```typescript
export const merchantWalletTransactions = pgTable('merchant_wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id')
    .references(() => merchants.id, { onDelete: 'cascade' })
    .notNull(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'set null' }),
  orderId: uuid('order_id')
    .references(() => storeOrders.id, { onDelete: 'set null' }),
  type: text('type').notNull(),       // 'top_up' | 'order_fee'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),  // موجب للشحن، سالب للخصم
  balanceBefore: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference'),       // kashier transactionId أو orderNumber
  notes: text('notes'),               // مثال: "شحن محفظة" / "رسوم طلب #1234"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_wallet_tx_merchant').on(table.merchantId),
  index('idx_wallet_tx_store').on(table.storeId),
  index('idx_wallet_tx_order').on(table.orderId),
  index('idx_wallet_tx_created').on(table.createdAt),
])
```

**أنواع المعاملات:**
| type | الوصف | amount |
|------|-------|--------|
| `top_up` | شحن المحفظة عبر Kashier | موجب (+100) |
| `order_fee` | خصم رسوم الطلب | سالب (-5) |

---

### 2ج. `store_orders` — إضافة علامة الخصم

```typescript
// في src/db/schema.ts — جدول storeOrders:
isFeeDeducted: boolean('is_fee_deducted').default(false).notNull(),
```

**الغرض**: منع الخصم المكرر لنفس الطلب
- `false` → الـ fee لم يُخصم بعد
- `true` → الـ fee تم خصمه، الطلب مرئي دايماً

---

### 2د. `platform_plans.order_fee` — موجود بالفعل ✅

```typescript
orderFee: decimal('order_fee', { precision: 10, scale: 4 }),  // رسوم كل طلب بالجنيه
```

**ملاحظة**: `null` أو `0` = مجاني = لا يوجد blur ولا خصم

---

### 2هـ. Migration SQL

**الملف**: `migrations/add_wallet_system.sql`

```sql
-- 1. إضافة رصيد المحفظة للتاجر
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 2. إضافة علامة الخصم على الطلبات
ALTER TABLE store_orders
  ADD COLUMN IF NOT EXISTS is_fee_deducted BOOLEAN NOT NULL DEFAULT false;

-- 3. جدول معاملات المحفظة
CREATE TABLE IF NOT EXISTS merchant_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  order_id UUID REFERENCES store_orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL,          -- 'top_up' | 'order_fee'
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_merchant ON merchant_wallet_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_store ON merchant_wallet_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON merchant_wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON merchant_wallet_transactions(created_at);
```

---

## 3. API Routes الجديدة

### 3أ. `GET /api/dashboard/wallet` — بيانات المحفظة

**الملف**: `src/app/api/dashboard/wallet/route.ts`

```
Auth: verifyStoreOwnership() + getAuthenticatedMerchant()
Method: GET

المنطق:
1. verifyStoreOwnership() → نحصل على store
2. getAuthenticatedMerchant() → نحصل على merchant (صاحب الـ store)
3. نجلب: merchant.balance
4. نجلب: platform_plans.order_fee عبر store.plan
5. نجلب: آخر 20 transaction من merchant_wallet_transactions للتاجر

Response: {
  success: true,
  data: {
    balance: string,          // "250.00"
    orderFee: string | null,  // "5.00" من platform_plans
    hasOrderFee: boolean,     // false لو free plan أو orderFee = 0
    transactions: Array<{
      id: string,
      type: 'top_up' | 'order_fee',
      amount: string,         // موجب أو سالب
      balanceAfter: string,
      reference: string | null,
      notes: string | null,
      createdAt: string,
    }>
  }
}
```

---

### 3ب. `POST /api/payments/wallet/create` — إنشاء جلسة شحن

**الملف**: `src/app/api/payments/wallet/create/route.ts`

```
Auth: getAuthenticatedMerchant() + verifyStoreOwnership()
Rate Limit: 10 طلبات/ساعة للـ IP
Method: POST

Body (Zod): { storeId: z.uuidv4(), amount: z.number().min(10).max(10000) }
  ← الحد الأدنى 10 جنيه، الأقصى 10,000 جنيه

المنطق:
1. Rate limit
2. Zod validation
3. Auth: getAuthenticatedMerchant()
4. جلب المتجر + تحقق ملكية (store.merchantId === merchant.id)
5. بناء merchantOrderId = `wallet_<merchantId>_<timestamp>`
6. استدعاء createWalletSession() من kashier.ts (helper جديد)
7. تخزين المبلغ المتوقع بطريقة ما (في الـ reference)

Response: { success: true, data: { paymentUrl: string } }
Errors: 401, 403, 422, 429, 500
```

**الفرق عن subscription/create:**
- `merchantOrderId` يبدأ بـ `wallet_` بدل `sub_`
- `merchantRedirect` → `/wallet-result?storeId=xxx`
- `serverWebhook` → `/api/payments/wallet/webhook`
- لا يشترط `isPaid = false` (ممكن يشحن أكثر من مرة)
- المبلغ يُدخله التاجر (مش محدد من الخطة) — بين 10 و10,000 جنيه

---

### 3ج. `POST /api/payments/wallet/webhook` — استقبال إشعار الشحن

**الملف**: `src/app/api/payments/wallet/webhook/route.ts`

```
Auth: Kashier signature verification (HMAC-SHA256)
Method: POST

المنطق:
1. تحقق من وجود البيانات الأساسية
2. تحقق أن merchantOrderId يبدأ بـ wallet_
3. تحقق من العملة (EGP فقط)
4. تحقق من صحة المبلغ
5. verifyKashierSignature()
6. استخرج merchantId من merchantOrderId: wallet_<merchantId>_<timestamp>
7. Idempotency: تحقق إن ما فيش transaction بنفس الـ reference
8. لو paymentStatus = SUCCESS:
   a. اجلب merchant
   b. احسب balanceBefore = merchant.balance
   c. احسب balanceAfter = balanceBefore + amount
   d. UPDATE merchants SET balance = balanceAfter WHERE id = merchantId
   e. INSERT merchant_wallet_transactions (type='top_up', amount=+X, ...)
   f. Log: "تم شحن محفظة التاجر"
9. لو paymentStatus = FAILED/PENDING: لا تغيير
10. Return 200

الأمان الإضافي (defense-in-depth):
- كل العمليات في DB transaction واحدة (db.transaction())
- لو فشل INSERT في الـ transactions → rollback UPDATE المحفظة
```

---

### 3د. `GET /api/payments/wallet/status` — حالة الشحن للـ polling

**الملف**: `src/app/api/payments/wallet/status/route.ts`

```
Auth: getAuthenticatedMerchant()
Method: GET
Query: { storeId: string (zod uuidv4) }

المنطق:
1. Zod validation على storeId
2. Auth: getAuthenticatedMerchant()
3. جلب المتجر + تحقق ملكية
4. جلب merchant.balance

Response: { success: true, data: { balance: string, slug: string } }
Errors: 401, 403, 404, 422, 500

ملاحظة: هذا polling endpoint لصفحة wallet-result، يرجع الرصيد الحالي
الصفحة تعمل poll وتنتظر لحد ما الرصيد يتغير (أو تنتهي مهلة 30 ثانية)
```

---

### 3هـ. تعديل `GET /api/dashboard/orders/[id]`

**الملف**: `src/app/api/dashboard/orders/[id]/route.ts`

**التعديلات:**
```
المنطق الإضافي بعد جلب الطلب:

1. جلب merchant.balance + plan.orderFee بجانب بيانات الطلب
2. حساب حالة الـ blur:
   - لو order.isFeeDeducted = true → blurred = false (دايماً مرئي)
   - لو orderFee = null أو 0 → blurred = false (خطة مجانية)
   - لو balance >= orderFee → خصم تلقائي + blurred = false (مرة واحدة)
   - لو balance < orderFee → blurred = true (إرسال بيانات محدودة)

3. لو blurred = false وكانت isFeeDeducted = false وorderFee > 0:
   a. db.transaction():
      - UPDATE merchants SET balance = balance - orderFee WHERE id = merchantId
      - UPDATE store_orders SET is_fee_deducted = true WHERE id = orderId AND store_id = storeId
      - INSERT merchant_wallet_transactions (type='order_fee', amount=-orderFee, ...)
   b. لو فشل الـ transaction: لا يضر — isFeeDeducted يظل false ويعيد المحاولة

4. Response عند blurred = true:
   {
     success: true,
     data: {
       id, orderNumber, orderStatus, paymentStatus, total,
       createdAt,
       blurred: true,   ← إشارة للـ client
       // لا: customerName, customerPhone, shippingAddress, items
     }
   }

5. Response عند blurred = false:
   { success: true, data: { ...كل البيانات..., blurred: false } }
```

---

## 4. صفحات Dashboard الجديدة

### 4أ. `/dashboard/wallet` — صفحة المحفظة

**الملف**: `src/app/(dashboard)/dashboard/wallet/page.tsx`

**النوع**: Server Component (يجلب بيانات أولية) + Client Components للتفاعل

**المحتوى:**

```
┌─────────────────────────────────────────────────────────────┐
│  💰 محفظتي                                                   │
├───────────────────────┬─────────────────────────────────────┤
│  الرصيد الحالي         │  رسوم كل طلب                       │
│  250.00 جنيه          │  5.00 جنيه  (من خطة Basic)          │
│  [ شحن المحفظة ▼ ]   │  💡 تأكد أن رصيدك يكفي لطلبات جديدة │
└───────────────────────┴─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  💳 شحن المحفظة                                              │
│  المبلغ: [__________] جنيه                                   │
│  الحد الأدنى 10 جنيه — الحد الأقصى 10,000 جنيه             │
│  [ ادفع وشحن عبر Kashier ]                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📋 سجل المعاملات                                             │
│  ────────────────────────────────────────────────────────── │
│  🟢 +100.00  شحن محفظة    1 مارس 2026   الرصيد: 250.00      │
│  🔴 -5.00    رسوم طلب #12  28 فبراير     الرصيد: 150.00     │
│  🟢 +200.00  شحن محفظة   20 فبراير      الرصيد: 155.00      │
│  ...                                    [ تحميل المزيد ]     │
└─────────────────────────────────────────────────────────────┘
```

**Components المطلوبة:**
- `WalletBalanceCard` — عرض الرصيد + رسوم الطلب (Server Component أو props)
- `WalletTopUpForm` — `'use client'` — نموذج الشحن + استدعاء API + redirect
- `WalletTransactionsList` — قائمة المعاملات (يمكن server component مع pagination)

**ملاحظات التنفيذ:**
- `WalletTopUpForm` يستدعي `POST /api/payments/wallet/create`
- عند النجاح: `window.location.href = data.paymentUrl` (redirect لـ Kashier)
- عرض loading state أثناء إنشاء الجلسة

---

### 4ب. `/wallet-result` — صفحة نتيجة الشحن

**الملف**: `src/app/(platform)/wallet-result/page.tsx`

**النوع**: `'use client'` (نفس نمط subscription-result/page.tsx)

**المنطق:**
- Kashier يحول التاجر لـ: `/wallet-result?storeId=xxx&status=success|failure`
- Polling: `GET /api/payments/wallet/status?storeId=xxx` كل 2 ثانية لمدة 30 ثانية
- عند نجاح: عرض رسالة نجاح + رصيد جديد + زر "عرض الطلبات"
- عند فشل: عرض رسالة فشل + زر "المحاولة مرة أخرى"

**حالة النجاح:**
```
✅ تم شحن المحفظة بنجاح!
الرصيد الجديد: 350.00 جنيه
[ عرض الطلبات ]  [ محفظتي ]
```

**حالة الفشل:**
```
❌ فشل الشحن
لم يتم إكمال عملية الدفع. يمكنك المحاولة مرة أخرى.
[ حاول مرة أخرى ]  [ لوحة التحكم ]
```

---

## 5. تعديلات على صفحات موجودة

### 5أ. صفحة تفاصيل الطلب — Blur Overlay

**الملف**: `src/app/(dashboard)/dashboard/orders/[id]/page.tsx`

**النوع**: `'use client'` (موجود بالفعل)

**التعديلات:**

```
1. نوع Order الموجود → نضيف: blurred: boolean
2. في جلب الطلب (useEffect) → API يرجع blurred: true/false
3. لو blurred = true:
   - نعرض: orderNumber, orderStatus, total, paymentStatus فقط
   - نضع overlay فوق باقي التفاصيل:
     ┌──────────────────────────────────────────────────┐
     │  🔒  رصيد محفظتك غير كافٍ لمشاهدة تفاصيل الطلب │
     │  الرسوم: 5.00 جنيه  |  رصيدك الحالي: 2.00 جنيه │
     │  [ شحن المحفظة الآن ]                            │
     └──────────────────────────────────────────────────┘
4. لو blurred = false: يظهر كل شيء عادي
```

**تقنية الـ Blur:**
```tsx
<div className="relative">
  <div className={blurred ? 'blur-sm pointer-events-none select-none' : ''}>
    {/* تفاصيل الطلب */}
  </div>
  {blurred && (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
      {/* رسالة الـ blur */}
    </div>
  )}
</div>
```

---

### 5ب. Dashboard Layout — إضافة Wallet في Sidebar

**الملف**: `src/app/(dashboard)/layout.tsx`

**التعديل**: إضافة سطر في `sidebarItems`:
```typescript
{ href: '/dashboard/wallet', label: 'المحفظة', icon: '💰' },
```

**الموقع**: بعد `الطلبات` وقبل `العملاء` (أو حسب الترتيب المنطقي)

---

### 5ج. Super Admin Plans — `orderFee` موجود بالفعل ✅

`platform_plans.order_fee` موجود في الـ schema والـ Super Admin Plans page فيها CRUD كامل.
**لا يحتاج تعديل.**

---

## 6. Kashier Helper — `createWalletSession()`

**الملف**: `src/lib/payments/kashier.ts` (إضافة function جديدة)

```typescript
interface CreateWalletSessionParams {
  merchantId: string
  storeId: string
  storeSlug: string
  amount: string      // "100.00"
  currency: string    // "EGP"
  merchantEmail: string
}

export async function createWalletSession(
  params: CreateWalletSessionParams,
): Promise<{ sessionId: string; redirectUrl: string }> {
  // نفس نمط createSubscriptionSession() بالضبط
  // merchantOrderId = `wallet_<merchantId>_<timestamp>`
  // merchantRedirect = `${redirectBase}/wallet-result?storeId=storeId`
  // serverWebhook = `${webhookBase}/api/payments/wallet/webhook`
}
```

---

## 7. Zod Validations الجديدة

**الملف**: `src/lib/validations/wallet.ts`

```typescript
import { z } from 'zod'

export const createWalletSessionSchema = z.object({
  storeId: z.string().uuid({ error: 'معرف المتجر غير صالح' }),
  amount: z.number({
    error: 'المبلغ يجب أن يكون رقماً',
  }).min(5, { error: 'الحد الأدنى للشحن 5 جنيه' })
    .max(10000, { error: 'الحد الأقصى للشحن 10,000 جنيه' }),
})

export const walletStatusQuerySchema = z.object({
  storeId: z.string().uuid({ error: 'معرف المتجر غير صالح' }),
})
```

---

## 8. الأمان والحماية

### 8أ. الخصم الذري (Atomic Deduction)

**المشكلة**: لو خصمنا من الرصيد بـ UPDATE ثم فشل INSERT في الـ transactions → inconsistency

**الحل**: كل عملية خصم تتم داخل `db.transaction()`:

```typescript
await db.transaction(async (tx) => {
  // 1. قراءة الرصيد الحالي مع قفل (SELECT FOR UPDATE)
  const [merchantRow] = await tx
    .select({ balance: merchants.balance })
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .for('update')  // ← Row-level lock يمنع race conditions

  const currentBalance = parseFloat(merchantRow.balance)
  if (currentBalance < orderFeeNum) throw new Error('رصيد غير كافٍ')

  // 2. خصم الـ fee
  await tx.update(merchants)
    .set({ balance: (currentBalance - orderFeeNum).toFixed(2) })
    .where(eq(merchants.id, merchantId))

  // 3. تحديث الطلب
  await tx.update(storeOrders)
    .set({ isFeeDeducted: true })
    .where(and(eq(storeOrders.id, orderId), eq(storeOrders.storeId, storeId)))

  // 4. تسجيل المعاملة
  await tx.insert(merchantWalletTransactions).values({
    merchantId,
    storeId,
    orderId,
    type: 'order_fee',
    amount: (-orderFeeNum).toFixed(2),
    balanceBefore: currentBalance.toFixed(2),
    balanceAfter: (currentBalance - orderFeeNum).toFixed(2),
    reference: order.orderNumber,
    notes: `رسوم طلب #${order.orderNumber}`,
  })
})
```

### 8ب. Idempotency في Webhook

- قبل أي تحديث للمحفظة في الـ webhook، نتحقق أنه ما فيش transaction بنفس الـ reference
- لو موجود → `return apiSuccess(...)` (already processed)

### 8ج. Rate Limiting للـ API الحساسة

| Endpoint | الحد |
|----------|------|
| `POST /api/payments/wallet/create` | 10 طلبات/ساعة/IP |
| `GET /api/dashboard/wallet` | لا يحتاج (read-only) |
| `GET /api/payments/wallet/status` | 60 طلب/دقيقة/IP |

---

## 9. ملخص الملفات

### ملفات جديدة:
| # | الملف | الغرض |
|---|-------|-------|
| 1 | `migrations/add_wallet_system.sql` | SQL لإضافة balance + is_fee_deducted + جدول transactions |
| 2 | `src/lib/validations/wallet.ts` | Zod schemas للـ wallet endpoints |
| 3 | `src/app/api/dashboard/wallet/route.ts` | GET — بيانات المحفظة للـ dashboard |
| 4 | `src/app/api/payments/wallet/create/route.ts` | POST — إنشاء جلسة Kashier للشحن |
| 5 | `src/app/api/payments/wallet/webhook/route.ts` | POST — استقبال إشعار Kashier + تحديث الرصيد |
| 6 | `src/app/api/payments/wallet/status/route.ts` | GET — polling لصفحة نتيجة الشحن |
| 7 | `src/app/(dashboard)/dashboard/wallet/page.tsx` | صفحة المحفظة في الـ dashboard |
| 8 | `src/app/(platform)/wallet-result/page.tsx` | `'use client'` — صفحة نتيجة شحن المحفظة |

### ملفات تتعدل:
| # | الملف | التعديل |
|---|-------|--------|
| 1 | `src/db/schema.ts` | إضافة `balance` للـ merchants + `isFeeDeducted` للـ orders + جدول transactions |
| 2 | `src/lib/payments/kashier.ts` | إضافة `createWalletSession()` helper |
| 3 | `src/app/api/dashboard/orders/[id]/route.ts` | إرجاع `blurred` + خصم الـ fee تلقائياً |
| 4 | `src/app/(dashboard)/dashboard/orders/[id]/page.tsx` | عرض blur overlay |
| 5 | `src/app/(dashboard)/layout.tsx` | إضافة "المحفظة" في الـ sidebar |

---

## 10. ترتيب التنفيذ (الأولوية)

```
الخطوة 1 — DB وSchema (أساس كل شيء):
  src/db/schema.ts: balance + isFeeDeducted + merchantWalletTransactions
  migrations/add_wallet_system.sql

الخطوة 2 — Kashier helper:
  src/lib/payments/kashier.ts: createWalletSession()
  src/lib/validations/wallet.ts

الخطوة 3 — API Routes:
  POST /api/payments/wallet/create
  POST /api/payments/wallet/webhook
  GET /api/payments/wallet/status
  GET /api/dashboard/wallet

الخطوة 4 — تعديل Orders API:
  GET /api/dashboard/orders/[id]/route.ts (blurred logic + fee deduction)

الخطوة 5 — UI:
  صفحة wallet في dashboard
  صفحة wallet-result في platform
  تعديل orders/[id]/page.tsx (blur overlay)
  إضافة wallet في sidebar

الخطوة 6 — Testing:
  اختبار رسوم الطلب (blur/unblur)
  اختبار شحن المحفظة end-to-end مع Kashier test mode
  اختبار idempotency في الـ webhook
  اختبار الخصم الذري (atomic deduction)
```

---

## 11. أسئلة مفتوحة (للتأكيد)

| # | السؤال | الإجابة الافتراضية |
|---|--------|------------------|
| 1 | امتى يتخصم الـ fee؟ عند مشاهدة التفاصيل أم عند تأكيد/شحن الطلب؟ | عند أول مشاهدة ناجحة (balance >= fee) |
| 2 | لو الرصيد اصبح 0 بعد خصم طلبات سابقة، هل الطلبات المخصومة تظل مرئية؟ | نعم (isFeeDeducted = true → دايماً مرئية) |
| 3 | هل خطة free لها رسوم (orderFee = 0 في DB)؟ | لا رسوم — لا blur ولا خصم |
| 4 | ما الحد الأدنى والأقصى للشحن؟ | الأدنى 5 جنيه، الأقصى 10,000 |
| 5 | هل نعرض رصيد التاجر في الـ header أو الـ sidebar للـ dashboard؟ | مقترح: badge صغير في الـ sidebar عند الـ wallet link |

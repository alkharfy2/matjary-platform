# 🧪 دليل اختبار Dev 1 — قبل التسليم

> **آخر تحديث**: 22 فبراير 2026
> **الهدف**: التأكد من أن كل شغل Dev 1 يعمل بشكل صحيح قبل التسليم

---

## الفهرس

1. [المتطلبات قبل البدء](#1-المتطلبات-قبل-البدء)
2. [اختبار 0: TypeScript + Build](#2-اختبار-0-typescript--build)
3. [اختبار 1: Clerk Webhook](#3-اختبار-1-clerk-webhook)
4. [اختبار 2: إنشاء متجر (Onboarding)](#4-اختبار-2-إنشاء-متجر-onboarding)
5. [اختبار 3: الأمان — عزل المتاجر (Tenant Isolation)](#5-اختبار-3-الأمان--عزل-المتاجر)
6. [اختبار 4: Checkout + Kashier](#6-اختبار-4-checkout--kashier)
7. [اختبار 5: كوبونات + شحن](#7-اختبار-5-كوبونات--شحن)
8. [اختبار 6: Rate Limiting](#8-اختبار-6-rate-limiting)
9. [اختبار 7: Super Admin](#9-اختبار-7-super-admin)
10. [اختبار 8: Zod Validations](#10-اختبار-8-zod-validations)
11. [اختبار 9: Middleware + Routing](#11-اختبار-9-middleware--routing)
12. [اختبار 10: Supabase Storage](#12-اختبار-10-supabase-storage)
13. [قائمة المراجعة النهائية](#13-قائمة-المراجعة-النهائية)

---

## 1. المتطلبات قبل البدء

### بيئة العمل
```bash
# 1. تأكد من وجود ملف .env.local بالمتغيرات التالية:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NEXT_PUBLIC_PROTOCOL=http
SUPER_ADMIN_CLERK_ID=user_XXXXXXXXXX
CLERK_WEBHOOK_SECRET=whsec_...
KASHIER_MERCHANT_ID=MID-xxx
KASHIER_API_KEY=xxx
KASHIER_API_SECRET=xxx
KASHIER_MODE=test
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 2. شغّل المشروع
npm run dev

# 3. تأكد من اتصال قاعدة البيانات
npx drizzle-kit push
```

### أدوات مطلوبة
- **المتصفح**: Chrome/Edge مع DevTools (Network tab)
- **Postman / Thunder Client / curl**: لاختبار الـ APIs
- **pgAdmin أو Drizzle Studio**: لفحص قاعدة البيانات مباشرة
  ```bash
  npx drizzle-kit studio
  ```

### ملف hosts (Windows)
```
# أضف في C:\Windows\System32\drivers\etc\hosts
127.0.0.1   matjary.local
127.0.0.1   test-store.matjary.local
```

---

## 2. اختبار 0: TypeScript + Build

> **🤖 تم تشغيله تلقائياً**

### 0.1 — Type Check
```bash
npx tsc --noEmit
```
- [x] ✅ لا يوجد أخطاء TypeScript — **EXIT 0** 🤖
- [x] ✅ لا يوجد `any` types — (ESLint لم يبلّغ عن `no-explicit-any`) 🤖

### 0.2 — ESLint
```bash
npm run lint
```
- [x] ✅ لا يوجد أخطاء lint — **0 errors, 12 warnings** (unused vars + `<img>` tags) 🤖

> ⚠️ **الـ 12 warnings:** unused imports في بعض الملفات و `<img>` بدل `<Image>` في صفحتين — لا تؤثر على الوظيفة ولكن يُنصح بإصلاحها لاحقاً.

### 0.3 — Build
```bash
npm run build
```
- [ ] الـ build ينجح بدون أخطاء — ⚠️ اختبر يدوياً
- [ ] لا يوجد warnings حرجة

---

## 3. اختبار 1: Clerk Webhook

### 1.1 — إنشاء مستخدم جديد (user.created)

**الخطوات:**
1. افتح `http://matjary.local:3000/auth/sign-up`
2. أنشئ حساب جديد بإيميل حقيقي أو إيميل Clerk test
3. بعد التسجيل، افحص قاعدة البيانات

**الفحص في DB:**
```sql
SELECT * FROM merchants WHERE clerk_user_id = 'user_XXX';
```

- [ ] ✅ تم إنشاء سجل في `merchants`
- [ ] ✅ الـ `email` صحيح
- [ ] ✅ الـ `display_name` موجود (مش فاضي)
- [ ] ✅ الـ `avatar_url` موجود (لو المستخدم عنده صورة)
- [ ] ✅ الـ `is_active` = `true`

### 1.2 — تحديث مستخدم (user.updated)

**الخطوات:**
1. اذهب لـ Clerk Dashboard → Users → اختر المستخدم
2. غيّر الاسم أو رقم الهاتف
3. افحص DB

- [ ] ✅ الـ `display_name` اتحدث
- [ ] ✅ الـ `phone` اتحدثت (لو تغيرت)
- [ ] ✅ الـ `avatar_url` اتحدث (لو تغير)

### 1.3 — حذف مستخدم (user.deleted)

**الخطوات:**
1. من Clerk Dashboard → Users → احذف المستخدم
2. افحص DB

- [ ] ✅ السجل اتحذف من `merchants`
- [ ] ✅ لو كان عنده متجر، المتجر اتحذف (cascade)

### 1.4 — ريتراي (Retry Logic)

افحص الـ console logs عند أي عملية webhook:
- [ ] ✅ Structured JSON logging (مش `console.log` عادي)
- [ ] ✅ في حالة فشل DB، يحاول 3 مرات (retry with exponential backoff)

---

## 4. اختبار 2: إنشاء متجر (Onboarding)

### 2.1 — التدفق الكامل

**الخطوات:**
1. سجّل دخول على `http://matjary.local:3000/auth/sign-in`
2. اذهب لـ `http://matjary.local:3000/onboarding`
3. ادخل:
   - **اسم المتجر**: `متجر تجريبي`
   - **رابط المتجر**: `test-store`
   - **التصنيف**: أي تصنيف
4. اضغط "إنشاء المتجر"

**التوقعات:**
- [ ] ✅ الصفحة بتحول لـ `http://test-store.matjary.local:3000/dashboard`
- [ ] ✅ السجل موجود في `stores` مع `plan = 'free'`
- [ ] ✅ `merchant_id` مربوط صح

### 2.2 — محاولة إنشاء متجر تاني

1. ارجع لـ `http://matjary.local:3000/onboarding`
2. حاول تنشئ متجر تاني

- [ ] ✅ يظهر رسالة خطأ: "لديك متجر بالفعل. كل تاجر يمكنه إنشاء متجر واحد فقط."

### 2.3 — Slug مكرر

1. سجل بحساب جديد
2. حاول تنشئ متجر بنفس الـ slug `test-store`

- [ ] ✅ يظهر رسالة: "هذا الرابط مستخدم بالفعل. اختر رابطاً آخر."

### 2.4 — Validation

حاول بإدخالات خاطئة:

| Input | المتوقع |
|-------|---------|
| اسم فاضي | ❌ رسالة خطأ: "اسم المتجر يجب أن يكون حرفين على الأقل" |
| slug بأحرف عربي | ❌ رسالة خطأ: "رابط المتجر يجب أن يحتوي فقط على أحرف إنجليزية صغيرة" |
| slug بأحرف كبيرة `TEST` | ❌ رسالة خطأ |
| slug قصير `ab` | ❌ "رابط المتجر يجب أن يكون 3 أحرف على الأقل" |
| slug طويل (أكثر من 30 حرف) | ❌ رسالة خطأ |
| اسم 1 حرف | ❌ رسالة خطأ |

- [ ] ✅ كل الحالات بترجع رسالة خطأ بالعربي
- [ ] ✅ الزر بيكون `disabled` أثناء الإرسال (مفيش ضغطات مزدوجة)

---

## 5. اختبار 3: الأمان — عزل المتاجر (Tenant Isolation)

> **هذا أهم قسم!** كل ثغرة أمنية هنا ممكن تأثر على كل المتاجر.

### 3.0 — Static Code Analysis 🤖 (تلقائي)

> تم التحقق بـ grep من وجود `and(eq(id), eq(storeId))` في كل route بيها `[id]`

- [x] ✅ `categories/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `coupons/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `customers/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `design/hero-slides/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `orders/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `orders/[id]/status` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `pages/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `products/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖
- [x] ✅ `shipping/[id]` — `and(eq(...id), eq(...storeId))` موجود 🤖

**النتيجة: 9/9 routes محمية ✅**

---

### 3.1 — اختبار M1: UPDATE/DELETE بـ storeId

**السيناريو**: تاجر A يحاول يعدل/يحذف منتج تبع تاجر B

**الخطوات:**
1. أنشئ متجرين مختلفين (store-a و store-b) بحسابين مختلفين
2. أنشئ منتج في store-b (سجّل الـ product ID)
3. سجل دخول بحساب تاجر A
4. افتح متجر A في subdomain
5. اعمل request:

```bash
# حاول تعدل منتج تبع store-b من خلال store-a
curl -X PUT "http://store-a.matjary.local:3000/api/dashboard/products/{product-id-from-store-b}" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=..." \
  -d '{"name": "hacked!"}'
```

- [ ] ✅ يرجع `404 — المنتج غير موجود` (مش 200!)
- [ ] ✅ المنتج في store-b **لم يتغير** في DB

**كرر نفس الاختبار لـ:**
- [ ] ✅ `DELETE /api/dashboard/products/[id]`
- [ ] ✅ `PUT /api/dashboard/categories/[id]`
- [ ] ✅ `DELETE /api/dashboard/categories/[id]`
- [ ] ✅ `PUT /api/dashboard/coupons/[id]`
- [ ] ✅ `DELETE /api/dashboard/coupons/[id]`
- [ ] ✅ `PUT /api/dashboard/shipping/[id]`
- [ ] ✅ `DELETE /api/dashboard/shipping/[id]`
- [ ] ✅ `PUT /api/dashboard/pages/[id]`
- [ ] ✅ `DELETE /api/dashboard/pages/[id]`
- [ ] ✅ `DELETE /api/dashboard/design/hero-slides/[id]`
- [ ] ✅ `PUT /api/dashboard/customers/[id]`
- [ ] ✅ `PATCH /api/dashboard/orders/[id]/status`

### 3.2 — اختبار M2: طلبات العميل مقيدة بالمتجر

1. أنشئ عميل في store-b (عبر طلب checkout)
2. سجل الـ customer ID
3. من store-a، حاول تجلب بيانات العميل:

```bash
curl "http://store-a.matjary.local:3000/api/dashboard/customers/{customer-id-from-store-b}" \
  -H "Cookie: __session=..."
```

- [ ] ✅ يرجع `404 — العميل غير موجود`
- [ ] ✅ لا يكشف بيانات العميل أبداً

### 3.3 — اختبار M3: بيانات العميل من الطلب مقيدة بالمتجر

1. الـ GET `/api/dashboard/orders/[id]` يجلب بيانات العميل
2. تأكد أن customer lookup فيه `storeId` filter

- [ ] ✅ لو الطلب فيه `customerId` تبع متجر تاني، لا يرجع بياناته

### 3.4 — اختبار M6: verifyStoreOwnership بدون slug

```bash
# Request بدون x-store-slug header (من الـ main domain)
curl "http://matjary.local:3000/api/dashboard/products" \
  -H "Cookie: __session=..."
```

- [ ] ✅ يرجع خطأ `401 Unauthorized` (لأن store = null)
- [ ] ✅ لا يرجع بيانات أي متجر

---

## 6. اختبار 4: Checkout + Kashier

### 4.1 — Checkout بالدفع عند الاستلام (COD)

**أولاً** أنشئ بيانات تجريبية (من Drizzle Studio أو API):
- منتج واحد على الأقل في المتجر
- منطقة شحن تغطي "القاهرة"

```bash
curl -X POST "http://test-store.matjary.local:3000/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "STORE_UUID_HERE",
    "items": [
      { "productId": "PRODUCT_UUID_HERE", "quantity": 1 }
    ],
    "shipping": {
      "governorate": "القاهرة",
      "city": "مدينة نصر",
      "area": "الحي الثامن",
      "street": "شارع التسعين"
    },
    "customerName": "أحمد محمد",
    "customerPhone": "01012345678",
    "customerEmail": "test@test.com",
    "paymentMethod": "cod"
  }'
```

**التوقعات:**
- [ ] ✅ Response: `201` مع `orderId` + `orderNumber` + `total`
- [ ] ✅ الطلب موجود في `store_orders` بـ `payment_status = 'pending'`
- [ ] ✅ العميل اتأنشأ في `store_customers`
- [ ] ✅ الـ stock نقص (لو `track_inventory = true`)
- [ ] ✅ الـ `order_items` اتأنشأت

### 4.2 — Checkout بـ Kashier

```bash
curl -X POST "http://test-store.matjary.local:3000/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "STORE_UUID_HERE",
    "items": [
      { "productId": "PRODUCT_UUID_HERE", "quantity": 1 }
    ],
    "shipping": {
      "governorate": "القاهرة",
      "city": "مدينة نصر",
      "area": "الحي الثامن",
      "street": "شارع التسعين"
    },
    "customerName": "أحمد محمد",
    "customerPhone": "01012345678",
    "paymentMethod": "kashier"
  }'
```

**التوقعات:**
- [ ] ✅ Response: `201` مع `paymentUrl` (رابط صفحة الدفع)
- [ ] ✅ الطلب بـ `payment_status = 'awaiting_payment'`
- [ ] ✅ `kashier_order_id` محفوظ
- [ ] ✅ لو Kashier env vars مش صحيحة → يرجع الطلب بدون `paymentUrl` + رسالة خطأ

### 4.3 — إعادة محاولة الدفع (Retry Payment)

```bash
curl -X POST "http://test-store.matjary.local:3000/api/payments/kashier/create" \
  -H "Content-Type: application/json" \
  -d '{ "orderId": "ORDER_UUID_HERE" }'
```

- [ ] ✅ يرجع `paymentUrl` جديد
- [ ] ✅ لو الطلب `paymentMethod !== 'kashier'` → خطأ 422
- [ ] ✅ لو الطلب `paymentStatus === 'paid'` → خطأ 422 "تم الدفع بالفعل"

### 4.4 — Kashier Webhook

> **ملاحظة**: في بيئة التطوير، يمكنك محاكاة الـ webhook يدوياً

```bash
# محاكاة دفع ناجح
curl -X POST "http://matjary.local:3000/api/payments/kashier/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantOrderId": "ORD-XXXXXXXX",
    "orderId": "kashier-order-id",
    "amount": "150.00",
    "currency": "EGP",
    "paymentStatus": "SUCCESS",
    "method": "card",
    "transactionId": "txn-123",
    "signature": "COMPUTED_HMAC_SHA256_SIGNATURE"
  }'
```

> **لحساب الـ signature**:
> ```
> hashString = merchantOrderId + orderId + amount + currency + paymentStatus
> signature = HMAC-SHA256(hashString, KASHIER_API_KEY)
> ```

- [ ] ✅ بدون signature → `401 Invalid signature`
- [ ] ✅ بـ signature خاطئ → `401 Invalid signature`
- [ ] ✅ بـ signature صحيح + `SUCCESS` → `payment_status = 'paid'` + `paid_at` محدد
- [ ] ✅ بـ signature صحيح + `FAILED` → `payment_status = 'failed'`
- [ ] ✅ طلب مدفوع بالفعل → `200 Already processed` (idempotent)
- [ ] ✅ مبلغ مختلف عن الطلب → `422 Amount mismatch`
- [ ] ✅ طلب غير موجود → `404 Order not found`

### 4.5 — Checkout Validations

| الحالة | المتوقع |
|--------|---------|
| بدون `storeId` | ❌ 422 Validation |
| بدون `items` | ❌ 422 "يجب إضافة منتج واحد على الأقل" |
| `quantity = 0` | ❌ 422 "الكمية يجب أن تكون 1 على الأقل" |
| `customerPhone` قصير | ❌ 422 "رقم الهاتف غير صالح" |
| `paymentMethod = 'invalid'` | ❌ 422 "طريقة الدفع غير صالحة" |
| متجر غير موجود | ❌ 404 "المتجر غير موجود" |
| منتج غير موجود | ❌ 422 "المنتج غير متوفر" |
| متجر غير نشط (`isActive = false`) | ❌ 404 "المتجر غير موجود" |
| كمية أكبر من المخزون | ❌ 422 "الكمية المطلوبة غير متوفرة" |
| طلب أقل من الحد الأدنى | ❌ 422 "الحد الأدنى..." |
| طلب أكبر من الحد الأقصى | ❌ 422 "الحد الأقصى..." |

- [ ] ✅ كل الحالات بترجع رسائل خطأ بالعربي

---

## 7. اختبار 5: كوبونات + شحن

### 5.1 — التحقق من كوبون صالح

**أولاً** أنشئ كوبون في الـ DB:
```sql
INSERT INTO store_coupons (store_id, code, type, value, is_active)
VALUES ('STORE_UUID', 'TEST50', 'percentage', '50.00', true);
```

```bash
curl -X POST "http://test-store.matjary.local:3000/api/coupons/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "STORE_UUID",
    "code": "TEST50",
    "subtotal": 200
  }'
```

- [ ] ✅ `valid: true` مع `discountAmount = 100`

### 5.2 — كوبونات غير صالحة

| الحالة | المتوقع |
|--------|---------|
| كود غير موجود | `valid: false, reason: "الكوبون غير موجود"` |
| كوبون منتهي الصلاحية | `valid: false, reason: "الكوبون منتهي الصلاحية"` |
| كوبون لم يبدأ بعد | `valid: false, reason: "الكوبون لم يبدأ بعد"` |
| كوبون استُنفذت استخداماته | `valid: false, reason: "تم استنفاد استخدامات هذا الكوبون"` |
| الطلب أقل من الحد الأدنى | `valid: false, reason: "الحد الأدنى..."` |

- [ ] ✅ كل الحالات بترجع `valid: false` مع `reason` بالعربي
- [ ] ✅ كوبون بـ `maxDiscount` → الخصم لا يتجاوز الـ max

### 5.3 — حساب الشحن

**أولاً** أنشئ منطقة شحن:
```sql
INSERT INTO store_shipping_zones (store_id, name, governorates, shipping_fee, is_active)
VALUES ('STORE_UUID', 'القاهرة والجيزة', '["القاهرة", "الجيزة"]', '30.00', true);
```

```bash
curl -X POST "http://test-store.matjary.local:3000/api/shipping/calculate" \
  -H "Content-Type: application/json" \
  -d '{ "storeId": "STORE_UUID", "governorate": "القاهرة" }'
```

- [ ] ✅ `supported: true` + `cost: 30`

```bash
# محافظة غير مدعومة
curl -X POST "http://test-store.matjary.local:3000/api/shipping/calculate" \
  -H "Content-Type: application/json" \
  -d '{ "storeId": "STORE_UUID", "governorate": "أسوان" }'
```

- [ ] ✅ `supported: false` + `message: "هذه المحافظة غير مدعومة حالياً"`

### 5.4 — شحن مجاني

**حدّث منطقة الشحن:**
```sql
UPDATE store_shipping_zones SET free_shipping_minimum = '100.00'
WHERE store_id = 'STORE_UUID';
```

اعمل checkout بطلب أكبر من 100:
- [ ] ✅ `shippingCost = 0` (شحن مجاني)

اعمل checkout بطلب أقل من 100:
- [ ] ✅ `shippingCost = 30`

---

## 8. اختبار 6: Rate Limiting

### 6.1 — Rate Limit على إنشاء متاجر

```bash
# ارسل 6 طلبات متتالية (الحد = 5/ساعة)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST "http://matjary.local:3000/api/stores" \
    -H "Content-Type: application/json" \
    -d '{"name":"test","slug":"test-'$i'"}'
done
```

أو في PowerShell:
```powershell
1..6 | ForEach-Object {
  $response = Invoke-WebRequest -Uri "http://matjary.local:3000/api/stores" `
    -Method POST -ContentType "application/json" `
    -Body '{"name":"test","slug":"test-store-rate"}'
  Write-Host "Request $_`: $($response.StatusCode)"
}
```

- [ ] ✅ أول 5 طلبات → قد تكون 401/422 (بسبب auth) لكن مش 429
- [ ] ✅ الطلب رقم 6 → `429` مع "تم تجاوز الحد الأقصى للطلبات"

### 6.2 — Rate Limit على Checkout (20/دقيقة)

```powershell
1..21 | ForEach-Object {
  $body = @{
    storeId = "STORE_UUID"
    items = @(@{productId="PRODUCT_UUID"; quantity=1})
    shipping = @{governorate="القاهرة"; city="نصر"; area="حي"; street="شارع"}
    customerName = "تست"
    customerPhone = "01012345678"
    paymentMethod = "cod"
  } | ConvertTo-Json -Depth 3
  
  try {
    $r = Invoke-WebRequest -Uri "http://test-store.matjary.local:3000/api/checkout" `
      -Method POST -ContentType "application/json" -Body $body
    Write-Host "Request $_`: $($r.StatusCode)"
  } catch {
    Write-Host "Request $_`: $($_.Exception.Response.StatusCode.value__)"
  }
}
```

- [ ] ✅ الطلب رقم 21 → `429`

### 6.3 — Rate Limit على الكوبونات (30/دقيقة)

نفس المنهج — ارسل 31 طلب:
- [ ] ✅ الطلب رقم 31 → `429`

---

## 9. اختبار 7: Super Admin

### 7.1 — حماية الوصول

1. **بدون تسجيل دخول**: `http://matjary.local:3000/super-admin`
   - [ ] ✅ يتم إعادة التوجيه لصفحة تسجيل الدخول

2. **بمستخدم عادي** (مش في `SUPER_ADMIN_CLERK_ID`):
   - [ ] ✅ الصفحة تظهر لكن الـ APIs ترفض (403 Forbidden)

3. **بمستخدم Super Admin**:
   - [ ] ✅ كل شيء يعمل

### 7.2 — Overview Page (`/super-admin`)

- [ ] ✅ إجمالي المتاجر — رقم صحيح (قارن مع DB: `SELECT count(*) FROM stores`)
- [ ] ✅ المتاجر النشطة — رقم صحيح
- [ ] ✅ إجمالي التجار — رقم صحيح
- [ ] ✅ إجمالي الإيراد — رقم صحيح
- [ ] ✅ توزيع المتاجر حسب الخطة
- [ ] ✅ آخر 10 متاجر مع اسم التاجر
- [ ] ✅ آخر 20 نشاط

### 7.3 — Stores Page (`/super-admin/stores`)

- [ ] ✅ الجدول يعرض المتاجر بشكل صحيح
- [ ] ✅ البحث بالاسم يعمل
- [ ] ✅ فلترة الحالة (نشط/غير نشط) تعمل
- [ ] ✅ فلترة الخطة (free/basic/pro) تعمل
- [ ] ✅ زر تفعيل/تعطيل يغير الحالة فعلاً (تحقق في DB)
- [ ] ✅ Pagination يعمل (اختبر لو عندك أكثر من 20 متجر)

### 7.4 — Merchants Page (`/super-admin/merchants`)

- [ ] ✅ الجدول يعرض التجار
- [ ] ✅ البحث بالإيميل يعمل
- [ ] ✅ Pagination يعمل

### 7.5 — Plans Page (`/super-admin/plans`)

- [ ] ✅ الخطط تظهر كـ cards
- [ ] ✅ إضافة خطة جديدة → تظهر فوراً
- [ ] ✅ تعديل خطة → التغييرات تنعكس
- [ ] ✅ حذف خطة → تختفي + تأكيد قبل الحذف
- [ ] ✅ خطة غير موجودة → 404 عند محاولة حذفها
- [ ] ✅ الحقول مطلوبة (validation messages بالعربي)

### 7.6 — Admin APIs مع Zod Validation

```bash
# معاملات غير صالحة
curl "http://matjary.local:3000/api/admin/stores?page=-1&limit=999" \
  -H "Cookie: __session=..."
```

- [ ] ✅ `422` مع رسالة خطأ (page must be >= 1, limit max 50)

```bash
# PATCH بقيم غير صالحة
curl -X PATCH "http://matjary.local:3000/api/admin/stores/STORE_UUID" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=..." \
  -d '{"plan": "enterprise"}'
```

- [ ] ✅ `422` مع "خطة غير صالحة" (لأن enterprise مش في الـ enum)

### 7.7 — isSuperAdmin() يدعم عدة Admins

1. أضف أكتر من admin ID في `.env.local`:
   ```
   SUPER_ADMIN_CLERK_ID=user_admin1,user_admin2
   ```
2. سجل بأي واحد فيهم

- [ ] ✅ كلاهما يقدر يوصل للـ Admin pages
- [ ] ✅ مستخدم مش في القائمة → 403

---

## 10. اختبار 8: Zod Validations

### 8.1 — Customer Update (M4)

```bash
curl -X PUT "http://test-store.matjary.local:3000/api/dashboard/customers/CUSTOMER_UUID" \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=..." \
  -d '{"notes": "ملاحظة اختبارية", "isBlocked": true}'
```

- [ ] ✅ يقبل `notes` (string) و `isBlocked` (boolean)
- [ ] ✅ يرفض `notes` أطول من 1000 حرف
- [ ] ✅ يرفض `isBlocked` كـ string
- [ ] ✅ يرفض حقول غير معترف بها (مبدأياً Zod بيتجاهلها بـ strip)

### 8.2 — Analytics Date Validation (L2)

```bash
# تاريخ صحيح
curl "http://test-store.matjary.local:3000/api/dashboard/analytics?from=2026-01-01&to=2026-02-22" \
  -H "Cookie: __session=..."
```
- [ ] ✅ يعمل

```bash
# تاريخ خاطئ
curl "http://test-store.matjary.local:3000/api/dashboard/analytics?from=not-a-date" \
  -H "Cookie: __session=..."
```
- [ ] ✅ `422` — "تاريخ غير صالح — استخدم صيغة YYYY-MM-DD"

### 8.3 — Upload Folder Validation (L6)

```bash
# folder صحيح
curl -X POST "http://test-store.matjary.local:3000/api/dashboard/upload" \
  -H "Cookie: __session=..." \
  -F "file=@test.jpg" \
  -F "folder=products"
```
- [ ] ✅ يقبل: products, categories, hero, logo

```bash
# folder خاطئ
curl -X POST "http://test-store.matjary.local:3000/api/dashboard/upload" \
  -H "Cookie: __session=..." \
  -F "file=@test.jpg" \
  -F "folder=../../etc"
```
- [ ] ✅ `422` — "مجلد غير صالح" (يمنع path traversal)

---

## 11. اختبار 9: Middleware + Routing

### 9.1 — Main Domain Routes

| URL | المتوقع |
|-----|---------|
| `http://matjary.local:3000/` | ✅ صفحة المنصة الرئيسية |
| `http://matjary.local:3000/pricing` | ✅ صفحة الأسعار |
| `http://matjary.local:3000/onboarding` | ✅ صفحة إنشاء متجر (أو redirect لـ sign-in) |
| `http://matjary.local:3000/super-admin` | ✅ redirect لـ sign-in لو مش مسجل |
| `http://matjary.local:3000/api/stores` | ✅ API يرد (401 لو مش مسجل) |

- [ ] ✅ كل الروابط تعمل صح

### 9.2 — Subdomain Routes (Store)

| URL | المتوقع |
|-----|---------|
| `http://test-store.matjary.local:3000/` | ✅ واجهة المتجر (storefront) |
| `http://test-store.matjary.local:3000/product/xxx` | ✅ صفحة المنتج (rewrite لـ `/store/product/xxx`) |
| `http://test-store.matjary.local:3000/dashboard` | ✅ لوحة التحكم (أو redirect لـ sign-in) |
| `http://test-store.matjary.local:3000/api/dashboard/products` | ✅ API (محمي بـ auth) |

- [ ] ✅ الـ `x-store-slug` header بيتضاف تلقائياً في الـ middleware
- [ ] ✅ الـ rewrite بيشتغل للـ storefront

### 9.3 — Subdomain غير موجود

1. افتح `http://nonexistent.matjary.local:3000/`

- [ ] ✅ يعرض صفحة "المتجر غير موجود" أو 404

### 9.4 — Static Files Skip

1. افتح `http://test-store.matjary.local:3000/_next/static/xxx`
2. افتح `http://test-store.matjary.local:3000/favicon.ico`

- [ ] ✅ الـ middleware يتجاوزها (لا rewrite)

---

## 12. اختبار 10: Supabase Storage

### 10.1 — رفع صورة

1. من لوحة التحكم → المنتجات → أضف منتج
2. ارفع صورة (JPG/PNG/WebP)

- [ ] ✅ الصورة اترفعت
- [ ] ✅ المسار يبدأ بـ `{storeId}/products/`
- [ ] ✅ الرابط يعمل (يفتح الصورة)

### 10.2 — حماية المسار (L3)

`deleteImage()` بتتحقق إن المسار يبدأ بـ storeId:

- [ ] ✅ مسار صحيح: `store-uuid/products/img.jpg` → يتحذف
- [ ] ✅ مسار متجر تاني: `other-store/products/img.jpg` → خطأ "غير مسموح بحذف ملفات لا تنتمي للمتجر"

### 10.3 — أنواع الملفات

| النوع | المتوقع |
|-------|---------|
| `.jpg` | ✅ مقبول |
| `.png` | ✅ مقبول |
| `.webp` | ✅ مقبول |
| `.gif` | ✅ مقبول |
| `.exe` | ❌ "نوع الملف غير مدعوم" |
| `.svg` | ❌ "نوع الملف غير مدعوم" |
| `.pdf` | ❌ "نوع الملف غير مدعوم" |

- [ ] ✅ ملف أكبر من 5MB → "حجم الملف يتجاوز الحد الأقصى"

---

## 13. قائمة المراجعة النهائية

> 🤖 = تم تلقائياً | يدوي = تحتاج اختبار يدوي

### كود
- [x] ✅ `npx tsc --noEmit` بدون أخطاء — **EXIT 0** 🤖
- [x] ✅ `npm run lint` بدون أخطاء — **0 errors** 🤖
- [ ] `npm run build` ينجح — يدوي
- [ ] لا يوجد `console.log` غير مطلوب (فقط في catch blocks) — يدوي
- [x] ✅ لا يوجد `any` type — (لا يوجد `no-explicit-any` warnings في ESLint) 🤖
- [ ] كل الـ imports بـ `@/` — يدوي

### أمان
- [ ] كل Dashboard API route فيها `verifyStoreOwnership()` — يدوي
- [ ] كل Admin API route فيها `isSuperAdmin()` — يدوي
- [ ] كل SELECT query فيه `storeId` filter — يدوي
- [x] ✅ كل UPDATE query فيه `and(eq(id), eq(storeId))` — 9/9 routes ✓ 🤖
- [x] ✅ كل DELETE query فيه `and(eq(id), eq(storeId))` — 9/9 routes ✓ 🤖
- [ ] `escapeLike()` مستخدم في كل `ILIKE` — يدوي
- [ ] Pagination limit محدود بـ 50 — يدوي
- [x] ✅ Kashier Webhook signature verification — منطق HMAC-SHA256 صحيح (15/15 tests) 🤖
- [x] ✅ Rate limiting — Sliding window counter يعمل صح (STORE_CREATE=5/hr, CHECKOUT=20/min, COUPON=30/min) 🤖

### Zod Validation
- [ ] كل POST/PUT/PATCH route فيها Zod validation — يدوي
- [ ] رسائل الأخطاء بالعربي — يدوي
- [ ] Dashboard analytics → date params validated — يدوي
- [ ] Admin stores/merchants → query params validated — يدوي
- [ ] Upload route → folder enum validated — يدوي
- [ ] Customer update → Zod schema (notes + isBlocked) — يدوي
- [ ] Admin store update → Zod schema (isActive + plan) — يدوي

### APIs
- [ ] `apiSuccess()` / `apiError()` / `ApiErrors.*` مستخدمين (مش `NextResponse.json` مباشرة) — يدوي
- [ ] كل route فيها `try/catch` — يدوي
- [ ] لا يوجد stack traces مسرّبة للمستخدم — يدوي

### وظائف
- [ ] ✅ Clerk Webhook (created/updated/deleted) شغال
- [ ] ✅ Onboarding → إنشاء متجر → redirect للداشبورد
- [ ] ✅ Store CRUD API يعمل
- [ ] ✅ Checkout (COD) يعمل end-to-end
- [ ] ✅ Checkout (Kashier) يعمل (أو يرجع fallback لو env مش مضبوط)
- [ ] ✅ Kashier Webhook يعمل (signature + idempotent)
- [ ] ✅ Coupon validation يعمل
- [ ] ✅ Shipping calculation يعمل
- [ ] ✅ Super Admin pages تعرض بيانات حقيقية
- [ ] ✅ Super Admin Plans CRUD يعمل
- [ ] ✅ Rate limiting يمنع الـ spam
- [ ] ✅ Image upload/delete يعمل مع store isolation

### Middleware
- [ ] ✅ Main domain → platform routes
- [ ] ✅ Subdomain → store rewrite
- [ ] ✅ Dashboard routes → auth required
- [ ] ✅ API routes → `x-store-slug` header يتضاف
- [ ] ✅ Super Admin → auth required
- [ ] ✅ Static files → تتجاوز الـ middleware

---

## سكريبت اختبار سريع (PowerShell)

> هذا السكريبت يعمل smoke test سريع على الـ APIs الرئيسية

```powershell
# === متغيرات — عدّلها حسب بيئتك ===
$BASE = "http://matjary.local:3000"
$STORE_BASE = "http://test-store.matjary.local:3000"
$STORE_ID = "YOUR_STORE_UUID"
$PRODUCT_ID = "YOUR_PRODUCT_UUID"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Dev 1 Smoke Test — Matjary Platform" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Main domain loads
Write-Host "[1] Testing main domain..." -NoNewline
try {
  $r = Invoke-WebRequest -Uri $BASE -UseBasicParsing
  if ($r.StatusCode -eq 200) { Write-Host " PASS" -ForegroundColor Green }
  else { Write-Host " FAIL ($($r.StatusCode))" -ForegroundColor Red }
} catch { Write-Host " FAIL ($_)" -ForegroundColor Red }

# 2. Store subdomain loads  
Write-Host "[2] Testing store subdomain..." -NoNewline
try {
  $r = Invoke-WebRequest -Uri $STORE_BASE -UseBasicParsing
  if ($r.StatusCode -eq 200) { Write-Host " PASS" -ForegroundColor Green }
  else { Write-Host " FAIL ($($r.StatusCode))" -ForegroundColor Red }
} catch { Write-Host " FAIL ($_)" -ForegroundColor Red }

# 3. Store creation without auth
Write-Host "[3] Testing store creation without auth..." -NoNewline
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/stores" -Method POST `
    -ContentType "application/json" -Body '{"name":"x","slug":"x"}' -UseBasicParsing
  Write-Host " FAIL (should be 401, got $($r.StatusCode))" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host " PASS (401)" -ForegroundColor Green
  } else {
    Write-Host " FAIL ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

# 4. Shipping API
Write-Host "[4] Testing shipping calculate..." -NoNewline
try {
  $body = @{storeId=$STORE_ID; governorate="القاهرة"} | ConvertTo-Json
  $r = Invoke-WebRequest -Uri "$STORE_BASE/api/shipping/calculate" -Method POST `
    -ContentType "application/json" -Body $body -UseBasicParsing
  $data = $r.Content | ConvertFrom-Json
  if ($data.success) { Write-Host " PASS" -ForegroundColor Green }
  else { Write-Host " FAIL" -ForegroundColor Red }
} catch { Write-Host " FAIL ($_)" -ForegroundColor Red }

# 5. Coupon validate (invalid code)
Write-Host "[5] Testing coupon validate (invalid)..." -NoNewline
try {
  $body = @{storeId=$STORE_ID; code="NONEXISTENT"; subtotal=100} | ConvertTo-Json
  $r = Invoke-WebRequest -Uri "$STORE_BASE/api/coupons/validate" -Method POST `
    -ContentType "application/json" -Body $body -UseBasicParsing
  $data = $r.Content | ConvertFrom-Json
  if ($data.success -and $data.data.valid -eq $false) {
    Write-Host " PASS (valid=false)" -ForegroundColor Green
  } else { Write-Host " FAIL" -ForegroundColor Red }
} catch { Write-Host " FAIL ($_)" -ForegroundColor Red }

# 6. Checkout validation (missing fields)
Write-Host "[6] Testing checkout validation..." -NoNewline
try {
  $r = Invoke-WebRequest -Uri "$STORE_BASE/api/checkout" -Method POST `
    -ContentType "application/json" -Body '{}' -UseBasicParsing
  Write-Host " FAIL (should be 422)" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 422) {
    Write-Host " PASS (422)" -ForegroundColor Green
  } else {
    Write-Host " FAIL ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

# 7. Dashboard without auth
Write-Host "[7] Testing dashboard API without auth..." -NoNewline
try {
  $r = Invoke-WebRequest -Uri "$STORE_BASE/api/dashboard/products" -UseBasicParsing
  Write-Host " FAIL (should be 401)" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host " PASS (401)" -ForegroundColor Green
  } else {
    Write-Host " FAIL ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

# 8. Kashier webhook without signature
Write-Host "[8] Testing Kashier webhook without signature..." -NoNewline  
try {
  $body = @{merchantOrderId="ORD-TEST"; paymentStatus="SUCCESS"; amount="100"; currency="EGP"} | ConvertTo-Json
  $r = Invoke-WebRequest -Uri "$BASE/api/payments/kashier/webhook" -Method POST `
    -ContentType "application/json" -Body $body -UseBasicParsing
  if ($r.StatusCode -eq 401) { Write-Host " PASS (401)" -ForegroundColor Green }
  else { Write-Host " FAIL (got $($r.StatusCode))" -ForegroundColor Red }
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    Write-Host " PASS (401)" -ForegroundColor Green
  } else {
    Write-Host " FAIL ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

# 9. Admin API without auth
Write-Host "[9] Testing admin API without auth..." -NoNewline
try {
  $r = Invoke-WebRequest -Uri "$BASE/api/admin/stores" -UseBasicParsing
  $data = $r.Content | ConvertFrom-Json
  if ($data.success -eq $false) { Write-Host " PASS (forbidden)" -ForegroundColor Green }
  else { Write-Host " FAIL" -ForegroundColor Red }
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 403) {
    Write-Host " PASS (403)" -ForegroundColor Green
  } else {
    Write-Host " FAIL ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Smoke Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
```

---

## ملاحظات إضافية

### ⚠️ متغيرات Kashier
لو الـ `KASHIER_MERCHANT_ID`, `KASHIER_API_KEY`, `KASHIER_API_SECRET` لسه بالقيم الافتراضية (`MID-xxx`, `xxx`), الـ Kashier integration هيفشل بشكل طبيعي. هذا متوقع في بيئة التطوير. المهم:
- ✅ إن الـ checkout بيرجع الطلب حتى لو Kashier فشل (fallback)
- ✅ إن الـ webhook بيرفض بدون signature صحيح

### ⚠️ Rate Limiting في التطوير
الـ Rate Limiter في الذاكرة (In-Memory) — لو عملت restart للسيرفر، الـ counters بتترست. هذا طبيعي في التطوير. في الـ production، يتم الاستبدال بـ Upstash Redis.

### ⚠️ الخطوة اللي بعد الاختبار
بعد ما تخلص كل الاختبارات، حدّث `Agent.md` بالحالة النهائية وسلّم.

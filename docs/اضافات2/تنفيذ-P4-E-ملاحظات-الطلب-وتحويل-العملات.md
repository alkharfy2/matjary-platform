# دليل تنفيذ P4-E — ملاحظات الطلب + تحويل العملات (Order Notes + Multi-Currency)

> **تاريخ الإنشاء**: 2 أبريل 2026  
> **آخر تحديث**: 2 أبريل 2026  
> **المرجعية**: اضافات-2.md → المرحلة P4-E  
> **الهدف**: دليل تنفيذ تفصيلي للميزتين: ملاحظات الطلب (#15) + تحويل العملات (#9)  
> **المستوى**: جاهز للتنفيذ (Copy-Paste Ready)  
> **الجهد**: ~0.5-2.5 يوم

---

## ⚠️ ملاحظات تعارضات تم حلها

> **هام جداً** — تم اكتشاف وإصلاح التعارضات التالية بين المواصفات والكود الفعلي:

### 1. حقل notes موجود في الـ form ولكن غير موصّل
- **الوضع الحالي**: `ShippingForm` type فيه `notes: string` ✅ والـ form state مبدئي بـ `notes: ''` ✅
- **لكن**: الـ UI عبارة عن `<input type="text">` وليس `<textarea>` ⚠️
- **والأهم**: `notes` **غير موجود** في `orderPayload` في `handleSubmit()` ⚠️
- **والأهم**: `notes` **غير موجود** في `checkoutSchema` (validations/order.ts) ⚠️
- **والأهم**: `notes` **غير موجود** في `submitOrder()` destructure أو `storeOrders.insert()` ⚠️
- **الحقل `notes` موجود في DB** (`storeOrders` table: `notes: text('notes')`) ✅
- **المطلوب**: وصلة كاملة من UI → validation → payload → server action → DB insert

### 2. المواصفات تذكر `checkout-form.tsx` لكن الكود في `checkout/page.tsx`
- **الوضع الحالي**: لا يوجد ملف `checkout-form.tsx` منفصل
- **الفورم بالكامل** موجود في `src/app/store/checkout/page.tsx` (~1400 سطر)
- تم تصحيح كل المراجع لتشير للملف الصحيح

### 3. `formatPrice()` موجود ويدعم 4 عملات
- **الوضع الحالي**: `formatPrice(price, currency)` في `src/lib/utils.ts` يدعم EGP, SAR, AED, USD
- يستخدم `Intl.NumberFormat` مع locale mapping (SAR→'ar-SA', AED→'ar-AE', USD→'en-US', default→'ar-EG')
- Multi-Currency module يبني فوقه — لا يحل محله

### 4. `platformExchangeRates` جدول على مستوى المنصة (Platform-level)
- ليس جدول per-store — جدول واحد مشترك لكل المنصة
- يُدار من Super Admin أو Cron Job
- الـ Storefront API تقرأ منه فقط

### 5. StoreHeader يمرر `currency` prop بالفعل
- `<StoreHeader currency={store.settings.currency} .../>` ✅
- المكان المثالي لـ `CurrencySwitcher`: بجانب `LanguageSwitcher` في header

### 6. StoreContext يوفر `settings` كاملة
- `useStore()` يعطي `{ id, slug, name, theme, settings, whatsappNumber }`
- `settings.currency` متاح لـ currency-switcher
- `settings.multiCurrencyEnabled`, `settings.supportedCurrencies` ستكون متاحة بعد إضافتها

---

## الفهرس

1. [نظرة عامة والأولويات](#نظرة-عامة-والأولويات)
2. [تغييرات مشتركة على StoreSettings](#0-تغييرات-مشتركة-على-storesettings)
3. [ملاحظات الطلب (Order Notes)](#1-ملاحظات-الطلب-order-notes)
4. [تحويل العملات (Multi-Currency)](#2-تحويل-العملات-multi-currency)
5. [خطة الاختبار](#3-خطة-الاختبار)

---

## نظرة عامة والأولويات

### لماذا مع بعض؟

```
ملاحظات الطلب (#15) ── 2 ساعة فقط — textarea في Checkout + وصلة للـ DB
تحويل العملات (#9)  ── 2 يوم — للمتاجر اللي بتبيع دولياً
```

- **ملاحظات الطلب**: الحقل `notes` موجود فعلاً في DB — فقط نوصله من الـ form للـ insert
- **تحويل العملات**: جدول `platformExchangeRates` جديد + currency-switcher + conversion utils + GeoIP detection
- مميزات صغيرة مستقلة — "لمسات أخيرة" قبل إنهاء P4

### ترتيب التنفيذ

| الخطوة | الميزة | الجهد | السبب |
|--------|-------|-------|-------|
| 0 | تغييرات StoreSettings | 15 دقيقة | الأساس — كل الحقول الجديدة |
| 1 | ملاحظات الطلب (#15) | 2 ساعة | الأسهل — تعديلات بسيطة على ملفات موجودة |
| 2 | تحويل العملات (#9) | 2 يوم | الأكبر — جدول جديد + API + مكونات + utils |

### ملخص التغييرات

```
ملفات جديدة (8):
  migrations/p4e_exchange_rates.sql                     → Migration لجدول أسعار الصرف
  src/lib/currency/convert.ts                           → دوال تحويل العملات
  src/lib/currency/format.ts                            → تنسيق السعر بالعملة المحولة
  src/lib/currency/detect.ts                            → تحديد العملة حسب IP
  src/app/store/_components/currency-switcher.tsx        → مكون اختيار العملة
  src/app/api/storefront/currency/rates/route.ts        → API أسعار الصرف
  src/app/api/storefront/currency/detect/route.ts       → API تحديد العملة تلقائياً
  src/app/api/admin/currency/update/route.ts            → API تحديث أسعار الصرف (Cron/Super-Admin)

ملفات معدّلة (7):
  src/db/schema.ts                                      → + platformExchangeRates table + StoreSettings P4-E
  src/lib/validations/store.ts                          → + حقول P4-E في updateStoreSettingsSchema
  src/lib/validations/order.ts                          → + notes في checkoutSchema
  src/app/store/checkout/page.tsx                       → textarea بدل input + notes في orderPayload
  src/app/store/checkout/_actions.ts                    → + notes في destructure + storeOrders.insert()
  src/app/store/_components/store-header.tsx             → + CurrencySwitcher
  src/app/(dashboard)/dashboard/settings/_components/settings-client.tsx → + حقول P4-E في الفورم
```

---

## 0. تغييرات مشتركة على StoreSettings

### 0.1 تعديل `src/db/schema.ts` — StoreSettings type

أضف بعد `comparisonMaxItems: number`:

```typescript
  // P4-E: Order Notes
  orderNotesEnabled: boolean
  orderNotesPlaceholder: string

  // P4-E: Multi-Currency
  multiCurrencyEnabled: boolean
  supportedCurrencies: string[]
  autoDetectCurrency: boolean
```

فيصبح آخر جزء من `StoreSettings`:

```typescript
  // P4-D: Product Comparison
  comparisonEnabled: boolean
  comparisonMaxItems: number

  // P4-E: Order Notes
  orderNotesEnabled: boolean
  orderNotesPlaceholder: string

  // P4-E: Multi-Currency
  multiCurrencyEnabled: boolean
  supportedCurrencies: string[]
  autoDetectCurrency: boolean
}
```

### 0.2 تعديل `src/db/schema.ts` — Default values

أضف بعد `comparisonMaxItems: 4,`:

```typescript
    // P4-E
    orderNotesEnabled: true,
    orderNotesPlaceholder: 'مثال: أرجو التغليف كهدية...',
    multiCurrencyEnabled: false,
    supportedCurrencies: ['EGP'],
    autoDetectCurrency: true,
```

فيصبح آخر جزء من defaults:

```typescript
    // P4-D
    comparisonEnabled: true,
    comparisonMaxItems: 4,
    // P4-E
    orderNotesEnabled: true,
    orderNotesPlaceholder: 'مثال: أرجو التغليف كهدية...',
    multiCurrencyEnabled: false,
    supportedCurrencies: ['EGP'],
    autoDetectCurrency: true,
  }).notNull(),
```

### 0.3 تعديل `src/db/schema.ts` — إضافة جدول `platformExchangeRates`

أضف الجدول الجديد بعد آخر جدول موجود (قبل `export type`):

```typescript
// ── P4-E: Platform Exchange Rates ──────────────────────────────
export const platformExchangeRates = pgTable('platform_exchange_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: decimal('rate', { precision: 12, scale: 6 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('platform_exchange_rates_unique_idx').on(table.baseCurrency, table.targetCurrency),
])
```

> **ملاحظة**: تأكد من استيراد `uniqueIndex` من `drizzle-orm/pg-core` إذا لم يكن مستورداً:
> ```typescript
> import { pgTable, uuid, text, timestamp, decimal, uniqueIndex, ... } from 'drizzle-orm/pg-core'
> ```

### 0.4 تعديل `src/lib/validations/store.ts` — updateStoreSettingsSchema

أضف بعد آخر حقل P4-D (`comparisonMaxItems`):

```typescript
  // P4-E: Order Notes
  orderNotesEnabled: z.boolean().optional(),
  orderNotesPlaceholder: z.string().max(200).trim().optional().nullable(),

  // P4-E: Multi-Currency
  multiCurrencyEnabled: z.boolean().optional(),
  supportedCurrencies: z.array(z.enum(['EGP', 'SAR', 'AED', 'USD'])).optional(),
  autoDetectCurrency: z.boolean().optional(),
```

### 0.5 تعديل Dashboard Settings — `settings-client.tsx`

أضف في نوع `StoreSettingsPayload` بعد `reviewAutoApprove`:

```typescript
  // P4-E
  orderNotesEnabled?: boolean
  orderNotesPlaceholder?: string | null
  multiCurrencyEnabled?: boolean
  supportedCurrencies?: string[]
  autoDetectCurrency?: boolean
```

أضف في form state initialization:

```typescript
const [orderNotesEnabled, setOrderNotesEnabled] = useState(
  (initialData.settings as Record<string, unknown>)?.orderNotesEnabled !== false
)
const [orderNotesPlaceholder, setOrderNotesPlaceholder] = useState(
  ((initialData.settings as Record<string, unknown>)?.orderNotesPlaceholder as string) ?? 'مثال: أرجو التغليف كهدية...'
)
const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(
  Boolean((initialData.settings as Record<string, unknown>)?.multiCurrencyEnabled)
)
const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(
  ((initialData.settings as Record<string, unknown>)?.supportedCurrencies as string[]) ?? ['EGP']
)
const [autoDetectCurrency, setAutoDetectCurrency] = useState(
  (initialData.settings as Record<string, unknown>)?.autoDetectCurrency !== false
)
```

أضف في `buildPayload()` أو ما يعادلها:

```typescript
  orderNotesEnabled,
  orderNotesPlaceholder: orderNotesPlaceholder.trim() || null,
  multiCurrencyEnabled,
  supportedCurrencies,
  autoDetectCurrency,
```

أضف القسم الجديد في الفورم بعد آخر قسم (Reviews):

```tsx
{/* ── 📝 إعدادات ملاحظات الطلب ── */}
<section className="ds-panel space-y-4 p-5">
  <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--ds-text)]">
    📝 إعدادات ملاحظات الطلب
  </h3>

  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-[var(--ds-text)]">
        تفعيل ملاحظات الطلب
      </p>
      <p className="text-xs text-[var(--ds-text-muted)]">
        السماح للعميل بإضافة ملاحظات على طلبه أثناء الشراء
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={orderNotesEnabled}
      onClick={() => setOrderNotesEnabled(!orderNotesEnabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        orderNotesEnabled ? 'bg-[var(--ds-primary)]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          orderNotesEnabled ? '-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>

  {orderNotesEnabled && (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
        نص placeholder الملاحظات
      </label>
      <input
        type="text"
        value={orderNotesPlaceholder}
        onChange={(e) => setOrderNotesPlaceholder(e.target.value)}
        className="w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm"
        placeholder="مثال: أرجو التغليف كهدية..."
        maxLength={200}
      />
    </div>
  )}
</section>

{/* ── 💱 إعدادات تحويل العملات ── */}
<section className="ds-panel space-y-4 p-5">
  <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--ds-text)]">
    💱 إعدادات تحويل العملات
  </h3>

  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-[var(--ds-text)]">
        تفعيل تحويل العملات
      </p>
      <p className="text-xs text-[var(--ds-text-muted)]">
        عرض الأسعار بعملات مختلفة للعملاء الدوليين (إرشادية فقط — الدفع بالعملة الأساسية)
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={multiCurrencyEnabled}
      onClick={() => setMultiCurrencyEnabled(!multiCurrencyEnabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        multiCurrencyEnabled ? 'bg-[var(--ds-primary)]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          multiCurrencyEnabled ? '-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>

  {multiCurrencyEnabled && (
    <>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
          العملات المدعومة
        </label>
        <p className="mb-2 text-xs text-[var(--ds-text-muted)]">
          اختر العملات التي يمكن للعملاء التبديل إليها
        </p>
        <div className="flex flex-wrap gap-2">
          {(['EGP', 'SAR', 'AED', 'USD'] as const).map((cur) => {
            const labels: Record<string, string> = {
              EGP: '🇪🇬 جنيه مصري (EGP)',
              SAR: '🇸🇦 ريال سعودي (SAR)',
              AED: '🇦🇪 درهم إماراتي (AED)',
              USD: '🇺🇸 دولار أمريكي (USD)',
            }
            const isSelected = supportedCurrencies.includes(cur)
            return (
              <button
                key={cur}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    // لا تسمح بإزالة العملة الأساسية للمتجر
                    if (cur === (initialData.settings as Record<string, unknown>)?.currency) return
                    setSupportedCurrencies(supportedCurrencies.filter((c) => c !== cur))
                  } else {
                    setSupportedCurrencies([...supportedCurrencies, cur])
                  }
                }}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? 'bg-[var(--ds-primary)] text-white'
                    : 'border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)]'
                }`}
              >
                {labels[cur]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--ds-text)]">
            تحديد العملة تلقائياً
          </p>
          <p className="text-xs text-[var(--ds-text-muted)]">
            تحديد عملة العميل حسب موقعه الجغرافي (GeoIP)
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoDetectCurrency}
          onClick={() => setAutoDetectCurrency(!autoDetectCurrency)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            autoDetectCurrency ? 'bg-[var(--ds-primary)]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              autoDetectCurrency ? '-translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </>
  )}
</section>
```

---

## 1. ملاحظات الطلب (Order Notes)

### 1.1 تعديل `src/lib/validations/order.ts` — إضافة notes إلى checkoutSchema

**الملف الحالي** — `checkoutSchema` ينتهي عند `loyaltyPointsToRedeem`. أضف `notes` قبل `})`:

```typescript
export const checkoutSchema = z
  .object({
    storeId: z.string().uuid('معرف المتجر غير صالح'),
    items: z.array(checkoutItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
    shipping: checkoutShippingSchema,
    shippingLocation: shippingLocationSchema.optional().nullable(),
    customerName: z.string().min(2, 'الاسم مطلوب'),
    customerPhone: z.string().min(10, 'رقم الهاتف غير صالح').max(15),
    customerEmail: z.string().email('البريد الإلكتروني غير صالح').optional().nullable(),
    paymentMethod: z.enum(['cod', 'kashier'], { message: 'طريقة الدفع غير صالحة' }),
    couponCode: z.string().optional().nullable(),
    loyaltyPointsToRedeem: z.coerce.number().int().min(0).optional().nullable(),
    // P4-E: Order Notes
    notes: z.string().max(500, 'الملاحظات لا تتجاوز 500 حرف').trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // ... superRefine الموجود بدون تغيير
  })
```

**التعديل المطلوب فقط**: إضافة سطر واحد قبل `})`:

```diff
     couponCode: z.string().optional().nullable(),
     loyaltyPointsToRedeem: z.coerce.number().int().min(0).optional().nullable(),
+    // P4-E: Order Notes
+    notes: z.string().max(500, 'الملاحظات لا تتجاوز 500 حرف').trim().optional().nullable(),
   })
   .superRefine((data, ctx) => {
```

### 1.2 تعديل `src/app/store/checkout/page.tsx` — تحويل input إلى textarea

**الوضع الحالي** (حوالي سطر 1095-1105):

```tsx
<div className="sm:col-span-2">
  <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
    ملاحظات
  </label>
  <input
    type="text"
    value={form.notes}
    onChange={(e) => updateField('notes', e.target.value)}
    className={fieldClasses(false)}
    placeholder="ملاحظات إضافية (اختياري)"
  />
</div>
```

**استبدل بـ**:

```tsx
<div className="sm:col-span-2">
  <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
    ملاحظات على الطلب
  </label>
  <textarea
    value={form.notes}
    onChange={(e) => updateField('notes', e.target.value)}
    className={fieldClasses(false)}
    placeholder={
      (settings as Record<string, unknown>)?.orderNotesPlaceholder as string
      ?? 'مثال: أرجو التغليف كهدية، أو الاتصال قبل التوصيل'
    }
    rows={3}
    maxLength={500}
    style={{ resize: 'vertical', minHeight: '4.5rem' }}
  />
  <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
    {form.notes.length}/500
  </p>
</div>
```

> **ملاحظة**: `settings` متاح في checkout/page.tsx من `store.settings` (StoreContext).  
> تأكد من وجود `const settings = store.settings` أو الوصول مباشرة عبر `store.settings`.

**لف القسم بشرط `orderNotesEnabled`**:

```tsx
{(settings as Record<string, unknown>)?.orderNotesEnabled !== false && (
  <div className="sm:col-span-2">
    <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
      ملاحظات على الطلب
    </label>
    <textarea
      value={form.notes}
      onChange={(e) => updateField('notes', e.target.value)}
      className={fieldClasses(false)}
      placeholder={
        (settings as Record<string, unknown>)?.orderNotesPlaceholder as string
        ?? 'مثال: أرجو التغليف كهدية، أو الاتصال قبل التوصيل'
      }
      rows={3}
      maxLength={500}
      style={{ resize: 'vertical', minHeight: '4.5rem' }}
    />
    <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
      {form.notes.length}/500
    </p>
  </div>
)}
```

> **ملاحظة مهمة**: `settings` يتم الوصول إليه في checkout/page.tsx. ابحث عن كيفية الوصول لـ store.settings في هذا الملف. إذا كان عبر `useStore()`:
> ```typescript
> const store = useStore()
> // أو
> const { settings } = useStore() // لو مدعوم
> ```
> وإلا استخدم `store.settings` مباشرة.

### 1.3 تعديل `src/app/store/checkout/page.tsx` — إضافة notes إلى orderPayload

**الوضع الحالي** في `handleSubmit()` (حوالي سطر 800-830):

```typescript
const orderPayload = {
  storeId: store.id,
  items: items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  })),
  shipping: {
    governorate: form.governorate.trim() || undefined,
    city: form.city.trim() || undefined,
    area: form.area.trim() || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    street: form.street.trim() || undefined,
    building: form.building.trim() || undefined,
  },
  shippingLocation: shippingLocation
    ? {
        latitude: shippingLocation.latitude,
        longitude: shippingLocation.longitude,
      }
    : undefined,
  customerName: form.customerName.trim(),
  customerPhone: form.customerPhone.trim(),
  paymentMethod,
  couponCode: couponApplied ? couponCode.trim() : undefined,
  loyaltyPointsToRedeem: loyaltyDiscount > 0 ? parseInt(loyaltyPointsInput) : undefined,
}
```

**أضف `notes`** بعد `loyaltyPointsToRedeem`:

```diff
  couponCode: couponApplied ? couponCode.trim() : undefined,
  loyaltyPointsToRedeem: loyaltyDiscount > 0 ? parseInt(loyaltyPointsInput) : undefined,
+ notes: form.notes.trim() || undefined,
}
```

### 1.4 تعديل `src/app/store/checkout/_actions.ts` — إضافة notes في destructure و insert

**التعديل 1** — في destructure (حوالي سطر 80-92):

```diff
const {
  storeId,
  items,
  shipping,
  shippingLocation,
  customerName,
  customerPhone,
  customerEmail,
  paymentMethod,
  couponCode,
  loyaltyPointsToRedeem,
+ notes,
} = parsed.data
```

**التعديل 2** — في `tx.insert(storeOrders).values({...})` (حوالي سطر 320-330):

الوضع الحالي:

```typescript
const newOrder = await tx.insert(storeOrders).values({
  storeId, orderNumber, customerId, customerName, customerPhone, customerEmail,
  shippingAddress: normalizedShipping,
  shippingLatitude: shippingLocation ? String(shippingLocation.latitude) : null,
  shippingLongitude: shippingLocation ? String(shippingLocation.longitude) : null,
  subtotal: String(subtotal), shippingCost: String(shippingCost), discount: String(discount + loyaltyDiscount), total: String(total),
  couponCode: appliedCouponCode, paymentMethod,
  paymentStatus: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
  orderStatus: 'pending',
}).returning()
```

**أضف `notes`**:

```diff
const newOrder = await tx.insert(storeOrders).values({
  storeId, orderNumber, customerId, customerName, customerPhone, customerEmail,
  shippingAddress: normalizedShipping,
  shippingLatitude: shippingLocation ? String(shippingLocation.latitude) : null,
  shippingLongitude: shippingLocation ? String(shippingLocation.longitude) : null,
  subtotal: String(subtotal), shippingCost: String(shippingCost), discount: String(discount + loyaltyDiscount), total: String(total),
  couponCode: appliedCouponCode, paymentMethod,
  paymentStatus: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
  orderStatus: 'pending',
+ notes: notes?.trim() || null,
}).returning()
```

---

## 2. تحويل العملات (Multi-Currency)

### 2.1 Migration — `migrations/p4e_exchange_rates.sql`

**ملف جديد**: `migrations/p4e_exchange_rates.sql`

```sql
-- P4-E: Exchange Rates Table (Platform-level)
-- أسعار الصرف المشتركة لكل المنصة (تُحدَّث يومياً من API خارجية)

CREATE TABLE IF NOT EXISTS platform_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,      -- 'USD' (كل الأسعار نسبة للدولار)
  target_currency TEXT NOT NULL,    -- 'EGP', 'SAR', 'AED', etc.
  rate DECIMAL(12,6) NOT NULL,      -- سعر الصرف
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: كل زوج عملات مرة واحدة فقط
CREATE UNIQUE INDEX IF NOT EXISTS platform_exchange_rates_unique_idx
  ON platform_exchange_rates(base_currency, target_currency);

-- Index للبحث السريع بالعملة المستهدفة
CREATE INDEX IF NOT EXISTS idx_exchange_rates_target
  ON platform_exchange_rates(target_currency);

-- بيانات أولية (أسعار تقريبية — ستُحدَّث تلقائياً)
INSERT INTO platform_exchange_rates (base_currency, target_currency, rate) VALUES
  ('USD', 'EGP', 50.45),
  ('USD', 'SAR', 3.75),
  ('USD', 'AED', 3.67),
  ('USD', 'USD', 1.00)
ON CONFLICT (base_currency, target_currency) DO UPDATE
  SET rate = EXCLUDED.rate, updated_at = NOW();
```

### 2.2 ملف جديد: `src/lib/currency/convert.ts`

```typescript
/**
 * P4-E: Currency Conversion Utilities
 * تحويل الأسعار بين العملات باستخدام أسعار الصرف
 * 
 * الأسعار إرشادية فقط — الدفع دائماً بالعملة الأساسية للمتجر
 */

export type ExchangeRate = {
  baseCurrency: string
  targetCurrency: string
  rate: number
}

/**
 * تحويل المبلغ من عملة لأخرى
 * الأسعار مخزنة كنسبة للدولار:
 *   EGP → SAR: amount / EGP_rate * SAR_rate
 */
export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRate[]
): number {
  if (fromCurrency === toCurrency) return amount
  if (amount === 0) return 0

  const fromRate = rates.find(
    (r) => r.baseCurrency === 'USD' && r.targetCurrency === fromCurrency
  )
  const toRate = rates.find(
    (r) => r.baseCurrency === 'USD' && r.targetCurrency === toCurrency
  )

  if (!fromRate || !toRate || fromRate.rate === 0) return amount

  // amount في fromCurrency → USD → toCurrency
  const amountInUsd = amount / fromRate.rate
  return Math.round(amountInUsd * toRate.rate * 100) / 100
}

/**
 * تحويل سعر مخزن كـ string (من Drizzle decimal)
 */
export function convertPriceString(
  price: string | number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRate[]
): number {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numericPrice)) return 0
  return convertPrice(numericPrice, fromCurrency, toCurrency, rates)
}
```

### 2.3 ملف جديد: `src/lib/currency/format.ts`

```typescript
/**
 * P4-E: Currency Formatting
 * تنسيق الأسعار بالعملة المعروضة مع رموز ملائمة
 */

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string; flag: string; nameAr: string }> = {
  EGP: { locale: 'ar-EG', symbol: 'ج.م', flag: '🇪🇬', nameAr: 'جنيه مصري' },
  SAR: { locale: 'ar-SA', symbol: 'ر.س', flag: '🇸🇦', nameAr: 'ريال سعودي' },
  AED: { locale: 'ar-AE', symbol: 'د.إ', flag: '🇦🇪', nameAr: 'درهم إماراتي' },
  USD: { locale: 'en-US', symbol: '$', flag: '🇺🇸', nameAr: 'دولار أمريكي' },
}

/**
 * تنسيق المبلغ بالعملة المحددة (يستخدم Intl.NumberFormat)
 */
export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  const config = CURRENCY_CONFIG[currency]
  if (!config) {
    return `${amount.toFixed(2)} ${currency}`
  }
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * الحصول على معلومات العملة
 */
export function getCurrencyInfo(currency: string) {
  return CURRENCY_CONFIG[currency] ?? { locale: 'ar-EG', symbol: currency, flag: '🌍', nameAr: currency }
}

/**
 * الحصول على كل العملات المتاحة
 */
export function getAvailableCurrencies() {
  return Object.entries(CURRENCY_CONFIG).map(([code, info]) => ({
    code,
    ...info,
  }))
}
```

### 2.4 ملف جديد: `src/lib/currency/detect.ts`

```typescript
/**
 * P4-E: Currency Detection by IP
 * تحديد العملة المناسبة حسب موقع العميل الجغرافي
 */

// خريطة الدول → العملات
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  EG: 'EGP',
  SA: 'SAR',
  AE: 'AED',
  US: 'USD',
  // أضف المزيد حسب الحاجة
  BH: 'USD', // البحرين — fallback لـ USD
  KW: 'USD', // الكويت — fallback لـ USD
  QA: 'USD', // قطر — fallback لـ USD
  OM: 'USD', // عمان — fallback لـ USD
  JO: 'USD', // الأردن — fallback لـ USD
}

/**
 * تحديد العملة حسب كود الدولة
 */
export function getCurrencyByCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] ?? 'USD'
}

/**
 * اسم الدولة بالعربي (للعرض)
 */
const COUNTRY_NAMES_AR: Record<string, string> = {
  EG: 'مصر',
  SA: 'السعودية',
  AE: 'الإمارات',
  US: 'أمريكا',
  BH: 'البحرين',
  KW: 'الكويت',
  QA: 'قطر',
  OM: 'عمان',
  JO: 'الأردن',
}

export function getCountryNameAr(countryCode: string): string {
  return COUNTRY_NAMES_AR[countryCode.toUpperCase()] ?? countryCode
}
```

### 2.5 API Route: `src/app/api/storefront/currency/rates/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { platformExchangeRates } from '@/db/schema'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // كاش لمدة ساعة

export async function GET() {
  try {
    const rates = await db
      .select({
        baseCurrency: platformExchangeRates.baseCurrency,
        targetCurrency: platformExchangeRates.targetCurrency,
        rate: platformExchangeRates.rate,
        updatedAt: platformExchangeRates.updatedAt,
      })
      .from(platformExchangeRates)

    return NextResponse.json({
      success: true,
      data: rates.map((r) => ({
        baseCurrency: r.baseCurrency,
        targetCurrency: r.targetCurrency,
        rate: parseFloat(String(r.rate)),
        updatedAt: r.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return NextResponse.json(
      { success: false, error: 'فشل في جلب أسعار الصرف' },
      { status: 500 }
    )
  }
}
```

### 2.6 API Route: `src/app/api/storefront/currency/detect/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrencyByCountry } from '@/lib/currency/detect'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Vercel/Cloudflare يوفر header الموقع الجغرافي
    const country =
      request.headers.get('x-vercel-ip-country') ??
      request.headers.get('cf-ipcountry') ??
      request.geo?.country ??
      'EG'

    const currency = getCurrencyByCountry(country)

    return NextResponse.json({
      success: true,
      data: {
        country,
        currency,
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        country: 'EG',
        currency: 'EGP',
      },
    })
  }
}
```

### 2.7 API Route: `src/app/api/admin/currency/update/route.ts`

> **ملاحظة**: هذا الـ endpoint لتحديث أسعار الصرف — يُستدعى من Cron Job أو يدوياً من Super Admin.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { platformExchangeRates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// مفتاح بسيط للحماية — يُوضع في .env: CRON_SECRET=xxx
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  try {
    // تحقق من المفتاح
    const authHeader = request.headers.get('authorization')
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // جلب الأسعار من API مجانية
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'فشل في جلب أسعار الصرف من المصدر الخارجي' },
        { status: 502 }
      )
    }

    const data = await response.json() as { result: string; rates: Record<string, number> }

    if (data.result !== 'success' || !data.rates) {
      return NextResponse.json(
        { error: 'بيانات أسعار الصرف غير صالحة' },
        { status: 502 }
      )
    }

    const targetCurrencies = ['EGP', 'SAR', 'AED', 'USD']
    let updated = 0

    for (const currency of targetCurrencies) {
      const rate = data.rates[currency]
      if (typeof rate !== 'number' || rate <= 0) continue

      // Upsert: تحديث أو إدخال
      const existing = await db
        .select({ id: platformExchangeRates.id })
        .from(platformExchangeRates)
        .where(
          and(
            eq(platformExchangeRates.baseCurrency, 'USD'),
            eq(platformExchangeRates.targetCurrency, currency)
          )
        )
        .limit(1)

      if (existing[0]) {
        await db
          .update(platformExchangeRates)
          .set({ rate: String(rate), updatedAt: new Date() })
          .where(eq(platformExchangeRates.id, existing[0].id))
      } else {
        await db.insert(platformExchangeRates).values({
          baseCurrency: 'USD',
          targetCurrency: currency,
          rate: String(rate),
        })
      }
      updated++
    }

    return NextResponse.json({
      success: true,
      data: { updated, timestamp: new Date().toISOString() },
    })
  } catch (error) {
    console.error('Exchange rate update failed:', error)
    return NextResponse.json(
      { error: 'فشل في تحديث أسعار الصرف' },
      { status: 500 }
    )
  }
}
```

### 2.8 مكون جديد: `src/app/store/_components/currency-switcher.tsx`

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { getCurrencyInfo, getAvailableCurrencies } from '@/lib/currency/format'

type CurrencySwitcherProps = {
  storeCurrency: string
  supportedCurrencies: string[]
  autoDetect?: boolean
}

const COOKIE_NAME = 'matjary_currency'

function getCurrencyCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCurrencyCookie(currency: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(currency)};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`
}

export function CurrencySwitcher({
  storeCurrency,
  supportedCurrencies,
  autoDetect = true,
}: CurrencySwitcherProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(storeCurrency)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // على الأقل عملتين للعرض
  if (supportedCurrencies.length < 2) return null

  // قراءة العملة من الكوكي أو الكشف التلقائي
  useEffect(() => {
    const saved = getCurrencyCookie()
    if (saved && supportedCurrencies.includes(saved)) {
      setSelectedCurrency(saved)
      return
    }

    if (!autoDetect) return

    // كشف تلقائي عبر API
    fetch('/api/storefront/currency/detect')
      .then((res) => res.json())
      .then((data: { success: boolean; data?: { currency: string } }) => {
        if (data.success && data.data?.currency && supportedCurrencies.includes(data.data.currency)) {
          setSelectedCurrency(data.data.currency)
          setCurrencyCookie(data.data.currency)
        }
      })
      .catch(() => {})
  }, [autoDetect, supportedCurrencies])

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(currency: string) {
    setSelectedCurrency(currency)
    setCurrencyCookie(currency)
    setOpen(false)
    // Dispatch custom event لتحديث الأسعار في الصفحة
    window.dispatchEvent(new CustomEvent('currency-change', { detail: { currency } }))
  }

  const currentInfo = getCurrencyInfo(selectedCurrency)
  const allCurrencies = getAvailableCurrencies().filter((c) =>
    supportedCurrencies.includes(c.code)
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] px-2.5 py-1.5 text-sm font-medium text-[var(--header-link,#374151)] shadow-[var(--ds-shadow-sm)] transition-all hover:bg-[var(--ds-hover)]"
        aria-label="تغيير العملة"
        aria-expanded={open}
      >
        <span>{currentInfo.flag}</span>
        <span>{selectedCurrency}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-lg">
          {allCurrencies.map((cur) => (
            <button
              key={cur.code}
              type="button"
              onClick={() => handleSelect(cur.code)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--ds-hover)] ${
                cur.code === selectedCurrency ? 'bg-[var(--ds-hover)] font-medium' : ''
              }`}
            >
              <span className="text-base">{cur.flag}</span>
              <span className="flex-1 text-start">{cur.nameAr}</span>
              <span className="text-xs text-[var(--ds-text-muted)]">{cur.code}</span>
            </button>
          ))}
          <div className="border-t border-[var(--ds-border)] px-4 py-2">
            <p className="text-[10px] text-[var(--ds-text-muted)]">
              الأسعار إرشادية — الدفع بالعملة الأساسية
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2.9 تعديل `src/app/store/_components/store-header.tsx` — إضافة CurrencySwitcher

**أضف import**:

```typescript
import { CurrencySwitcher } from './currency-switcher'
```

**تعديل Props**:

```diff
 type StoreHeaderProps = {
   storeSlug: string
   storeName: string
   logoUrl?: string | null
   categories: CategoryLink[]
   currency?: string
   blogEnabled?: boolean
   supportedLanguages?: string[]
+  multiCurrencyEnabled?: boolean
+  supportedCurrencies?: string[]
+  autoDetectCurrency?: boolean
 }
```

**تعديل destructure**:

```diff
 export function StoreHeader({
   storeSlug,
   storeName,
   logoUrl,
   categories,
   currency,
   blogEnabled,
   supportedLanguages,
+  multiCurrencyEnabled,
+  supportedCurrencies,
+  autoDetectCurrency,
 }: StoreHeaderProps) {
```

**أضف `CurrencySwitcher`** بعد `LanguageSwitcher` وقبل `ThemeToggle` (في desktop):

```diff
 <div className="flex items-center gap-2 sm:gap-3">
   {supportedLanguages && supportedLanguages.length > 1 && (
     <LanguageSwitcher supportedLanguages={supportedLanguages} />
   )}
+  {multiCurrencyEnabled && supportedCurrencies && supportedCurrencies.length > 1 && (
+    <CurrencySwitcher
+      storeCurrency={currency ?? 'EGP'}
+      supportedCurrencies={supportedCurrencies}
+      autoDetect={autoDetectCurrency}
+    />
+  )}
   <ThemeToggle compact className="hidden sm:inline-flex" />
```

### 2.10 تعديل `src/app/store/layout.tsx` — تمرير props جديدة لـ StoreHeader

**الوضع الحالي**:

```tsx
<StoreHeader
  storeSlug={store.slug}
  storeName={store.name}
  logoUrl={fullStore?.logoUrl ?? null}
  categories={categories}
  currency={store.settings.currency}
  blogEnabled={Boolean((store.settings as Record<string, unknown>)?.blogEnabled)}
  supportedLanguages={((store.settings as Record<string, unknown>)?.supportedLanguages as string[]) ?? ['ar']}
/>
```

**أضف الـ props الجديدة**:

```diff
 <StoreHeader
   storeSlug={store.slug}
   storeName={store.name}
   logoUrl={fullStore?.logoUrl ?? null}
   categories={categories}
   currency={store.settings.currency}
   blogEnabled={Boolean((store.settings as Record<string, unknown>)?.blogEnabled)}
   supportedLanguages={((store.settings as Record<string, unknown>)?.supportedLanguages as string[]) ?? ['ar']}
+  multiCurrencyEnabled={Boolean((store.settings as Record<string, unknown>)?.multiCurrencyEnabled)}
+  supportedCurrencies={((store.settings as Record<string, unknown>)?.supportedCurrencies as string[]) ?? [store.settings.currency]}
+  autoDetectCurrency={(store.settings as Record<string, unknown>)?.autoDetectCurrency !== false}
 />
```

---

## 3. خطة الاختبار

### 3.1 اختبار ملاحظات الطلب

| # | حالة الاختبار | النتيجة المتوقعة | الملف |
|---|--------------|------------------|-------|
| 1 | فتح صفحة الـ checkout | textarea ملاحظات ظاهر مع placeholder من الإعدادات | `checkout/page.tsx` |
| 2 | كتابة ملاحظة وإتمام الطلب | الملاحظة تظهر في الطلب في الداشبورد | `_actions.ts` |
| 3 | كتابة ملاحظة أطول من 500 حرف | Validation error يمنع الإرسال | `order.ts` |
| 4 | إرسال طلب بدون ملاحظات | الطلب ينجح — notes = null في DB | `_actions.ts` |
| 5 | تعطيل `orderNotesEnabled` من الإعدادات | حقل الملاحظات لا يظهر في الـ checkout | `checkout/page.tsx` |
| 6 | تغيير `orderNotesPlaceholder` | النص الجديد يظهر في الـ textarea | `checkout/page.tsx` |

### 3.2 اختبار تحويل العملات

| # | حالة الاختبار | النتيجة المتوقعة | الملف |
|---|--------------|------------------|-------|
| 1 | تشغيل Migration | جدول `platform_exchange_rates` يُنشأ مع 4 صفوف أولية | `p4e_exchange_rates.sql` |
| 2 | `GET /api/storefront/currency/rates` | يعيد أسعار الصرف الأربعة | `rates/route.ts` |
| 3 | `GET /api/storefront/currency/detect` | يعيد العملة حسب header الدولة | `detect/route.ts` |
| 4 | `POST /api/admin/currency/update` بدون secret | 401 Unauthorized | `update/route.ts` |
| 5 | `POST /api/admin/currency/update` مع secret | تحديث الأسعار من open.er-api.com | `update/route.ts` |
| 6 | تفعيل multiCurrencyEnabled في الإعدادات | CurrencySwitcher يظهر في الـ header | `store-header.tsx` |
| 7 | اختيار عملة مختلفة | يُحفظ في cookie `matjary_currency` | `currency-switcher.tsx` |
| 8 | إعادة فتح المتجر | العملة المحفوظة تُقرأ من الـ cookie | `currency-switcher.tsx` |
| 9 | `convertPrice(100, 'EGP', 'SAR', rates)` | القيمة الصحيحة = 100/50.45*3.75 ≈ 7.43 | `convert.ts` |
| 10 | `convertPrice(100, 'EGP', 'EGP', rates)` | يعيد 100 بدون تحويل | `convert.ts` |
| 11 | `formatCurrency(7.43, 'SAR')` | `"٧٫٤٣ ر.س"` أو ما يعادله | `format.ts` |
| 12 | إضافة عملة واحدة فقط في supportedCurrencies | CurrencySwitcher لا يظهر (أقل من 2 عملات) | `currency-switcher.tsx` |
| 13 | محاولة إزالة العملة الأساسية للمتجر | لا يُسمح بذلك | `settings-client.tsx` |

### 3.3 اختبار شامل (Integration)

| # | السيناريو | الخطوات |
|---|----------|---------|
| 1 | طلب مع ملاحظات + عملة مختلفة | فعّل Multi-Currency → اختر SAR → تصفح منتج (تظهر الأسعار بالريال) → أضف للسلة → Checkout (الأسعار بالعملة الأساسية) → اكتب ملاحظة → أتم الطلب → افحص في الداشبورد |
| 2 | إعدادات من الداشبورد | اذهب للإعدادات → عدّل orderNotesPlaceholder → فعّل multiCurrencyEnabled → أضف SAR و USD → احفظ → افتح المتجر → تأكد |
| 3 | GeoIP Detection | من VPN مصري: يظهر EGP | من VPN سعودي: يظهر SAR | بدون VPN: يظهر عملة المتجر |

---

## ملاحظات مهمة للمنفِّذ

### 1. ربط currency-switcher بعرض الأسعار

الـ `CurrencySwitcher` في هذا الدليل يُطلق `CustomEvent('currency-change')` عند تغيير العملة. لربط هذا بعرض الأسعار الفعلي:

**في أي مكون يعرض أسعار** (مثل ProductCard, product-details, checkout)، أضف:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { convertPrice, type ExchangeRate } from '@/lib/currency/convert'
import { formatCurrency } from '@/lib/currency/format'

// hook للاستماع لتغيير العملة
function useDisplayCurrency(storeCurrency: string) {
  const [displayCurrency, setDisplayCurrency] = useState(storeCurrency)
  const [rates, setRates] = useState<ExchangeRate[]>([])

  useEffect(() => {
    // قراءة الكوكي
    const match = document.cookie.match(/(?:^|; )matjary_currency=([^;]*)/)
    if (match) setDisplayCurrency(decodeURIComponent(match[1]))

    // جلب الأسعار
    fetch('/api/storefront/currency/rates')
      .then((res) => res.json())
      .then((data: { success: boolean; data?: ExchangeRate[] }) => {
        if (data.success && data.data) setRates(data.data)
      })
      .catch(() => {})

    // الاستماع لتغيير العملة
    function handleCurrencyChange(e: Event) {
      const detail = (e as CustomEvent<{ currency: string }>).detail
      setDisplayCurrency(detail.currency)
    }
    window.addEventListener('currency-change', handleCurrencyChange)
    return () => window.removeEventListener('currency-change', handleCurrencyChange)
  }, [])

  function convertAndFormat(priceInBaseCurrency: number | string): string {
    const numericPrice = typeof priceInBaseCurrency === 'string'
      ? parseFloat(priceInBaseCurrency)
      : priceInBaseCurrency
    if (isNaN(numericPrice)) return formatCurrency(0, displayCurrency)
    if (displayCurrency === storeCurrency || rates.length === 0) {
      return formatCurrency(numericPrice, storeCurrency)
    }
    const converted = convertPrice(numericPrice, storeCurrency, displayCurrency, rates)
    return formatCurrency(converted, displayCurrency)
  }

  return { displayCurrency, rates, convertAndFormat }
}
```

> **لاحظ**: ربط هذا الـ hook بكل مكون يعرض أسعار هو خطوة اختيارية يمكن تنفيذها تدريجياً. الأهم هو أن البنية التحتية جاهزة (جدول + API + مكون).

### 2. Cron Job لتحديث الأسعار

لإعداد Cron Job يومي في Vercel:

أنشئ `vercel.json` (أو عدّله إن كان موجوداً):

```json
{
  "crons": [
    {
      "path": "/api/admin/currency/update",
      "schedule": "0 6 * * *"
    }
  ]
}
```

وأضف `CRON_SECRET` في `.env`:

```
CRON_SECRET=your-secret-key-here
```

> **بديل**: يمكن استدعاء الـ endpoint يدوياً من Super Admin panel بضغطة زر.

### 3. الأسعار إرشادية فقط

يجب عرض تنبيه واضح في كل مكان تظهر فيه أسعار محولة:

```
الأسعار المعروضة تقريبية — الدفع سيتم بالجنيه المصري
```

هذا التنبيه:
- يظهر في الـ CurrencySwitcher dropdown (✅ مضمّن)
- يجب إضافته في checkout page إذا كانت العملة المعروضة مختلفة عن عملة المتجر
- يجب إضافته في product page

### 4. لا تلمس `formatPrice()` الموجود

`formatPrice()` في `src/lib/utils.ts` يبقى كما هو. الدوال الجديدة في `src/lib/currency/` هي إضافة وليست بديل.

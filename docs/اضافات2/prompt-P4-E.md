# Prompt — تنفيذ P4-E: ملاحظات الطلب + تحويل العملات (Order Notes + Multi-Currency)

> انسخ كل المحتوى تحت هذا السطر والصقه في محادثة جديدة

---

> **⚠️ تنبيهات مهمة** — تم مراجعة هذا الملف مع الكود الفعلي وتم حل التعارضات التالية:
> 1. **حقل notes**: موجود في DB و form state لكن **غير موصّل** — لا يُرسل في orderPayload ولا في checkoutSchema ولا في server action
> 2. **UI موجود**: `<input type="text">` وليس `<textarea>` — يجب تحويله
> 3. **لا يوجد `checkout-form.tsx`**: الفورم بالكامل في `checkout/page.tsx` (~1400 سطر)
> 4. **`formatPrice()`**: موجود في `utils.ts` ويدعم 4 عملات — لا تحل محله, الدوال الجديدة إضافة
> 5. **`platformExchangeRates`**: جدول على مستوى المنصة (Platform-level) — ليس per-store
> 6. **StoreHeader**: يمرر `currency` prop بالفعل — المكان المثالي لـ CurrencySwitcher بجانب LanguageSwitcher
>
> **التفاصيل الكاملة** في قسم "ملاحظات تعارضات تم حلها" في `تنفيذ-P4-E-ملاحظات-الطلب-وتحويل-العملات.md`

---

أنت مطور خبير في Next.js و TypeScript. مطلوب منك تنفيذ **المرحلة P4-E** في منصة **Matjary** — منصة SaaS Multi-Tenant للتجارة الإلكترونية.

المرحلة P4-E تشمل **ميزتين** (لمسات أخيرة سريعة):
1. **ملاحظات الطلب (Order Notes)** — textarea في Checkout + وصلة كاملة من form → validation → server action → DB insert
2. **تحويل العملات (Multi-Currency)** — جدول أسعار صرف + currency-switcher + conversion utils + GeoIP detection

**دليل التنفيذ التفصيلي موجود في**: `docs/اضافات2/تنفيذ-P4-E-ملاحظات-الطلب-وتحويل-العملات.md`
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
| Tailwind CSS | 4 | RTL-first, Arabic UI |
| lucide-react | 0.574.0 | Icons |

### هيكل المجلدات الأساسي

```
src/
├── app/
│   ├── (dashboard)/          # لوحة تحكم التاجر (Clerk auth)
│   │   └── dashboard/
│   │       └── settings/     # ✅ موجود — تعديل: حقول P4-E
│   │           ├── page.tsx
│   │           └── _components/
│   │               └── settings-client.tsx  # ✅ تعديل: + Order Notes + Multi-Currency settings
│   ├── api/
│   │   ├── admin/
│   │   │   └── currency/
│   │   │       └── update/
│   │   │           └── route.ts    # ❌ جديد P4-E — POST (تحديث أسعار الصرف — Cron/Super-Admin)
│   │   └── storefront/
│   │       └── currency/
│   │           ├── rates/
│   │           │   └── route.ts    # ❌ جديد P4-E — GET (أسعار الصرف)
│   │           └── detect/
│   │               └── route.ts    # ❌ جديد P4-E — GET (تحديد العملة حسب IP)
│   ├── store/                # واجهة المتجر (storefront)
│   │   ├── layout.tsx            # ✅ تعديل: + props لـ CurrencySwitcher
│   │   ├── checkout/
│   │   │   ├── page.tsx          # ✅ تعديل: textarea بدل input + notes في orderPayload
│   │   │   └── _actions.ts       # ✅ تعديل: + notes في destructure + storeOrders.insert()
│   │   └── _components/
│   │       ├── store-header.tsx       # ✅ تعديل: + CurrencySwitcher
│   │       └── currency-switcher.tsx  # ❌ جديد P4-E — مكون اختيار العملة
├── db/
│   ├── index.ts
│   └── schema.ts             # ✅ تعديل: + platformExchangeRates table + StoreSettings P4-E
├── lib/
│   ├── currency/              # ❌ مجلد جديد P4-E
│   │   ├── convert.ts             # ❌ جديد — convertPrice()
│   │   ├── format.ts              # ❌ جديد — formatCurrency(), getCurrencyInfo()
│   │   └── detect.ts              # ❌ جديد — getCurrencyByCountry()
│   ├── validations/
│   │   ├── store.ts          # ✅ تعديل: + حقول P4-E في updateStoreSettingsSchema
│   │   └── order.ts          # ✅ تعديل: + notes في checkoutSchema
│   └── utils.ts               # ✅ موجود — formatPrice() — لا تلمسه
├── migrations/
│   └── p4e_exchange_rates.sql # ❌ جديد P4-E — Migration
└── middleware.ts
```

---

## الأنماط الموجودة (اتبعها بالضبط)

### 1. API Response Pattern

```typescript
import { apiSuccess, ApiErrors, handleApiError, apiError } from '@/lib/api/response'

return apiSuccess({ data: result })              // 200
return ApiErrors.unauthorized()                   // 401
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

### 4. Store Context Access (Client Components)

```typescript
import { useStore } from '@/lib/tenant/store-context'

const store = useStore()
// store.settings.currency — العملة الأساسية
// store.settings.multiCurrencyEnabled — هل مفعّل
```

### 5. Zod v4 Error Format

```typescript
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' }
}
```

---

## ما هو موجود بالفعل (لا تعيد بناءه)

### Schema — الموجود

- `storeOrders` table — فيه `notes: text('notes')` ✅ (الحقل موجود في DB)
- `stores.settings` (JSONB) — كل الحقول حتى P4-D (comparisonEnabled, comparisonMaxItems)
- **لا يوجد** `platformExchangeRates` table — يجب إنشاؤه ❌

### Checkout Form — الموجود

```tsx
// src/app/store/checkout/page.tsx (~1400 سطر)
// Form type:
type ShippingForm = {
  customerName: string
  customerPhone: string
  governorate: string
  city: string
  area: string
  street: string
  building: string
  notes: string          // ✅ موجود في النوع
}

// Form state:
const [form, setForm] = useState<ShippingForm>({
  customerName: '', customerPhone: '', governorate: '', city: '', area: '', street: '', building: '', notes: ''
})

// UI (حوالي سطر 1097):
// ⚠️ input type="text" — يجب تحويله لـ textarea
<input type="text" value={form.notes} onChange={...} placeholder="ملاحظات إضافية (اختياري)" />

// handleSubmit (حوالي سطر 800):
// ⚠️ orderPayload لا يشمل notes — يجب إضافته
const orderPayload = {
  storeId, items, shipping, shippingLocation,
  customerName, customerPhone, paymentMethod,
  couponCode, loyaltyPointsToRedeem,
  // ⚠️ notes: مفقود!
}
```

### Checkout Server Action — الموجود

```typescript
// src/app/store/checkout/_actions.ts
// submitOrder() يستقبل body → يعمل checkoutSchema.safeParse
// destructure: { storeId, items, shipping, shippingLocation, customerName, customerPhone, customerEmail, paymentMethod, couponCode, loyaltyPointsToRedeem }
// ⚠️ notes: غير موجود في destructure!

// tx.insert(storeOrders).values({...})
// ⚠️ notes: غير موجود في insert values!
```

### formatPrice() — الموجود

```typescript
// src/lib/utils.ts
export function formatPrice(price: number, currency: string = 'EGP') {
  const locales: Record<string, string> = { SAR: 'ar-SA', AED: 'ar-AE', USD: 'en-US' }
  return new Intl.NumberFormat(locales[currency] ?? 'ar-EG', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(price)
}
// ✅ يدعم EGP, SAR, AED, USD — لا تغيره
```

### StoreHeader — الموجود

```tsx
// src/app/store/_components/store-header.tsx
// Props: storeSlug, storeName, logoUrl, categories, currency, blogEnabled, supportedLanguages
// Structure:
//   <LanguageSwitcher />         ← CurrencySwitcher يُضاف بعده
//   <ThemeToggle />
//   <Account Link />
//   <StoreSearch currency={currency} />
//   <CartCounter />
```

### StoreContext — الموجود

```typescript
// src/lib/tenant/store-context.tsx
// useStore() → { id, slug, name, theme, settings, whatsappNumber }
// settings: StoreSettings — كل إعدادات المتجر متاحة
```

### Store Layout — الموجود

```tsx
// src/app/store/layout.tsx
// Server Component — يمرر settings لـ StoreHeader:
<StoreHeader
  storeSlug={store.slug}
  storeName={store.name}
  logoUrl={fullStore?.logoUrl ?? null}
  categories={categories}
  currency={store.settings.currency}
  blogEnabled={Boolean((store.settings as Record<string, unknown>)?.blogEnabled)}
  supportedLanguages={((store.settings as Record<string, unknown>)?.supportedLanguages as string[]) ?? ['ar']}
/>
// يحتاج إضافة: multiCurrencyEnabled, supportedCurrencies, autoDetectCurrency
```

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

  // P4-D
  comparisonEnabled: boolean
  comparisonMaxItems: number
```

**أضف حقول P4-E الجديدة** (في آخر النوع — **5 حقول**):

```typescript
  // === P4-E: Order Notes ===
  orderNotesEnabled: boolean        // default: true
  orderNotesPlaceholder: string     // default: 'مثال: أرجو التغليف كهدية...'

  // === P4-E: Multi-Currency ===
  multiCurrencyEnabled: boolean     // default: false
  supportedCurrencies: string[]     // default: ['EGP']
  autoDetectCurrency: boolean       // default: true
```

**الـ default values** (أضفها بعد `comparisonMaxItems: 4,`):

```typescript
  // P4-E
  orderNotesEnabled: true,
  orderNotesPlaceholder: 'مثال: أرجو التغليف كهدية...',
  multiCurrencyEnabled: false,
  supportedCurrencies: ['EGP'],
  autoDetectCurrency: true,
```

---

## ما هو مطلوب تنفيذه (P4-E)

### ملخص التغييرات

```
ملفات جديدة (8):
  migrations/p4e_exchange_rates.sql                          → Migration لجدول أسعار الصرف
  src/lib/currency/convert.ts                                → دوال تحويل العملات
  src/lib/currency/format.ts                                 → تنسيق السعر بالعملة المحولة
  src/lib/currency/detect.ts                                 → تحديد العملة حسب IP
  src/app/store/_components/currency-switcher.tsx             → مكون اختيار العملة
  src/app/api/storefront/currency/rates/route.ts             → GET أسعار الصرف
  src/app/api/storefront/currency/detect/route.ts            → GET تحديد العملة تلقائياً
  src/app/api/admin/currency/update/route.ts                 → POST تحديث أسعار الصرف

ملفات معدّلة (7):
  src/db/schema.ts                                           → + platformExchangeRates table + StoreSettings P4-E
  src/lib/validations/store.ts                               → + حقول P4-E في updateStoreSettingsSchema
  src/lib/validations/order.ts                               → + notes في checkoutSchema
  src/app/store/checkout/page.tsx                            → textarea بدل input + notes في orderPayload
  src/app/store/checkout/_actions.ts                         → + notes في destructure + storeOrders.insert()
  src/app/store/_components/store-header.tsx                  → + CurrencySwitcher
  src/app/(dashboard)/dashboard/settings/_components/settings-client.tsx → + حقول P4-E
```

---

## Validations — أضف في updateStoreSettingsSchema

في `src/lib/validations/store.ts`، بعد آخر حقل P4-D (`comparisonMaxItems`):

```typescript
  // P4-E: Order Notes
  orderNotesEnabled: z.boolean().optional(),
  orderNotesPlaceholder: z.string().max(200).trim().optional().nullable(),

  // P4-E: Multi-Currency
  multiCurrencyEnabled: z.boolean().optional(),
  supportedCurrencies: z.array(z.enum(['EGP', 'SAR', 'AED', 'USD'])).optional(),
  autoDetectCurrency: z.boolean().optional(),
```

---

## Validations — أضف notes في checkoutSchema

في `src/lib/validations/order.ts`، بعد `loyaltyPointsToRedeem`:

```typescript
    // P4-E: Order Notes
    notes: z.string().max(500, 'الملاحظات لا تتجاوز 500 حرف').trim().optional().nullable(),
```

---

## خطوات التنفيذ (نفّذ بالترتيب)

### الخطوة 0: تعديل Schema + Validations
1. أضف حقول P4-E في `StoreSettings` type + default values في `src/db/schema.ts`
2. أضف جدول `platformExchangeRates` في `src/db/schema.ts`
3. أضف حقول P4-E في `updateStoreSettingsSchema` في `src/lib/validations/store.ts`
4. أضف `notes` في `checkoutSchema` في `src/lib/validations/order.ts`

### الخطوة 1: ملاحظات الطلب
1. عدّل `src/app/store/checkout/page.tsx`:
   - حوّل `<input type="text">` للملاحظات إلى `<textarea>` مع `rows={3}` و `maxLength={500}`
   - لف بشرط `orderNotesEnabled !== false`
   - أضف `notes: form.notes.trim() || undefined` في `orderPayload` داخل `handleSubmit()`
2. عدّل `src/app/store/checkout/_actions.ts`:
   - أضف `notes` في destructure بعد `loyaltyPointsToRedeem`
   - أضف `notes: notes?.trim() || null` في `tx.insert(storeOrders).values({...})`

### الخطوة 2: تحويل العملات — البنية التحتية
1. أنشئ `migrations/p4e_exchange_rates.sql` — جدول + بيانات أولية
2. شغّل الـ Migration في Supabase
3. أنشئ `src/lib/currency/convert.ts` — `convertPrice()`, `convertPriceString()`
4. أنشئ `src/lib/currency/format.ts` — `formatCurrency()`, `getCurrencyInfo()`, `getAvailableCurrencies()`
5. أنشئ `src/lib/currency/detect.ts` — `getCurrencyByCountry()`, `getCountryNameAr()`

### الخطوة 3: تحويل العملات — APIs
1. أنشئ `src/app/api/storefront/currency/rates/route.ts` — GET أسعار الصرف
2. أنشئ `src/app/api/storefront/currency/detect/route.ts` — GET تحديد العملة بـ GeoIP
3. أنشئ `src/app/api/admin/currency/update/route.ts` — POST تحديث الأسعار من open.er-api.com

### الخطوة 4: تحويل العملات — واجهة المستخدم
1. أنشئ `src/app/store/_components/currency-switcher.tsx` — قائمة اختيار العملة
   - يقرأ/يحفظ في cookie `matjary_currency`
   - يطلق `CustomEvent('currency-change')` عند التغيير
   - يدعم auto-detect بـ GeoIP
2. عدّل `src/app/store/_components/store-header.tsx`:
   - أضف props: `multiCurrencyEnabled`, `supportedCurrencies`, `autoDetectCurrency`
   - أضف `<CurrencySwitcher>` بعد `<LanguageSwitcher>` وقبل `<ThemeToggle>`
3. عدّل `src/app/store/layout.tsx`:
   - مرر الـ props الجديدة لـ `<StoreHeader>`

### الخطوة 5: إعدادات الداشبورد
1. عدّل `src/app/(dashboard)/dashboard/settings/_components/settings-client.tsx`:
   - أضف state variables لحقول P4-E
   - أضف الحقول في `buildPayload()`
   - أضف قسمين في الفورم: "📝 إعدادات ملاحظات الطلب" و "💱 إعدادات تحويل العملات"

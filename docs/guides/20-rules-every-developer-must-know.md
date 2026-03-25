# 20 قاعدة لازم كل مطور يعرفها قبل ما يكتب سطر كود

> هذا الملف هو المرجع الأساسي لكل المطورين. لو ما قرأتهوش، هتوقع في مشاكل.

---

## 1. المشروع Multi-Tenant — كل Query لازم يكون فيه `storeId`

المشروع مبني على نظام **Subdomain Multi-Tenancy**. كل متجر عنده subdomain مستقل (`my-shop.matjary.local:3000`).

**القاعدة الذهبية: كل query لقاعدة البيانات لازم يشمل `storeId` كـ filter.**

```typescript
// ✅ صح — كل query فيه storeId
const products = await db.select().from(storeProducts)
  .where(and(eq(storeProducts.storeId, store.id), eq(storeProducts.isActive, true)))

// ❌ غلط — هيرجع منتجات كل المتاجر (تسريب بيانات!)
const products = await db.select().from(storeProducts)
  .where(eq(storeProducts.isActive, true))
```

**لو نسيت `storeId`، بيانات متجر ممكن تظهر في متجر تاني. ده كارثة أمنية.**

---

## 2. كيف الـ Subdomain Routing بيشتغل

الـ Middleware (`src/middleware.ts`) بيعمل الآتي:
1. يقرأ الـ hostname من الـ request
2. يستخرج الـ subdomain (مثال: `my-shop` من `my-shop.matjary.local:3000`)
3. **لو مفيش subdomain** → الموقع الرئيسي (platform)
4. **لو فيه subdomain + مش `/dashboard`** → يعمل rewrite لـ `/store/*` ويضيف header `x-store-slug`
5. **لو فيه subdomain + `/dashboard`** → يتأكد من Clerk auth ويضيف `x-store-slug` + `x-clerk-user-id`

**يعني المتجر الأمامي (storefront) ملفاته في `src/app/store/` — مش في root.**

```
http://my-shop.matjary.local:3000/           → src/app/store/page.tsx
http://my-shop.matjary.local:3000/product/x  → src/app/store/product/[slug]/page.tsx
http://my-shop.matjary.local:3000/dashboard  → src/app/(dashboard)/dashboard/page.tsx
http://matjary.local:3000/                   → src/app/(platform)/page.tsx
http://matjary.local:3000/pricing            → src/app/(platform)/pricing/page.tsx
```

---

## 3. كيف تحصل على بيانات المتجر الحالي

### في Server Components / API Routes:

```typescript
import { getCurrentStore } from '@/lib/tenant/get-current-store'

export default async function Page() {
  const store = await getCurrentStore() // يقرأ x-store-slug header
  if (!store) notFound()
  // store.id, store.slug, store.name, store.theme, store.settings
}
```

### في Client Components (الـ Storefront فقط):

```typescript
'use client'
import { useStore } from '@/lib/tenant/store-context'

export default function ProductCard() {
  const store = useStore() // من StoreProvider
  // store.id, store.slug, store.name, store.theme, store.settings
}
```

---

## 4. الـ Auth و التحقق من الملكية

### في API Routes — تحقق أن المستخدم يملك المتجر:

```typescript
import { verifyStoreOwnership } from '@/lib/api/auth'

export async function GET() {
  const { merchant, store } = await verifyStoreOwnership()
  if (!merchant) return ApiErrors.unauthorized()
  if (!store) return ApiErrors.storeNotFound()
  
  // الآن أنت متأكد: المستخدم مسجل + يملك المتجر الحالي
  const products = await db.select().from(storeProducts)
    .where(eq(storeProducts.storeId, store.id))
  return apiSuccess(products)
}
```

### الدوال المتاحة:

| الدالة | الاستخدام |
|--------|-----------|
| `getAuthenticatedMerchant()` | ترجع merchant أو `null` — بدون تحقق متجر |
| `verifyStoreOwnership()` | ترجع `{ merchant, store }` — تتحقق المستخدم يملك المتجر |
| `isSuperAdmin()` | ترجع `true`/`false` — بتقارن userId مع `SUPER_ADMIN_CLERK_ID` |

---

## 5. صيغة الـ API Response الموحّدة

**كل API لازم يستخدم نفس الصيغة:**

```typescript
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'

// ✅ نجاح
return apiSuccess(data)          // 200
return apiSuccess(newStore, 201) // 201 Created

// ✅ خطأ مع رسالة عربية
return apiError('اسم المنتج مطلوب', 422)

// ✅ أخطاء جاهزة
return ApiErrors.unauthorized()  // 401 — "غير مصرح"
return ApiErrors.forbidden()     // 403 — "ممنوع الوصول"
return ApiErrors.notFound()      // 404 — "المورد غير موجود"
return ApiErrors.storeNotFound() // 404 — "المتجر غير موجود"
return ApiErrors.validation('اسم المنتج مطلوب') // 422
return ApiErrors.internal()      // 500 — "حدث خطأ داخلي"
```

**الشكل النهائي:**
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "رسالة الخطأ", "code": "VALIDATION_ERROR" }
```

---

## 6. Zod v4 وليس v3 — الفرق مهم

المشروع يستخدم **Zod 4.3.6**. معظم الأمثلة على الإنترنت بتستخدم v3. **الفروقات المهمة:**

```typescript
import { z } from 'zod'

// ✅ Zod v4 — message الجديد اسمه error
const schema = z.object({
  name: z.string().min(1, { error: 'الاسم مطلوب' }),
  price: z.number().positive({ error: 'السعر لازم يكون أكبر من صفر' }),
  email: z.email({ error: 'بريد إلكتروني غير صالح' }),
})

// ❌ Zod v3 — لا تستخدم هذا:
// z.string().min(1, 'الاسم مطلوب')        ← deprecated
// z.string().email('بريد غير صالح')        ← deprecated (استخدم z.email())
// z.string({ message: 'مطلوب' })           ← deprecated
// error.flatten()                           ← deprecated
// error.format()                            ← deprecated
```

**استخدام في API route:**
```typescript
const body = await req.json()
const result = schema.safeParse(body)
if (!result.success) {
  return apiError(result.error.issues[0]?.message || 'بيانات غير صالحة', 422)
}
const data = result.data // typed!
```

---

## 7. كل الرسائل والأخطاء بالعربية

```typescript
// ✅ صح
return apiError('المنتج غير موجود', 404)
return apiError('اسم المنتج مطلوب', 422)
return apiError('ليس لديك صلاحية لهذا الإجراء', 403)

// ❌ غلط
return apiError('Product not found', 404)
return apiError('Name is required', 422)
```

**هذا يشمل:** رسائل الأخطاء، Zod validation messages، placeholder text، toast notifications.

---

## 8. هيكل المجلدات — كل مطور في مكانه

```
src/app/
├── (platform)/            ← الموقع الرئيسي (Dev 1 + Dev 3)
│   ├── page.tsx               Landing page
│   ├── pricing/              صفحة الأسعار
│   ├── onboarding/           إنشاء متجر جديد
│   └── ...
├── (dashboard)/           ← لوحة تحكم التاجر (Dev 2)
│   └── dashboard/
│       ├── page.tsx           نظرة عامة
│       ├── products/         المنتجات
│       ├── orders/           الطلبات
│       ├── customers/        العملاء
│       └── ...               (11 صفحة)
├── (super-admin)/         ← لوحة Admin (Dev 1)
│   └── super-admin/
├── store/                 ← المتجر الأمامي — Storefront (Dev 3)
│   ├── page.tsx               الرئيسية
│   ├── product/[slug]/       صفحة منتج
│   ├── category/[slug]/      صفحة تصنيف
│   ├── cart/                 السلة
│   ├── checkout/             الدفع
│   └── page/[slug]/          صفحات مخصصة
├── auth/                  ← تسجيل الدخول (Clerk)
├── api/                   ← API routes
│   ├── stores/               Dev 1
│   ├── dashboard/            Dev 2
│   ├── store/                Dev 3
│   └── webhooks/clerk/       Clerk webhook
```

---

## 9. هيكل الـ Components

```
src/components/
├── ui/              ← مكونات shadcn/ui (مشتركة — لا تعدّل!)
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── shared/          ← مكونات مشتركة بين أكثر من قسم
│   ├── data-table.tsx
│   ├── image-upload.tsx
│   └── ...
├── dashboard/       ← مكونات لوحة التحكم (Dev 2)
│   ├── product-form.tsx
│   └── ...
└── store/           ← مكونات المتجر الأمامي (Dev 3)
    ├── product-card.tsx
    └── ...
```

**قواعد التسمية:**
- الملفات: `kebab-case.tsx` (مثل `product-card.tsx`)
- الـ Components: `PascalCase` (مثل `ProductCard`)
- الـ Props: `ComponentNameProps` (مثل `ProductCardProps`)
- **ملف واحد = component واحد**

---

## 10. Server Components أولاً — `'use client'` فقط عند الحاجة

In Next.js 15، **كل component هو Server Component افتراضياً**. أضف `'use client'` فقط لما تحتاج:

- `useState`, `useEffect`, `useRef`
- `onClick`, `onChange`, `onSubmit`
- `useStore()`, `useRouter()`
- Browser APIs (`localStorage`, `window`)

```typescript
// ✅ Server Component — الأفضل (يجلب البيانات مباشرة)
export default async function ProductsPage() {
  const store = await getCurrentStore()
  const products = await db.select()...
  return <ProductList products={products} />
}

// ✅ Client Component — فقط للتفاعل
'use client'
export default function AddToCartButton({ productId }: { productId: string }) {
  const cart = useCartStore()
  return <button onClick={() => cart.addItem(...)}>أضف للسلة</button>
}
```

---

## 11. Tailwind v4 — أسماء Classes تغيرت

المشروع يستخدم **Tailwind CSS v4**. لو نسخت كود من مشروع قديم أو من الإنترنت:

| v3 (خطأ ❌) | v4 (صح ✅) |
|---|---|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `rounded` | `rounded-sm` |
| `blur-sm` | `blur-xs` |
| `outline-none` | `outline-hidden` |
| `ring` | `ring-3` |
| `border` (بدون لون) | `border border-gray-200` (الـ default أصبح `currentColor`) |
| `bg-[--var]` | `bg-(--var)` (أقواس عادية بدل مربعة للـ CSS variables) |

**RTL-First — استخدم logical properties:**

```html
<!-- ✅ صح: يعمل مع RTL و LTR -->
<div class="ps-4 pe-2 ms-auto text-start">

<!-- ❌ غلط: يتكسر في RTL -->
<div class="pl-4 pr-2 ml-auto text-left">
```

---

## 12. الـ Database Schema — أسماء الأعمدة بالظبط

**لا تخمن أسماء الأعمدة. ارجع لـ `src/db/schema.ts` دائماً.**

أمثلة على أسماء ممكن تغلط فيها:

| غلط ❌ | صح ✅ | الجدول |
|---|---|---|
| `clerk_user_id` | `clerkUserId` | merchants |
| `display_name` | `displayName` | merchants |
| `is_active` | `isActive` | merchants, stores, products... |
| `store_id` | `storeId` | كل الجداول |
| `merchant_id` | `merchantId` | stores |
| `is_featured` | `isFeatured` | storeProducts |
| `compare_at_price` | `compareAtPrice` | storeProducts |
| `order_status` | `orderStatus` | storeOrders |
| `payment_status` | `paymentStatus` | storeOrders |
| `shipping_fee` | `shippingFee` | storeShippingZones |
| `usage_limit` | `usageLimit` | storeCoupons |
| `free_shipping_minimum` | `freeShippingMinimum` | storeShippingZones |

**السبب:** Drizzle ORM يستخدم camelCase في TypeScript ويحوّلها لـ snake_case في SQL تلقائياً.

---

## 13. الأنواع (Types) المُصدّرة من الـ Schema

```typescript
import type { 
  StoreTheme,        // ألوان + خط + borderRadius + headerStyle
  StoreSettings,     // عملة + لغة + اتجاه + إعدادات الطلب
  SocialLinks,       // facebook, instagram, whatsapp...
  ShippingAddress,   // محافظة + مدينة + منطقة + شارع...
  VariantOption,     // { name: "اللون", value: "أحمر" }
  ProductVariant,    // id + options + price + stock + sku...
  OrderItem,         // productId + name + price + quantity...
  PageBlock,         // { type: "hero"|"text"|..., content, settings }
  ShippingZoneArea   // { name: string, fee: number }
} from '@/db/schema'
```

**لا تنشئ types جديدة لنفس الحاجة. استخدم المُصدّر من الـ schema.**

---

## 14. رفع الصور — القواعد والقيود

```typescript
import { uploadImage, deleteImage } from '@/lib/supabase/storage'

// الاستخدام:
const { url, path } = await uploadImage(
  store.id,                    // storeId — مطلوب
  'products',                  // folder: 'products' | 'categories' | 'hero' | 'logo'
  file                         // File object
)

// الحذف:
await deleteImage(path)
```

**القيود:**
- **حجم أقصى: 5MB**
- **أنواع مسموحة: JPEG, PNG, WebP, GIF فقط**
- **المسار:** `store-assets/{storeId}/{folder}/{timestamp}-{random}.{ext}`
- **Bucket:** `store-assets` على Supabase Storage

---

## 15. سلة التسوق (Cart) — Zustand مع localStorage

```typescript
'use client'
import { useCartStore } from '@/lib/stores/cart-store'

function CartButton() {
  const { addItem, removeItem, updateQuantity, clearCart, getSubtotal, getItemCount, items } = useCartStore()
  
  addItem({
    productId: 'xxx',
    productName: 'قميص أزرق',
    productImage: '/img.jpg',
    variantId: 'var-1',    // أو null لو مفيش variants
    variantLabel: 'أزرق / L',
    quantity: 1,
    unitPrice: 150,
  })
}
```

**ملاحظات مهمة:**
- السلة محفوظة في `localStorage` باسم `matjary-cart`
- لما الـ `storeId` يتغير، **السلة بتتمسح تلقائياً** (عشان كل متجر سلة مستقلة)
- الـ Items مُفهرسة بـ `(productId + variantId)` — نفس المنتج بـ variants مختلفة = items مختلفة

---

## 16. التعامل مع الأخطاء — Pattern موحّد

### في API Routes:

```typescript
export async function POST(req: Request) {
  try {
    const { merchant, store } = await verifyStoreOwnership()
    if (!merchant) return ApiErrors.unauthorized()
    if (!store) return ApiErrors.storeNotFound()

    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return ApiErrors.validation(result.error.issues[0]?.message || 'بيانات غير صالحة')
    }

    // ... business logic
    return apiSuccess(data, 201)
  } catch (error) {
    console.error('POST /api/xxx error:', error)
    return ApiErrors.internal()
  }
}
```

### في Server Components:

```typescript
export default async function Page() {
  const store = await getCurrentStore()
  if (!store) notFound() // Next.js 404

  // ... لو فيه خطأ في الـ query، الـ error.tsx هيمسكها
  const data = await fetchData(store.id)
  return <Component data={data} />
}
```

**كل route group عنده `error.tsx` و `loading.tsx` و `not-found.tsx` جاهزين.**

---

## 17. أسماء الـ imports — استخدم `@/` دائماً

```typescript
// ✅ صح
import { db } from '@/db'
import { stores, storeProducts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { uploadImage } from '@/lib/supabase/storage'
import { cn, formatPrice, formatDate } from '@/lib/utils'

// ❌ غلط
import { db } from '../../../db'
import { db } from 'src/db'
```

`@/*` مربوط بـ `./src/*` في `tsconfig.json`.

---

## 18. TypeScript صارم — لا `any` ولا تجاهل

`tsconfig.json` مُفعّل فيه:
- `"strict": true` — لا `any` ضمني
- `"noUncheckedIndexedAccess": true` — الوصول لعناصر Array/Object ممكن يرجع `undefined`

```typescript
// بسبب noUncheckedIndexedAccess:
const items = ['a', 'b', 'c']
const first = items[0] // type: string | undefined ⚠️

// ✅ الحل:
const first = items[0] ?? 'default'
// أو
if (items[0]) {
  console.log(items[0]) // type: string ✅
}

// ❌ ممنوع:
const data: any = await fetchData() // ❌ لا any
// @ts-ignore                        // ❌ لا تجاهل
```

---

## 19. الـ Environment Variables

```env
# مطلوب قبل التشغيل:
DATABASE_URL=postgresql://...           # Supabase PostgreSQL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # ⚠️ Secret — لا تسربه

# Platform:
NEXT_PUBLIC_ROOT_DOMAIN=matjary.local:3000
NEXT_PUBLIC_PROTOCOL=http
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPER_ADMIN_CLERK_ID=user_xxxxx

# Auth redirects:
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**قواعد:**
- أي متغير يبدأ بـ `NEXT_PUBLIC_` يظهر في الـ client (لا تحط فيه secrets!)
- `SUPABASE_SERVICE_ROLE_KEY` و `CLERK_SECRET_KEY` **سرّيين** — server only
- انسخ `.env.example` لـ `.env.local` واملأ القيم

---

## 20. أوامر التطوير اليومية

```bash
# تشغيل المشروع
npm run dev                    # http://localhost:3000

# فحص الأنواع
npx tsc --noEmit               # لازم 0 errors قبل أي commit

# push الـ schema لقاعدة البيانات
npx drizzle-kit push          # أول مرة + بعد تعديل schema.ts

# seed البيانات الأولية
npx tsx src/db/seed.ts         # ينشئ الخطط (free/basic/pro)

# تثبيت حزمة جديدة
npm install <package>          # .npmrc يتعامل مع --legacy-peer-deps تلقائياً

# إضافة مكون shadcn/ui
npx shadcn@latest add <component>   # مثل: button, input, dialog

# فحص ESLint
npm run lint

# Git
git checkout -b feature/اسم-الميزة
git add .
git commit -m "feat: وصف التغيير"
git push origin feature/اسم-الميزة
# ثم افتح Pull Request على develop
```

---

## ملخص سريع — Cheat Sheet

| الـ | استخدم |
|-----|--------|
| بيانات المتجر (server) | `getCurrentStore()` |
| بيانات المتجر (client) | `useStore()` |
| تحقق الملكية | `verifyStoreOwnership()` |
| Auth check | `getAuthenticatedMerchant()` |
| Admin check | `isSuperAdmin()` |
| نجاح API | `apiSuccess(data, status)` |
| خطأ API | `apiError(msg, status)` أو `ApiErrors.xxx()` |
| Validation | `z.object({...}).safeParse(body)` — Zod v4 |
| رفع صور | `uploadImage(storeId, folder, file)` |
| CSS classes | `cn('base-class', condition && 'extra')` |
| تنسيق سعر | `formatPrice(150)` → `١٥٠٫٠٠ ج.م.` |
| تنسيق تاريخ | `formatDate(date)` → `١٥ يناير ٢٠٢٦` |
| Path alias | `@/` = `./src/` |

# نظام تعدد المستأجرين (Multi-Tenancy) - متجري

## الفكرة

كل تاجر يحصل على subdomain فريد (مثل `ahmed.matjary.com`). البيانات مخزنة في نفس قاعدة البيانات لكن كل جدول لديه عمود `store_id` لفصل البيانات.

## كيف يعمل؟

### الخطوة 1: Middleware يستخرج الـ Subdomain

```typescript
// src/middleware.ts
const hostname = request.headers.get('host') // "ahmed.matjary.com"
const rootDomain = 'matjary.com'
const subdomain = hostname.replace(`.${rootDomain}`, '') // "ahmed"

// يضع الـ slug في header
response.headers.set('x-store-slug', subdomain)
```

### الخطوة 2: Layout يقرأ الـ Header

```typescript
// src/lib/tenant/get-current-store.ts
export async function getCurrentStore() {
  const headers = await headers()
  const slug = headers.get('x-store-slug')
  if (!slug) return null
  return resolveStore(slug) // DB query
}
```

### الخطوة 3: كل Component يستخدم store.id

```typescript
// Server Component
const store = await getCurrentStore()
const products = await db
  .select()
  .from(storeProducts)
  .where(eq(storeProducts.storeId, store.id)) // ✅ ALWAYS filter by store_id
```

### الخطوة 4: Client Components تستخدم Context

```typescript
// في layout.tsx
<StoreProvider store={store}>
  {children}
</StoreProvider>

// في أي client component
const { id, name, theme } = useStore()
```

## قواعد أمان حاسمة

### 1. كل Query يحتوي على store_id

```typescript
// ✅ صحيح - دائماً فلتر بـ store_id
const orders = await db
  .select()
  .from(storeOrders)
  .where(eq(storeOrders.storeId, store.id))

// ❌ كارثة أمنية - يعرض بيانات كل المتاجر
const orders = await db.select().from(storeOrders)
```

### 2. API Routes تتحقق من الملكية

```typescript
// في كل API route للـ dashboard
import { verifyStoreOwnership } from '@/lib/api/auth'

export async function POST(req: Request) {
  const { merchant, store } = await verifyStoreOwnership()
  
  if (!merchant) return apiError('غير مصرح', 401)
  if (!store) return apiError('المتجر غير موجود', 404)
  
  // الآن آمن - التاجر يملك هذا المتجر
  // استخدم store.id في كل query
}
```

### 3. Storage منفصل لكل متجر

```
store-assets/
├── {storeId_1}/
│   ├── products/
│   ├── categories/
│   ├── hero/
│   └── logo/
└── {storeId_2}/
    ├── products/
    └── ...
```

## التوجيه حسب الحالة

```
طلب وارد
    │
    ├── لا يوجد subdomain (matjary.com)
    │   ├── /              → (platform)/page.tsx
    │   ├── /pricing       → (platform)/pricing/page.tsx
    │   ├── /auth/*        → auth pages
    │   └── /super-admin/* → (super-admin)/ (يحتاج SUPER_ADMIN_CLERK_ID)
    │
    └── يوجد subdomain (ahmed.matjary.com)
        ├── /              → store/page.tsx (middleware rewrite: / → /store)
        ├── /product/*     → store/product/[slug]/page.tsx
        ├── /cart           → store/cart/page.tsx
        ├── /checkout       → store/checkout/page.tsx
        └── /dashboard/*    → (dashboard)/ (يحتاج مصادقة + ملكية)
```

## الاختبار المحلي

عدّل ملف `hosts`:

```
127.0.0.1   matjary.local
127.0.0.1   ahmed.matjary.local
127.0.0.1   test.matjary.local
```

ثم في `.env.local`:

```env
NEXT_PUBLIC_ROOT_DOMAIN=matjary.local:3000
NEXT_PUBLIC_PROTOCOL=http
```

الآن:
- `http://matjary.local:3000` → الموقع التسويقي
- `http://ahmed.matjary.local:3000` → واجهة متجر "أحمد"

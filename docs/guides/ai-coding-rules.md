# قواعد كتابة الكود مع AI - متجري

> هذا الملف يحتوي على القواعد التي يجب أن يتبعها كل مطور عند استخدام أدوات AI (مثل GitHub Copilot, Cursor, ChatGPT) لكتابة الكود.

## القواعد العامة

### 1. TypeScript صارم - لا `any` أبداً

```typescript
// ❌ ممنوع
const data: any = await fetchSomething()
function handle(item: any) {}

// ✅ صحيح
const data: Product[] = await fetchProducts(storeId)
function handle(item: Product) {}

// إذا لم تعرف النوع بالضبط:
const data: unknown = await fetchSomething()
```

### 2. كل query لقاعدة البيانات يحتوي store_id

```typescript
// ❌ كارثة — يعرض بيانات كل المتاجر
const products = await db.select().from(storeProducts)

// ✅ صحيح
const products = await db
  .select()
  .from(storeProducts)
  .where(eq(storeProducts.storeId, store.id))
```

**هذه القاعدة لا استثناء لها** إلا في:
- `merchants` table (ليس لديه store_id)
- `platform_plans` table (بيانات عامة)
- `platform_activity_log` (في Super Admin فقط)

### 3. استخدم الـ imports الموجودة

```typescript
// DB
import { db } from '@/db'
import { storeProducts, stores, merchants } from '@/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'

// Auth
import { verifyStoreOwnership, getAuthenticatedMerchant } from '@/lib/api/auth'

// API Response
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'

// Tenant
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { useStore } from '@/lib/tenant/store-context'

// Utils
import { cn, formatPrice, formatDate } from '@/lib/utils'
```

### 4. Server Components أولاً

```typescript
// ✅ Server Component (default) — يجلب البيانات مباشرة
export default async function ProductsPage() {
  const store = await getCurrentStore()
  const products = await db.select()...
  return <div>...</div>
}

// فقط أضف 'use client' عند الحاجة:
// - useState / useEffect
// - onClick / onChange
// - useStore (context)
// - Browser APIs
```

### 5. Zod لكل input من المستخدم

```typescript
import { z } from 'zod'

// ⚠️ نستخدم Zod v4 — بعض الأشياء تغيرت عن v3:
// - استخدم error بدل message: z.string().min(1, { error: 'الاسم مطلوب' })
// - .string().email() لا تزال تعمل لكن z.email() مُفضّل
// - .flatten() و .format() deprecated — استخدم z.prettifyError() أو .issues مباشرة

const schema = z.object({
  name: z.string().min(1, { error: 'الاسم مطلوب' }),
  price: z.number().positive({ error: 'السعر يجب أن يكون أكبر من صفر' }),
  email: z.email({ error: 'بريد إلكتروني غير صالح' }),
})

// في API route:
const body = await req.json()
const result = schema.safeParse(body)
if (!result.success) {
  return apiError(result.error.issues[0]?.message || 'بيانات غير صالحة', 422)
}
const data = result.data // typed correctly!
```

### 6. رسائل الخطأ بالعربية

```typescript
// ✅
return apiError('المنتج غير موجود', 404)
return apiError('اسم المنتج مطلوب', 422)
return apiError('ليس لديك صلاحية لهذا الإجراء', 403)

// ❌ 
return apiError('Product not found', 404)
```

### 7. لا تكرر الكود

إذا وجدت نفسك تنسخ كود، أنشئ function مشتركة:

```typescript
// src/lib/queries/products.ts
export async function getStoreProducts(storeId: string, options?: {
  status?: 'active' | 'draft'
  limit?: number
  offset?: number
}) {
  // ... shared query logic
}
```

### 8. التعامل مع الأخطاء

```typescript
// في API Routes
export async function POST(req: Request) {
  try {
    // ... logic
    return apiSuccess(data, 201)
  } catch (error) {
    console.error('Error creating product:', error)
    return ApiErrors.internal()
  }
}

// في Server Components
export default async function Page() {
  try {
    const data = await fetchData()
    return <Component data={data} />
  } catch {
    return <ErrorMessage message="حدث خطأ في تحميل البيانات" />
  }
}
```

## القواعد عند مراجعة كود AI

### تشيك لست قبل الـ Commit

- [ ] لا يوجد `any` في الكود
- [ ] كل query لديه `store_id` filter
- [ ] لا يوجد `console.log` (بعد الانتهاء من التطوير)
- [ ] الرسائل بالعربية
- [ ] Zod validation لكل API input
- [ ] Error handling في كل API route
- [ ] `npm run type-check` يمر بنجاح
- [ ] لم يتم تسريب secrets أو API keys

### أخطاء شائعة من AI يجب تجنبها

1. **AI قد ينسى `store_id`** — تحقق يدوياً كل مرة
2. **AI قد يستخدم `any`** — ارفض واطلب type محدد
3. **AI قد يخلط بين Server و Client Components** — تأكد من `'use client'`
4. **AI قد يستخدم مكتبات غير مثبتة** — تأكد أنها في `package.json`
5. **AI قد ينشئ ملفات في مسارات خاطئة** — تأكد من بنية المجلدات
6. **AI قد يكتب CSS بدل Tailwind** — استخدم Tailwind فقط

# دليل المطور 1 - المصادقة والـ Middleware والـ API

## مسؤولياتك

1. **Clerk Integration** — webhook, session management
2. **Middleware** — subdomain routing, auth guards
3. **Store CRUD API** — إنشاء/تعديل/حذف المتجر
4. **Onboarding Flow** — تدفق إنشاء متجر جديد
5. **Kashier Payment Integration** — الدفع الإلكتروني
6. **Super Admin Panel** — بيانات حقيقية من قاعدة البيانات

## الملفات المسؤول عنها

```
src/
├── middleware.ts                          ← أنت المسؤول
├── app/api/                              ← أنت المسؤول
│   ├── webhooks/clerk/route.ts           ← موجود (راجعه وحسّنه)
│   ├── stores/route.ts                   ← أنشئه (CRUD)
│   ├── stores/[id]/route.ts              ← أنشئه
│   └── payments/kashier/
│       ├── create/route.ts               ← أنشئه
│       └── webhook/route.ts              ← أنشئه
├── app/(platform)/onboarding/page.tsx    ← أكمل الـ API
├── app/(super-admin)/                    ← اربطه ببيانات حقيقية
├── lib/
│   ├── api/auth.ts                       ← موجود (راجعه)
│   ├── api/response.ts                   ← موجود
│   └── tenant/                           ← موجود (راجعه)
```

## المهام بالتفصيل

### المهمة 1: مراجعة وتحسين Clerk Webhook

الملف موجود في `src/app/api/webhooks/clerk/route.ts`. راجع:
- هل الأحداث الثلاثة (created/updated/deleted) تعمل؟
- أضف logging للأخطاء
- تعامل مع حالة user بدون email

### المهمة 2: API إنشاء متجر

```typescript
// POST /api/stores
// Body: { name, slug, category }
// Auth: Clerk userId required

// الخطوات:
// 1. تحقق من المصادقة (getAuthenticatedMerchant)
// 2. تحقق أن الـ slug غير مستخدم
// 3. تحقق من حد المتاجر حسب الخطة
// 4. أنشئ المتجر في قاعدة البيانات
// 5. خصص له الخطة المجانية تلقائياً
```

### المهمة 3: ربط Onboarding بـ API

الصفحة موجودة في `(platform)/onboarding/page.tsx` لكن زر "إنشاء المتجر" يعرض alert فقط.
اربطه بـ API حقيقي:
1. `POST /api/stores`
2. عند النجاح → redirect إلى `{slug}.matjary.com/dashboard`

### المهمة 4: دمج Kashier

```typescript
// POST /api/payments/kashier/create
// يُنشئ جلسة دفع في Kashier ويرجع redirect URL

// POST /api/payments/kashier/webhook
// يستقبل إشعار من Kashier عند اكتمال/فشل الدفع
// يحدّث payment_status في store_orders
```

المستندات: https://developers.kashier.io/

### المهمة 5: Super Admin بيانات حقيقية

الصفحات موجودة بأرقام placeholder. اربطها بـ queries حقيقية:

```typescript
// عدد المتاجر
const totalStores = await db.select({ count: count() }).from(stores)

// عدد التجار
const totalMerchants = await db.select({ count: count() }).from(merchants)

// أحدث المتاجر
const latestStores = await db
  .select()
  .from(stores)
  .orderBy(desc(stores.createdAt))
  .limit(10)
```

## Zod Validation

كل API route يجب أن يستخدم Zod v4:

```typescript
import { z } from 'zod'

const createStoreSchema = z.object({
  name: z.string().min(2, { error: 'اسم المتجر قصير جداً' }).max(50),
  slug: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, { error: 'الرابط يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام فقط' }),
  category: z.string().optional(),
})
```

## اختبار عملك

1. سجّل حساب على Clerk → تأكد أن `merchants` row تُنشأ
2. أنشئ متجر عبر API → تأكد من ظهوره في قاعدة البيانات
3. ادخل على `{slug}.matjary.local:3000/dashboard` → يجب أن يعمل
4. ادخل على `matjary.local:3000/super-admin` → يجب أن يعرض بيانات

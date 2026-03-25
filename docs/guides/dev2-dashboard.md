# دليل المطور 2 - لوحة تحكم التاجر (Dashboard)

## مسؤولياتك

لوحة التحكم الكاملة التي يستخدمها التاجر لإدارة متجره.
كل الصفحات تحت `src/app/(dashboard)/dashboard/`.

## الملفات المسؤول عنها

```
src/app/(dashboard)/
├── layout.tsx                    ← موجود (حسّنه إذا لزم)
├── dashboard/
│   ├── page.tsx                  ← بيانات حقيقية (overview)
│   ├── products/
│   │   ├── page.tsx              ← جدول منتجات حقيقي
│   │   ├── new/page.tsx          ← نموذج إضافة منتج كامل
│   │   └── [id]/page.tsx         ← تعديل منتج
│   ├── orders/
│   │   ├── page.tsx              ← جدول طلبات حقيقي
│   │   └── [id]/page.tsx         ← تفاصيل طلب + تغيير حالة
│   ├── categories/page.tsx       ← CRUD تصنيفات
│   ├── customers/page.tsx        ← قائمة العملاء
│   ├── coupons/page.tsx          ← CRUD كوبونات
│   ├── shipping/page.tsx         ← CRUD مناطق شحن
│   ├── pages/page.tsx            ← CRUD صفحات ثابتة
│   ├── design/page.tsx           ← تخصيص theme + hero slides
│   ├── analytics/page.tsx        ← إحصائيات ورسوم بيانية
│   └── settings/page.tsx         ← إعدادات المتجر

src/app/api/dashboard/            ← أنشئ API routes هنا
├── products/route.ts
├── products/[id]/route.ts
├── orders/route.ts
├── orders/[id]/route.ts
├── categories/route.ts
├── coupons/route.ts
├── shipping/route.ts
├── pages/route.ts
├── design/route.ts
└── settings/route.ts
```

## قاعدة ذهبية

> ⚠️ **كل query يجب أن يحتوي على `store_id`**

```typescript
// في كل API route:
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiError, apiSuccess } from '@/lib/api/response'

export async function GET() {
  const { store } = await verifyStoreOwnership()
  if (!store) return apiError('غير مصرح', 401)

  const products = await db
    .select()
    .from(storeProducts)
    .where(eq(storeProducts.storeId, store.id)) // ✅ ALWAYS
  
  return apiSuccess(products)
}
```

## المهام بالتفصيل

### المهمة 1: إدارة المنتجات (الأهم)

**API Routes:**
```typescript
// GET  /api/dashboard/products        → قائمة + بحث + فلترة
// POST /api/dashboard/products        → إنشاء منتج
// GET  /api/dashboard/products/[id]   → منتج واحد
// PUT  /api/dashboard/products/[id]   → تعديل
// DELETE /api/dashboard/products/[id] → حذف
```

**نموذج إنشاء المنتج يجب أن يدعم:**
- الاسم والوصف
- السعر والسعر قبل الخصم
- التصنيف (dropdown من الـ categories)
- رفع صور (Supabase Storage)
- المتغيرات (variants) — ألوان + أحجام مثلاً
- SKU والمخزون
- نشط/مسودة

**شكل المتغيرات (Variants):**
```typescript
type ProductVariant = {
  id: string          // nanoid()
  options: { name: string; value: string }[]  // [{name: "اللون", value: "أحمر"}, {name: "المقاس", value: "M"}]
  price: number | null           // null = same as main price
  stock: number
  sku: string | null
}
```

### المهمة 2: إدارة الطلبات

**الواجهة:**
- جدول بكل الطلبات مع فلترة حسب الحالة
- تفاصيل الطلب: المنتجات + الكميات + العميل + عنوان الشحن
- تغيير حالة الطلب (dropdown)

**الحالات:**
```
pending → confirmed → processing → shipped → delivered
                                          → cancelled
                                          → refunded
```

### المهمة 3: التصنيفات

- CRUD بسيط (اسم + slug + صورة + ترتيب)
- drag & drop لتغيير الترتيب (اختياري)

### المهمة 4: الكوبونات

- إنشاء كوبون (كود + نوع خصم + قيمة + تاريخ انتهاء + حد أقصى للاستخدام)
- عرض عدد مرات الاستخدام

### المهمة 5: مناطق الشحن

- إنشاء منطقة (اسم + محافظات + تكلفة + حد الشحن المجاني)

### المهمة 6: التصميم

- تغيير ألوان theme → يحفظ في `stores.theme` (JSONB)
- رفع شعار → يحفظ في Supabase Storage
- إدارة hero slides → `store_hero_slides` table

### المهمة 7: الإعدادات

- تعديل اسم المتجر والوصف
- وسائل التواصل
- إعدادات الدفع (تفعيل/إلغاء COD وKashier)

## رفع الصور

```typescript
import { uploadImage } from '@/lib/supabase/storage'

// في API route:
const formData = await req.formData()
const file = formData.get('image') as File
const result = await uploadImage(store.id, 'products', file)
// result.url → URL للصورة المرفوعة
```

## نصائح

1. **Server Actions vs API Routes**: يمكنك استخدام أي منهما. API Routes أوضح للتوثيق.
2. **Pagination**: استخدم `limit` و `offset` في كل query يعرض قائمة.
3. **Optimistic UI**: للـ client components، حدّث الواجهة فوراً ثم أرسل الطلب.
4. **Error Handling**: استخدم `apiError()` دائماً مع رسائل عربية واضحة.

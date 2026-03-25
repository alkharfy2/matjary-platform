# دليل المساهمة - متجري (Matjary)

> ⚠️ **قبل البدء**: اقرأ [20 قاعدة لازم كل مطور يعرفها](guides/20-rules-every-developer-must-know.md) + [التنبيهات والمشاكل المحتملة](guides/known-issues-and-warnings.md)

## فروع Git

```
main            ← الإنتاج (محمي - لا push مباشر)
develop         ← فرع التطوير الرئيسي
feature/xxx     ← فروع الميزات الجديدة
fix/xxx         ← فروع إصلاح الأخطاء
```

### سير العمل

1. اسحب آخر تحديثات `develop`
2. أنشئ فرع جديد: `git checkout -b feature/اسم-الميزة`
3. اعمل التعديلات مع commits واضحة
4. افتح Pull Request إلى `develop`
5. بعد المراجعة → merge

## رسائل Commit

استخدم [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: إضافة صفحة المنتجات في لوحة التحكم
fix: إصلاح خطأ في حساب سعر الشحن
refactor: إعادة هيكلة مكون سلة التسوق
docs: تحديث دليل المطور 2
chore: تحديث الحزم
```

## هيكل الملفات - قواعد

### 1. Route Groups و Store Routing

```
(platform)/page.tsx        → matjary.com/
store/page.tsx             → ahmed.matjary.com/ (middleware rewrites / → /store)
(dashboard)/dashboard/     → ahmed.matjary.com/dashboard/
(super-admin)/super-admin/ → matjary.com/super-admin/
```

> **ملاحظة**: صفحات واجهة المتجر موجودة في `src/app/store/` (مجلد عادي وليس route group). الـ middleware يعمل rewrite شفاف من `ahmed.matjary.com/` إلى `/store/`.

### 2. قاعدة الأمان الذهبية

> ⚠️ **كل query لقاعدة البيانات يجب أن يحتوي على `WHERE store_id = ?`**

```typescript
// ✅ صحيح
const products = await db
  .select()
  .from(storeProducts)
  .where(eq(storeProducts.storeId, store.id))

// ❌ خطير - يعرض بيانات كل المتاجر
const products = await db.select().from(storeProducts)
```

### 3. Server Components أولاً

- استخدم Server Components بشكل افتراضي
- أضف `'use client'` فقط عند الحاجة (state, effects, event handlers)
- لا تستخدم `'use client'` في layouts إلا إذا كان ضرورياً

### 4. أسماء الملفات

- **المكونات**: `PascalCase.tsx` (مثل `ProductCard.tsx`)
- **الصفحات**: `page.tsx` (Next.js convention)
- **الأدوات المساعدة**: `camelCase.ts` (مثل `formatPrice.ts`)
- **الأنماط**: `kebab-case` للمجلدات

### 5. TypeScript صارم

- لا `any` أبداً
- عرّف types لكل props
- استخدم `unknown` بدل `any` عند الضرورة
- فعّل strict mode (مفعّل بالفعل في tsconfig)

## Tailwind CSS

- استخدم Tailwind فقط — لا CSS مخصص إلا في globals.css
- استخدم `cn()` من `@/lib/utils` لدمج الأصناف
- التصميم RTL أولاً (الموقع عربي)

## مراجعة الكود

قبل فتح PR تأكد:

- [ ] `npm run type-check` يمر بدون أخطاء
- [ ] `npm run build` يكتمل بنجاح
- [ ] كل query فيه `store_id` filter
- [ ] لا يوجد `console.log` في كود الإنتاج
- [ ] لا يوجد `any` في TypeScript

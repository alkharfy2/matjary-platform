# ⚠️ تنبيهات ومشاكل محتملة — اقرأ قبل البدء

> هذا الملف يحتوي على تنبيهات مهمة حول التقنيات المستخدمة في المشروع.
> **كل مطور يجب أن يقرأ هذا الملف قبل البدء في العمل.**

---

## 1. Zod v4 (وليس v3!) — تغييرات مهمة

المشروع يستخدم **Zod v4.3.6** — وهو إصدار جديد كلياً. معظم الأمثلة والبرامج التعليمية على الإنترنت تستخدم v3. انتبه للفروقات:

### ما تغير:

| الأمر | Zod v3 (قديم ❌) | Zod v4 (المطلوب ✅) |
|---|---|---|
| رسائل الخطأ | `z.string().min(5, 'قصير جداً')` | `z.string().min(5, { error: 'قصير جداً' })` |
| رسائل الخطأ | `z.string({ message: 'مطلوب' })` | `z.string({ error: 'مطلوب' })` |
| البريد الإلكتروني | `z.string().email()` | `z.email()` (الطريقة القديمة تعمل لكنها deprecated) |
| UUID | `z.string().uuid()` | `z.uuidv4()` |
| URL | `z.string().url()` | `z.url()` |
| errorMap | `z.string({ errorMap: ... })` | `z.string({ error: (issue) => ... })` |
| `.format()` | `error.format()` | `z.treeifyError(error)` (deprecated) |
| `.flatten()` | `error.flatten()` | `z.treeifyError(error)` (deprecated) |
| `.merge()` | `schemaA.merge(schemaB)` | `schemaA.extend(schemaB.shape)` (deprecated) |
| `.strict()` | `z.object({}).strict()` | `z.strictObject({})` (deprecated) |
| `.passthrough()` | `z.object({}).passthrough()` | `z.looseObject({})` (deprecated) |
| record بحقل واحد | `z.record(z.string())` | `z.record(z.string(), z.string())` (حقلين مطلوبين) |

### مثال صحيح لـ Zod v4:

```typescript
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, { error: 'اسم المنتج مطلوب' }),
  price: z.number().positive({ error: 'السعر يجب أن يكون أكبر من صفر' }),
  email: z.email({ error: 'بريد إلكتروني غير صالح' }),
  description: z.string().optional(),
})

// safeParse و .parse يعملون بنفس الطريقة
const result = productSchema.safeParse(body)
if (!result.success) {
  // error.issues لا يزال يعمل كما هو
  console.log(result.error.issues[0]?.message)
  // أو استخدم prettifyError للأخطاء المقروءة:
  console.log(z.prettifyError(result.error))
}
```

### المرجع الرسمي:
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog)
- [Zod v4 API](https://zod.dev/api)

---

## 2. shadcn/ui غير مُثبّت — يحتاج إعداد

المشروع يحتوي على كل dependencies المطلوبة (Radix UI, CVA, clsx, tailwind-merge, lucide-react) والـ `cn()` helper جاهز. **لكن `npx shadcn init` لم يتم تنفيذه بعد.**

### ما يجب فعله (Dev يبدأ أولاً):

```bash
# 1. تهيئة shadcn/ui (سيُنشئ components.json و src/components/ui/)
npx shadcn@latest init

# عند السؤال:
# - Style: new-york
# - Base color: Neutral (أو حسب التصميم)
# - CSS variables: yes
# - Tailwind prefix: لا
# - Components directory: src/components/ui
# - Utils: src/lib/utils (موجود بالفعل)

# 2. إضافة الأساسيات
npx shadcn@latest add button input label card dialog dropdown-menu select separator tabs toast switch checkbox avatar
```

### ⚠️ ملاحظة مهمة:
- shadcn/ui متوافق مع Tailwind v4 و React 19 ✅
- المكونات ستُضاف بصيغة v4 تلقائياً (بدون `forwardRef`، مع `data-slot`)
- يُنصح بتثبيت `tw-animate-css` بدلاً من `tailwindcss-animate`:

```bash
npm install -D tw-animate-css
```

ثم أضف في `globals.css`:

```css
@import "tw-animate-css";
@import "tailwindcss";
```

---

## 3. Tailwind CSS v4 — أسماء Classes تغيرت

المشروع يستخدم **Tailwind v4** وليس v3. بعض الـ utility classes تغيرت:

| v3 (قديم ❌) | v4 (المطلوب ✅) | ملاحظة |
|---|---|---|
| `shadow-sm` | `shadow-xs` | الظل الصغير |
| `shadow` (بدون رقم) | `shadow-sm` | الظل العادي |
| `rounded-sm` | `rounded-xs` | الزوايا الصغيرة |
| `rounded` (بدون رقم) | `rounded-sm` | الزوايا العادية |
| `blur-sm` | `blur-xs` | |
| `blur` | `blur-sm` | |
| `outline-none` | `outline-hidden` | |
| `ring` (بدون رقم) | `ring-3` | |
| `drop-shadow-sm` | `drop-shadow-xs` | |
| `drop-shadow` | `drop-shadow-sm` | |

### تغييرات أخرى مهمة:

- **لا يوجد `tailwind.config.ts`** — v4 يستخدم CSS-first config عبر `@theme inline` في `globals.css`
- **الـ border الافتراضي** أصبح `currentColor` بدلاً من `gray-200` — أضف اللون دائماً: `border border-gray-200`
- **hover على الموبايل** — لا يعمل على touch devices (يحتاج `@media (hover: hover)`)
- **variables في arbitrary values** — استخدم `()` بدل `[]`: `bg-(--brand-color)` بدلاً من `bg-[--brand-color]`

### المرجع:
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

---

## 4. Clerk v6 + Next.js 15 — ملاحظات

### الوضع الحالي:
- `@clerk/nextjs` v6.37.5 متوافق مع Next.js 15 ✅
- `middleware.ts` يستخدم `clerkMiddleware` + `createRouteMatcher` ✅
- `auth()` يُستدعى بـ `await` ✅ (مطلوب في Next.js 15)

### ⚠️ تنبيه - `--legacy-peer-deps`:
React 19 يحتاج `--legacy-peer-deps` عند تثبيت حزم. **استخدم دائماً:**

```bash
npm install <package> --legacy-peer-deps
```

أو أنشئ `.npmrc` في root المشروع:

```
legacy-peer-deps=true
```

### ⚠️ ملاحظة عن الـ Middleware:
- الملف **يجب** أن يكون `middleware.ts` (في Next.js 15)
- Clerk الأحدث يذكر `proxy.ts` — هذا لإصدارات Next.js المستقبلية فقط، تجاهله

---

## 5. Drizzle ORM + Supabase — ملاحظات

### Connection Pool:
`prepare: false` مُعيَّن في `src/db/index.ts` — مطلوب لـ Supabase connection pooling ✅

### قبل أول استخدام:
```bash
# push schema إلى قاعدة البيانات
npx drizzle-kit push

# seed البيانات الأساسية (platform plans)
npx tsx src/db/seed.ts
```

### ⚠️ لا تنسَ:
- كل query **يجب** أن يشمل `storeId` filter — لمنع تسرب البيانات بين المتاجر
- لا تستخدم `drizzle-kit generate` ثم `migrate` — استخدم `push` مباشرة في التطوير

---

## 6. Wildcard Subdomains في التطوير المحلي

### الإعداد المطلوب (مرة واحدة):

1. افتح ملف hosts كمسؤول:
   - **Windows**: `C:\Windows\System32\drivers\etc\hosts`
   - **Mac/Linux**: `/etc/hosts`

2. أضف:
```
127.0.0.1 matjary.local
127.0.0.1 test-store.matjary.local
127.0.0.1 my-shop.matjary.local
```

3. ادخل على `http://matjary.local:3000` للموقع الرئيسي
4. ادخل على `http://test-store.matjary.local:3000` لمتجر test-store

### ⚠️ كل متجر جديد يحتاج إضافة يدوية للـ hosts file أثناء التطوير

---

## 7. متغيرات البيئة المطلوبة

انسخ `.env.example` إلى `.env.local` واملأ القيم:

```bash
cp .env.example .env.local
```

**الأساسي للبداية:**
- `DATABASE_URL` — من Supabase Dashboard → Settings → Database
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — من Clerk Dashboard
- `CLERK_SECRET_KEY` — من Clerk Dashboard
- `CLERK_WEBHOOK_SECRET` — بعد إنشاء webhook في Clerk
- `NEXT_PUBLIC_SUPABASE_URL` — من Supabase Dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — من Supabase Dashboard
- `SUPABASE_SERVICE_ROLE_KEY` — من Supabase Dashboard → Settings → API

---

## 8. ملخص الأولويات

| الأولوية | المهمة | المسؤول |
|---|---|---|
| 🔴 فوري | إعداد `.env.local` و Supabase/Clerk | الكل |
| 🔴 فوري | `npx drizzle-kit push` + seed | Dev 1 |
| 🔴 فوري | `npx shadcn@latest init` + add components | أول من يبدأ |
| 🟡 مبكر | إعداد hosts file محلياً | الكل |
| 🟡 مبكر | إنشاء `.npmrc` مع `legacy-peer-deps=true` | أول من يبدأ |

# دليل الإعداد - متجري (Matjary)

## المتطلبات الأساسية

| الأداة | الإصدار | ملاحظات |
|--------|---------|---------|
| Node.js | 18.18+ | يُفضل 20 LTS |
| npm | 9+ | يأتي مع Node.js |
| Git | 2.x | |
| VS Code | أحدث إصدار | مع الإضافات أدناه |

## إضافات VS Code المطلوبة

- **ESLint** - لفحص الكود
- **Tailwind CSS IntelliSense** - إكمال تلقائي لـ Tailwind
- **Prisma / Drizzle** - تلوين ملفات السكيما (اختياري)
- **Arabic Language Pack** - دعم اللغة العربية (اختياري)

## خطوات الإعداد

### 1. استنساخ المشروع

```bash
git clone <repo-url>
cd matjary-platform
```

### 2. تثبيت الحزم

```bash
npm install
```

> ✅ ملف `.npmrc` موجود مسبقاً مع `legacy-peer-deps=true` — لا حاجة لـ `--legacy-peer-deps` يدوياً.

### ⚠️ اقرأ التنبيهات المهمة أولاً

**قبل كتابة أي كود، اقرأ:**
- [20 قاعدة لازم كل مطور يعرفها](guides/20-rules-every-developer-must-know.md) ← **الأهم**
- [التنبيهات والمشاكل المحتملة](guides/known-issues-and-warnings.md)

يحتوي على تنبيهات مهمة عن Zod v4، Tailwind v4، shadcn/ui، وإعداد البيئة المحلية.

### 3. إنشاء ملف البيئة

```bash
cp .env.example .env.local
```

### 4. إعداد الخدمات الخارجية

#### Supabase (قاعدة البيانات + التخزين)

1. أنشئ مشروع جديد على [supabase.com](https://supabase.com)
2. انسخ `Database URL` من Settings > Database
3. انسخ `URL` و `service_role key` من Settings > API
4. أنشئ Storage Bucket باسم `store-assets` (عام/public)

```env
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-xx.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### Clerk (المصادقة)

1. أنشئ تطبيق على [clerk.com](https://clerk.com)
2. فعّل: Email/Password + Google + Phone OTP
3. أنشئ Webhook يشير إلى `https://your-domain.com/api/webhooks/clerk`
4. Events: `user.created`, `user.updated`, `user.deleted`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
```

#### Kashier (الدفع) - اختياري حالياً

```env
KASHIER_MERCHANT_ID=MID-xxx
KASHIER_API_KEY=xxx
NEXT_PUBLIC_KASHIER_MODE=test
```

#### إعدادات المنصة

```env
NEXT_PUBLIC_ROOT_DOMAIN=matjary.local:3000
NEXT_PUBLIC_PROTOCOL=http
SUPER_ADMIN_CLERK_ID=user_xxxxx
```

### 5. إعداد DNS المحلي

لاختبار الـ subdomains محلياً، عدّل ملف hosts:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`
**Mac/Linux**: `/etc/hosts`

أضف:
```
127.0.0.1   matjary.local
127.0.0.1   ahmed.matjary.local
127.0.0.1   test.matjary.local
```

### 6. دفع السكيما وتشغيل البذر

```bash
npm run db:push
npm run db:seed
```

### 7. التشغيل

```bash
npm run dev
```

افتح:
- `http://matjary.local:3000` — الموقع التسويقي
- `http://ahmed.matjary.local:3000` — متجر تجريبي (بعد إنشاء متجر)
- `http://ahmed.matjary.local:3000/dashboard` — لوحة التحكم

### 8. Drizzle Studio (اختياري)

لاستعراض قاعدة البيانات بواجهة رسومية:

```bash
npm run db:studio
```

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `peer dependency conflict` | استخدم `--legacy-peer-deps` |
| Subdomain لا يعمل | تأكد من تعديل ملف hosts |
| Clerk webhook فشل | تأكد من CLERK_WEBHOOK_SECRET |
| لا يمكن الاتصال بقاعدة البيانات | تأكد من DATABASE_URL وأن Supabase يعمل |

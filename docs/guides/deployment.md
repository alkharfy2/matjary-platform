# دليل النشر (Deployment) - متجري

## المتطلبات

- حساب [Vercel](https://vercel.com) (مجاني أو Pro)
- مشروع Supabase جاهز ومتصل
- مشروع Clerk جاهز
- دومين مخصص (اختياري ولكن مطلوب لـ wildcard subdomains)

## الخطوة 1: ربط المشروع بـ Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# ربط المشروع
cd matjary-platform
vercel link
```

أو من لوحة تحكم Vercel:
1. اذهب إلى [vercel.com/new](https://vercel.com/new)
2. اربط GitHub repo: `Xfuse1/matjary-platform`
3. اختر Framework: **Next.js**
4. اضغط **Deploy**

## الخطوة 2: المتغيرات البيئية

في Vercel Dashboard → Settings → Environment Variables، أضف:

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
KASHIER_API_KEY=...
KASHIER_API_SECRET=...
KASHIER_MERCHANT_ID=...
KASHIER_MODE=live
NEXT_PUBLIC_PLATFORM_NAME=متجري
NEXT_PUBLIC_ROOT_DOMAIN=matjary.com
NEXT_PUBLIC_PROTOCOL=https
NEXT_PUBLIC_APP_URL=https://matjary.com
SUPER_ADMIN_CLERK_ID=user_...
```

> ⚠️ **مهم**: استخدم مفاتيح `live` وليس `test` في الإنتاج.

## الخطوة 3: إعداد الدومين

### الدومين الرئيسي

1. في Vercel → Settings → Domains → أضف `matjary.com`
2. عدّل DNS عند مسجل الدومين:
   - `A` record → `76.76.21.21`
   - `CNAME` → `cname.vercel-dns.com`

### Wildcard Subdomain (الأهم!)

لدعم `ahmed.matjary.com`, `test.matjary.com`, إلخ:

1. في Vercel → Settings → Domains → أضف `*.matjary.com`
2. عند مسجل الدومين، أضف DNS record:
   - Type: `CNAME`
   - Name: `*`
   - Value: `cname.vercel-dns.com`

> ⚠️ **Wildcard Subdomains تتطلب خطة Vercel Pro** ($20/شهر) أو أن يكون الدومين مُدار عبر Vercel DNS.

### تأكيد الإعداد

بعد الإعداد، تحقق أن:
- `https://matjary.com` → يعرض الموقع التسويقي
- `https://ahmed.matjary.com` → يعرض واجهة المتجر (بعد إنشائه)
- `https://ahmed.matjary.com/dashboard` → يعرض لوحة التحكم

## الخطوة 4: إعداد Clerk Webhook للإنتاج

1. في Clerk Dashboard → Webhooks → Create Endpoint
2. URL: `https://matjary.com/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`, `user.deleted`
4. انسخ Signing Secret → ضعه في `CLERK_WEBHOOK_SECRET` على Vercel

## الخطوة 5: إعداد Supabase للإنتاج

1. تأكد أن `store-assets` bucket موجود وعامّ (public)
2. أضف CORS policy للـ bucket:
   ```json
   {
     "AllowedOrigins": ["https://matjary.com", "https://*.matjary.com"],
     "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "AllowedHeaders": ["*"]
   }
   ```
3. شغّل migrations:
   ```bash
   DATABASE_URL=<production_url> npm run db:push
   DATABASE_URL=<production_url> npm run db:seed
   ```

## الخطوة 6: Kashier للإنتاج

1. غيّر `KASHIER_MODE` من `test` إلى `live`
2. اضبط Webhook URL في Kashier Dashboard:
   `https://matjary.com/api/payments/kashier/webhook`

## CI/CD

Vercel يعمل Auto-deploy من GitHub:
- `push` إلى `main` → Production deployment
- `push` إلى أي فرع آخر → Preview deployment

### حماية الفرع الرئيسي

في GitHub → Settings → Branches → Add rule:
- Branch: `main`
- Require pull request before merging ✅
- Require status checks to pass ✅

## المراقبة

- **Vercel Analytics**: مُفعّل تلقائياً
- **Vercel Logs**: Runtime Logs في الـ dashboard
- **Supabase Dashboard**: مراقبة قاعدة البيانات
- **Clerk Dashboard**: مراقبة المستخدمين والمصادقة

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| Build يفشل | تأكد أن كل المتغيرات البيئية مضبوطة |
| Subdomain لا يعمل | تأكد من DNS wildcard record + Vercel Pro |
| Webhook يفشل | تأكد من WEBHOOK_SECRET + أن الـ URL صحيح |
| الصور لا تظهر | تأكد أن `next.config.ts` يحتوي على `*.supabase.co` في remotePatterns |
| خطأ في قاعدة البيانات | تأكد من اتصال Supabase (connection pooling: port 6543) |

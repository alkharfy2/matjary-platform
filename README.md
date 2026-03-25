# متجري (Matjary) - منصة إنشاء المتاجر الإلكترونية

> منصة SaaS متعددة المستأجرين (Multi-Tenant) لإنشاء المتاجر الإلكترونية، موجهة للسوق العربي والمصري.

## نظرة سريعة

| العنصر | التقنية |
|--------|---------|
| الإطار | Next.js 15 (App Router) + React 19 + TypeScript |
| قاعدة البيانات | PostgreSQL (Supabase) عبر Drizzle ORM |
| المصادقة | Clerk (Email + Google + Phone OTP) |
| الدفع | Kashier + الدفع عند الاستلام (COD) |
| التخزين | Supabase Storage (صور فقط) |
| التصميم | Tailwind CSS + shadcn/ui (Radix UI) |
| الحالة | Zustand (سلة التسوق) |
| النشر | Vercel (wildcard subdomains) |

## بنية الروابط

```
matjary.com                    → الموقع التسويقي (platform)
matjary.com/pricing            → صفحة الأسعار
matjary.com/onboarding         → إنشاء متجر جديد
ahmed.matjary.com              → واجهة المتجر (storefront)
ahmed.matjary.com/product/x    → صفحة منتج
ahmed.matjary.com/dashboard    → لوحة تحكم التاجر (dashboard)
matjary.com/super-admin        → لوحة الإدارة العليا
```

## البدء السريع

```bash
# 1. استنساخ المشروع
git clone <repo-url>
cd matjary-platform

# 2. تثبيت الحزم
npm install --legacy-peer-deps

# 3. إعداد المتغيرات البيئية
cp .env.example .env.local
# املأ القيم في .env.local

# 4. دفع السكيما لقاعدة البيانات
npm run db:push

# 5. تشغيل ملف البذر
npm run db:seed

# 6. تشغيل خادم التطوير
npm run dev
```

## بنية المجلدات

```
src/
├── app/
│   ├── layout.tsx              # Root layout (ClerkProvider + Cairo font)
│   ├── globals.css             # Tailwind + store theme variables
│   ├── auth/                   # Sign-in & Sign-up pages
│   ├── api/webhooks/clerk/     # Clerk webhook handler
│   ├── (platform)/             # Marketing site (matjary.com)
│   ├── store/                  # Store frontend (slug.matjary.com → rewrite to /store)
│   ├── (dashboard)/            # Merchant dashboard (slug.matjary.com/dashboard)
│   └── (super-admin)/          # Platform admin (matjary.com/super-admin)
├── db/
│   ├── index.ts                # Database connection
│   ├── schema.ts               # All 14 tables (single source of truth)
│   └── seed.ts                 # Seed platform plans
├── lib/
│   ├── utils.ts                # cn(), formatPrice(), formatDate(), etc.
│   ├── api/
│   │   ├── auth.ts             # getAuthenticatedMerchant(), verifyStoreOwnership()
│   │   └── response.ts        # apiSuccess(), apiError(), standard responses
│   ├── tenant/
│   │   ├── resolve-store.ts    # resolveStore(slug) - DB lookup
│   │   ├── get-current-store.ts # getCurrentStore() - reads x-store-slug header
│   │   └── store-context.tsx   # React context for storefront client components
│   └── supabase/
│       └── storage.ts          # uploadImage(), deleteImage()
└── middleware.ts               # Subdomain routing + Clerk auth
```

## التوثيق

- [دليل الإعداد](docs/SETUP.md)
- [دليل المساهمة](docs/CONTRIBUTING.md)
- [البنية المعمارية](docs/architecture/overview.md)
- [سكيما قاعدة البيانات](docs/architecture/database-schema.md)
- [نظام تعدد المستأجرين](docs/architecture/multi-tenancy.md)
- [عقود الـ API](docs/guides/api-contracts.md)
- [اتفاقيات المكونات](docs/guides/components-convention.md)
- [دليل المطور 1 - المصادقة](docs/guides/dev1-auth-middleware.md)
- [دليل المطور 2 - لوحة التحكم](docs/guides/dev2-dashboard.md)
- [دليل المطور 3 - واجهة المتجر](docs/guides/dev3-storefront.md)
- [قواعد كتابة الكود مع AI](docs/guides/ai-coding-rules.md)
- [دليل النشر](docs/guides/deployment.md)
- [قائمة مهام المراحل](docs/phases/phase-checklist.md)

## فريق العمل

| الدور | المسؤوليات |
|-------|-----------|
| **Product Owner** | رؤية المنتج، الأولويات، مراجعة النتائج |
| **Dev 1** | المصادقة، Middleware، Clerk webhook، API الأساسية |
| **Dev 2** | لوحة تحكم التاجر (Dashboard) بالكامل |
| **Dev 3** | واجهة المتجر (Storefront) + سلة التسوق + Checkout |

## الترخيص

خاص - جميع الحقوق محفوظة.

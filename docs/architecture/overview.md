# البنية المعمارية - متجري (Matjary)

## نظرة عامة

متجري هي منصة SaaS متعددة المستأجرين (Multi-Tenant) مبنية على Next.js 15 App Router. كل تاجر يحصل على subdomain خاص به.

## الرسم التخطيطي

```
                    ┌──────────────────────────┐
                    │     matjary.com           │
                    │   (Platform Marketing)    │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │      middleware.ts        │
                    │  - Extract subdomain      │
                    │  - Set x-store-slug       │
                    │  - Clerk auth check       │
                    └──────────┬───────────────┘
                               │
              ┌───────────────┬┴────────────────┐
              │               │                  │
   No subdomain         Has subdomain      /super-admin
              │               │                  │
    ┌─────────▼──────┐ ┌─────▼───────┐ ┌───────▼────────┐
    │  (platform)    │ │  store/     │ │ (super-admin)  │
    │  Landing page  │ │ Store pages │ │ Admin panel    │
    │  Pricing       │ │ /product/*  │ │ /stores        │
    │  Onboarding    │ │ /cart       │ │ /merchants     │
    │  Auth pages    │ │ /checkout   │ │ /plans         │
    └────────────────┘ │ (rewrite)   │ └────────────────┘
                       │ /dashboard  │
                       │      │      │
                       │ ┌────▼────┐ │
                       │ │dashboard│ │
                       │ │ panel   │ │
                       │ └─────────┘ │
                       └─────────────┘
```

## طبقات التطبيق

### 1. طبقة التوجيه (Routing Layer)

**middleware.ts** → كل request يمر من هنا أولاً:
- يستخرج الـ subdomain من الـ hostname
- يضع `x-store-slug` في الـ headers
- يتحقق من مصادقة Clerk للمسارات المحمية

### 2. طبقة العرض (Presentation Layer)

4 مجموعات مسارات (Route Groups):

| المجموعة | الغرض | الوصول |
|----------|-------|--------|
| `(platform)` | الموقع التسويقي | عام |
| `store/` | واجهة المتجر (rewrite via middleware) | عام (يحتاج subdomain) |
| `(dashboard)` | لوحة تحكم التاجر | مصادق + مالك المتجر |
| `(super-admin)` | إدارة المنصة | Super Admin فقط |

### 3. طبقة البيانات (Data Layer)

```
Drizzle ORM ──→ PostgreSQL (Supabase)
                  │
                  ├── merchants (التجار)
                  ├── stores (المتاجر)
                  ├── store_products
                  ├── store_orders
                  ├── store_order_items
                  ├── store_categories
                  ├── store_customers
                  ├── store_shipping_zones
                  ├── store_coupons
                  ├── store_pages
                  ├── store_hero_slides
                  ├── store_reviews
                  ├── platform_plans
                  └── platform_activity_log
```

### 4. طبقة الخدمات الخارجية

```
Clerk ──────→ مصادقة المستخدمين (Email/Google/Phone)
                └── Webhook → إنشاء merchant عند التسجيل

Supabase ───→ Storage (رفع الصور فقط)
                └── Bucket: store-assets/{storeId}/

Kashier ────→ بوابة الدفع (بطاقات + فودافون كاش + فوري)
```

## تدفق الطلب (Request Flow)

```
1. User visits ahmed.matjary.com/product/cool-shirt
2. middleware.ts:
   - hostname = "ahmed.matjary.com"
   - subdomain = "ahmed"
   - Sets x-store-slug: "ahmed"
3. store/product/[slug]/page.tsx renders (via middleware rewrite)
4. getCurrentStore() reads x-store-slug header
5. resolveStore("ahmed") → DB lookup → store object
6. Component fetches product WHERE store_id = store.id AND slug = "cool-shirt"
7. Page renders with store theme
```

## الأمان

### فصل البيانات (Data Isolation)

- كل جدول يبدأ بـ `store_` لديه عمود `store_id`
- كل query يجب أن يحتوي على `WHERE store_id = ?`
- `verifyStoreOwnership()` في API routes
- Middleware يمنع الوصول غير المصرح للوحة التحكم

### مستويات الوصول

```
عام (Public):
  - الموقع التسويقي
  - واجهة المتجر
  - صفحات المنتجات

مصادق (Authenticated):
  - Checkout (اختياري)
  - لوحة التحكم (مالك المتجر فقط)

Super Admin:
  - لوحة الإدارة العليا (SUPER_ADMIN_CLERK_ID فقط)
```

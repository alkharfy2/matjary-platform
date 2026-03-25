# سكيما قاعدة البيانات - متجري

## نظرة عامة

14 جدول في ملف واحد: `src/db/schema.ts` (Single Source of Truth)

## العلاقات بين الجداول

```
merchants (1) ──→ (1) stores          (كل تاجر له متجر واحد فقط)
stores (1) ──→ (N) store_categories
stores (1) ──→ (N) store_products
stores (1) ──→ (N) store_customers
stores (1) ──→ (N) store_orders
stores (1) ──→ (N) store_shipping_zones
stores (1) ──→ (N) store_coupons
stores (1) ──→ (N) store_pages
stores (1) ──→ (N) store_hero_slides
stores (1) ──→ (N) store_reviews

store_orders (1) ──→ (N) store_order_items
store_categories (1) ──→ (N) store_products
```

> ⚠️ الجدول `stores.plan` هو حقل text يحمل قيمة مثل `'free'` / `'basic'` / `'pro'` — وليس FK إلى `platform_plans`.

## تفاصيل الجداول

### merchants (التجار)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key, auto-generated |
| clerk_user_id | text | Unique, NOT NULL — من Clerk webhook |
| email | text | NOT NULL |
| display_name | text | nullable |
| phone | text | nullable |
| avatar_url | text | nullable |
| is_active | boolean | default true, NOT NULL |
| created_at | timestamp(tz) | default now() |
| updated_at | timestamp(tz) | default now() |

### stores (المتاجر)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| merchant_id | UUID | FK → merchants, Unique (متجر واحد لكل تاجر), ON DELETE CASCADE |
| name | text | NOT NULL |
| slug | text | Unique, NOT NULL — يُستخدم كـ subdomain |
| description | text | nullable |
| logo_url | text | nullable |
| favicon_url | text | nullable |
| theme | jsonb | StoreTheme type, NOT NULL, default values |
| settings | jsonb | StoreSettings type, NOT NULL, default values |
| contact_email | text | nullable |
| contact_phone | text | nullable |
| contact_whatsapp | text | nullable |
| address | text | nullable |
| social_links | jsonb | SocialLinks type, default {} |
| is_active | boolean | default true, NOT NULL |
| plan | text | default 'free', NOT NULL — قيم: free/basic/pro |
| custom_domain | text | nullable |
| meta_title | text | nullable — SEO |
| meta_description | text | nullable — SEO |
| created_at / updated_at | timestamp(tz) | default now() |

**Indexes**: `slug`, `merchant_id`, `custom_domain`

### store_categories (التصنيفات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| parent_id | UUID | nullable — للتصنيفات الفرعية |
| name | text | NOT NULL |
| slug | text | NOT NULL, Unique per store |
| description | text | nullable |
| image_url | text | nullable |
| sort_order | integer | default 0 |
| is_active | boolean | default true |
| created_at | timestamp(tz) | default now() |

**Unique**: `(store_id, slug)`

### store_products (المنتجات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| category_id | UUID | FK → store_categories, ON DELETE SET NULL |
| name | text | NOT NULL |
| slug | text | NOT NULL, Unique per store |
| description | text | nullable |
| short_description | text | nullable |
| price | decimal(10,2) | NOT NULL |
| compare_at_price | decimal(10,2) | nullable (السعر قبل الخصم) |
| cost_price | decimal(10,2) | nullable (سعر التكلفة) |
| sku | text | nullable |
| barcode | text | nullable |
| images | jsonb | string[], default [] — مصفوفة URLs |
| variants | jsonb | ProductVariant[], default [] |
| stock | integer | default 0 |
| track_inventory | boolean | default true |
| is_active | boolean | default true (بديل الـ status) |
| is_featured | boolean | default false |
| is_digital | boolean | default false |
| weight | decimal(8,2) | nullable |
| tags | text[] | PostgreSQL array, default [] |
| seo_title | text | nullable |
| seo_description | text | nullable |
| sort_order | integer | default 0 |
| created_at / updated_at | timestamp(tz) | default now() |

**Unique**: `(store_id, slug)`
**Indexes**: `store_id`, `category_id`, `(store_id, is_active)`, `(store_id, is_featured)`

### store_customers (العملاء)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| name | text | NOT NULL |
| phone | text | NOT NULL |
| email | text | nullable |
| address | jsonb | ShippingAddress type, nullable |
| total_orders | integer | default 0 |
| total_spent | decimal(10,2) | default '0' |
| last_order_at | timestamp(tz) | nullable |
| notes | text | nullable |
| is_blocked | boolean | default false |
| created_at | timestamp(tz) | default now() |

**Unique**: `(store_id, phone)`

### store_orders (الطلبات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| order_number | text | NOT NULL, Unique per store |
| customer_id | UUID | FK → store_customers, ON DELETE SET NULL |
| customer_name | text | NOT NULL |
| customer_phone | text | NOT NULL |
| customer_email | text | nullable |
| shipping_address | jsonb | ShippingAddress type, NOT NULL |
| subtotal | decimal(10,2) | NOT NULL |
| shipping_cost | decimal(10,2) | default '0' |
| discount | decimal(10,2) | default '0' |
| total | decimal(10,2) | NOT NULL |
| coupon_code | text | nullable |
| payment_method | text | NOT NULL — 'cod' / 'kashier' |
| payment_status | text | default 'pending' — pending/paid/failed/refunded |
| order_status | text | default 'pending' — pending/confirmed/processing/shipped/delivered/cancelled/refunded |
| notes | text | nullable — ملاحظات العميل |
| internal_notes | text | nullable — ملاحظات التاجر |
| tracking_number | text | nullable |
| shipping_company | text | nullable |
| kashier_order_id | text | nullable |
| kashier_payment_id | text | nullable |
| paid_at | timestamp(tz) | nullable |
| shipped_at | timestamp(tz) | nullable |
| delivered_at | timestamp(tz) | nullable |
| cancelled_at | timestamp(tz) | nullable |
| created_at / updated_at | timestamp(tz) | default now() |

**Unique**: `(store_id, order_number)`
**Indexes**: `store_id`, `(store_id, order_status)`, `(store_id, payment_status)`, `customer_id`, `created_at`

### store_order_items (عناصر الطلب)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| order_id | UUID | FK → store_orders, ON DELETE CASCADE |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| product_id | UUID | FK → store_products, ON DELETE SET NULL |
| variant_id | text | nullable |
| name | text | NOT NULL — snapshot اسم المنتج وقت الشراء |
| price | decimal(10,2) | NOT NULL — سعر الوحدة |
| quantity | integer | NOT NULL |
| total | decimal(10,2) | NOT NULL — price × quantity |
| variant_options | jsonb | VariantOption[], nullable |
| image | text | nullable — snapshot صورة المنتج |

**Indexes**: `order_id`, `store_id`, `product_id`

### store_shipping_zones (مناطق الشحن)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| name | text | NOT NULL — مثال: "القاهرة والجيزة" |
| governorates | jsonb | string[], default [] — أسماء المحافظات |
| shipping_fee | decimal(10,2) | NOT NULL |
| free_shipping_minimum | decimal(10,2) | nullable — الحد الأدنى للشحن المجاني |
| estimated_days | text | nullable — مثال: "2-3 أيام" |
| is_active | boolean | default true |
| sort_order | integer | default 0 |
| created_at | timestamp(tz) | default now() |

### store_coupons (كوبونات الخصم)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| code | text | NOT NULL, Unique per store |
| type | text | NOT NULL — 'percentage' / 'fixed' |
| value | decimal(10,2) | NOT NULL |
| min_order_amount | decimal(10,2) | nullable |
| max_discount | decimal(10,2) | nullable — الحد الأقصى للخصم |
| usage_limit | integer | nullable |
| used_count | integer | default 0 |
| starts_at | timestamp(tz) | nullable |
| expires_at | timestamp(tz) | nullable |
| is_active | boolean | default true |
| created_at | timestamp(tz) | default now() |

**Unique**: `(store_id, code)`

### store_pages (الصفحات الثابتة)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| title | text | NOT NULL |
| slug | text | NOT NULL, Unique per store |
| content | jsonb | PageBlock[], default [] |
| page_type | text | default 'landing' |
| is_published | boolean | default false |
| seo_title | text | nullable |
| seo_description | text | nullable |
| created_at / updated_at | timestamp(tz) | default now() |

**Unique**: `(store_id, slug)`

### store_hero_slides (بانرات الصفحة الرئيسية)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| title | text | nullable |
| subtitle | text | nullable |
| image_url | text | NOT NULL |
| link_url | text | nullable |
| button_text | text | nullable |
| sort_order | integer | default 0 |
| is_active | boolean | default true |
| created_at | timestamp(tz) | default now() |

### store_reviews (التقييمات)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, ON DELETE CASCADE |
| product_id | UUID | FK → store_products, ON DELETE CASCADE |
| order_id | UUID | FK → store_orders, ON DELETE SET NULL |
| customer_name | text | NOT NULL |
| customer_phone | text | nullable |
| rating | integer | NOT NULL — 1 إلى 5 |
| comment | text | nullable |
| is_approved | boolean | default false — يحتاج موافقة التاجر |
| created_at | timestamp(tz) | default now() |

### platform_plans (خطط المنصة)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | text | Primary Key — 'free' / 'basic' / 'pro' |
| name | text | NOT NULL — الاسم بالعربية |
| name_en | text | nullable — الاسم بالإنجليزية |
| price_monthly | decimal(10,2) | NOT NULL |
| price_yearly | decimal(10,2) | nullable |
| order_fee | decimal(10,4) | nullable — عمولة لكل طلب |
| max_products | integer | nullable — null = غير محدود |
| max_orders_per_month | integer | nullable — null = غير محدود |
| features | jsonb | string[], default [] |
| is_active | boolean | default true |
| sort_order | integer | default 0 |

### platform_activity_log (سجل النشاط)
| العمود | النوع | ملاحظات |
|--------|-------|---------|
| id | UUID | Primary Key |
| store_id | UUID | FK → stores, nullable, ON DELETE CASCADE |
| merchant_id | UUID | FK → merchants, nullable, ON DELETE CASCADE |
| action | text | NOT NULL |
| entity | text | NOT NULL |
| entity_id | text | nullable |
| metadata | jsonb | Record<string, unknown>, nullable |
| created_at | timestamp(tz) | default now() |

## JSONB Types (من schema.ts)

```typescript
// StoreTheme
{
  primaryColor: string      // default '#000000'
  secondaryColor: string    // default '#ffffff'
  accentColor: string       // default '#3b82f6'
  fontFamily: string        // default 'Cairo'
  borderRadius: string      // default '8px'
  headerStyle: 'simple' | 'centered' | 'full'
}

// StoreSettings
{
  currency: string          // default 'EGP'
  language: 'ar' | 'en'    // default 'ar'
  direction: 'rtl' | 'ltr' // default 'rtl'
  showOutOfStock: boolean   // default false
  requirePhone: boolean     // default true
  requireEmail: boolean     // default false
  minOrderAmount: number | null
  maxOrderAmount: number | null
}

// SocialLinks
{
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  whatsapp?: string
}

// ShippingAddress
{
  governorate: string
  city: string
  area: string
  street: string
  building?: string
  floor?: string
  apartment?: string
  landmark?: string
  postalCode?: string
}

// ProductVariant
{
  id: string               // nanoid()
  options: VariantOption[]  // [{name: "اللون", value: "أحمر"}]
  price: number
  compareAtPrice?: number
  sku?: string
  stock: number
  imageUrl?: string
  isActive: boolean
}

// VariantOption
{ name: string; value: string }

// PageBlock
{
  id: string
  type: 'hero' | 'text' | 'image' | 'products' | 'cta' | 'testimonials' | 'faq' | 'video' | 'gallery' | 'form'
  content: Record<string, unknown>
  settings: Record<string, unknown>
  order: number
}
```

## الفهارس (Indexes)

| الجدول | الفهرس |
|--------|--------|
| stores | `slug` (unique), `merchant_id`, `custom_domain` |
| store_categories | `(store_id, slug)` unique, `store_id`, `parent_id` |
| store_products | `(store_id, slug)` unique, `store_id`, `category_id`, `(store_id, is_active)`, `(store_id, is_featured)` |
| store_customers | `(store_id, phone)` unique, `store_id` |
| store_orders | `(store_id, order_number)` unique, `store_id`, `(store_id, order_status)`, `(store_id, payment_status)`, `customer_id`, `created_at` |
| store_order_items | `order_id`, `store_id`, `product_id` |
| store_shipping_zones | `store_id` |
| store_coupons | `(store_id, code)` unique, `store_id` |
| store_pages | `(store_id, slug)` unique, `store_id` |
| store_hero_slides | `store_id` |
| store_reviews | `store_id`, `product_id` |
| platform_activity_log | `store_id`, `merchant_id`, `created_at` |

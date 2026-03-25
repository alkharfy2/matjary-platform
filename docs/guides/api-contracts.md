# عقود الـ API (API Contracts) - متجري

> هذا المستند يحدد كل الـ API endpoints التي سيبنيها Dev 1 ويستخدمها Dev 2 و Dev 3.
> كل endpoint يجب أن يتبع النمط الموحد: `apiSuccess(data)` للنجاح و `apiError(message, status)` للخطأ.

## الاستجابة الموحدة

```typescript
// نجاح
{ "success": true, "data": { ... } }

// خطأ
{ "success": false, "error": "رسالة الخطأ", "code": "ERROR_CODE" }
```

---

## 1. API المتاجر (Dev 1 يبني)

### POST /api/stores — إنشاء متجر
```
Auth: Clerk userId (required)
Body: {
  name: string        // 2-50 حرف
  slug: string        // 3-30 حرف، [a-z0-9-] فقط
  category?: string
}
Response 201: {
  success: true,
  data: {
    id: string,
    name: string,
    slug: string,
    plan: "free"
  }
}
Errors:
  401 — غير مصرح (UNAUTHORIZED)
  422 — الرابط مستخدم بالفعل (VALIDATION_ERROR)
  422 — اسم المتجر قصير جداً (VALIDATION_ERROR)
```

### GET /api/stores/[id] — بيانات المتجر
```
Auth: Clerk userId (owner only)
Response 200: { success: true, data: Store }
Errors: 401, 404
```

### PUT /api/stores/[id] — تعديل المتجر
```
Auth: Clerk userId (owner only)
Body: Partial<{ name, description, contactEmail, contactPhone, ... }>
Response 200: { success: true, data: Store }
Errors: 401, 404, 422
```

---

## 2. API المنتجات — Dashboard (Dev 2 يبني)

### GET /api/dashboard/products
```
Auth: Clerk userId + x-store-slug header
Query: ?search=&category=&status=active|draft&page=1&limit=20
Response 200: {
  success: true,
  data: {
    products: Product[],
    total: number,
    page: number,
    totalPages: number
  }
}
```

### POST /api/dashboard/products
```
Auth: Clerk userId + x-store-slug header
Body: FormData {
  name: string,
  slug: string,
  price: number,
  description?: string,
  categoryId?: string,
  images: File[],          // max 5 صور
  variants?: string,       // JSON stringified ProductVariant[]
  stock: number,
  isActive: boolean,
  isFeatured: boolean
}
Response 201: { success: true, data: Product }
Errors: 401, 422
```

### GET /api/dashboard/products/[id]
```
Auth: owner
Response 200: { success: true, data: Product }
```

### PUT /api/dashboard/products/[id]
```
Auth: owner
Body: Partial product data (FormData)
Response 200: { success: true, data: Product }
```

### DELETE /api/dashboard/products/[id]
```
Auth: owner
Response 200: { success: true, data: { deleted: true } }
```

---

## 3. API الطلبات — Dashboard (Dev 2 يبني)

### GET /api/dashboard/orders
```
Auth: owner
Query: ?status=pending|confirmed|...&page=1&limit=20
Response 200: {
  success: true,
  data: {
    orders: (Order & { items: OrderItem[] })[],
    total: number
  }
}
```

### GET /api/dashboard/orders/[id]
```
Auth: owner
Response 200: { success: true, data: Order & { items: OrderItem[], customer: Customer } }
```

### PATCH /api/dashboard/orders/[id]/status
```
Auth: owner
Body: { orderStatus: string, trackingNumber?: string, shippingCompany?: string }
Response 200: { success: true, data: Order }
```

---

## 4. API التصنيفات (Dev 2 يبني)

### GET /api/dashboard/categories
```
Auth: owner
Response 200: { success: true, data: Category[] }
```

### POST /api/dashboard/categories
```
Auth: owner
Body: { name, slug, description?, imageUrl?, parentId?, sortOrder? }
Response 201: { success: true, data: Category }
```

### PUT /api/dashboard/categories/[id]
```
Auth: owner
Body: Partial category data
Response 200: { success: true, data: Category }
```

### DELETE /api/dashboard/categories/[id]
```
Auth: owner
Response 200: { success: true, data: { deleted: true } }
```

---

## 5. API الكوبونات (Dev 2 يبني)

### CRUD /api/dashboard/coupons
نفس النمط: GET (list), POST (create), PUT/[id] (update), DELETE/[id] (delete)

---

## 6. API مناطق الشحن (Dev 2 يبني)

### CRUD /api/dashboard/shipping
نفس النمط

---

## 7. API التصميم (Dev 2 يبني)

### PUT /api/dashboard/design/theme
```
Auth: owner
Body: StoreTheme
Response 200: { success: true, data: Store }
```

### POST /api/dashboard/design/hero-slides
```
Auth: owner
Body: FormData { title?, subtitle?, image: File, linkUrl?, buttonText?, sortOrder }
Response 201: { success: true, data: HeroSlide }
```

### DELETE /api/dashboard/design/hero-slides/[id]
```
Auth: owner
Response 200: { success: true, data: { deleted: true } }
```

---

## 8. API Checkout — Storefront (Dev 1 يبني، Dev 3 يستخدم)

### POST /api/checkout
```
Auth: لا يحتاج (عام)
Body: {
  storeId: string,
  items: [{
    productId: string,
    variantId?: string,
    quantity: number
  }],
  shipping: {
    governorate: string,
    city: string,
    area: string,
    street: string,
    building?: string,
    floor?: string,
    apartment?: string
  },
  customerName: string,
  customerPhone: string,
  customerEmail?: string,
  paymentMethod: 'cod' | 'kashier',
  couponCode?: string
}
Response 201: {
  success: true,
  data: {
    orderId: string,
    orderNumber: string,
    total: number,
    paymentUrl?: string   // فقط إذا kashier
  }
}
Errors:
  404 — المتجر غير موجود
  422 — المنتج غير متوفر أو المخزون غير كافي
  422 — الكوبون غير صالح
  422 — المنطقة غير مدعومة للشحن
```

### POST /api/coupons/validate
```
Body: { storeId: string, code: string, subtotal: number }
Response 200: {
  success: true,
  data: {
    valid: boolean,
    type: 'percentage' | 'fixed',
    value: number,
    discountAmount: number
  }
}
```

### POST /api/shipping/calculate
```
Body: { storeId: string, governorate: string }
Response 200: {
  success: true,
  data: {
    cost: number,
    estimatedDays: string | null,
    freeShippingMinimum: number | null
  }
}
```

---

## 9. API الدفع — Kashier (Dev 1 يبني)

### POST /api/payments/kashier/create
```
Internal: يُستدعى من POST /api/checkout عند paymentMethod = 'kashier'
Response: { redirectUrl: string }
```

### POST /api/payments/kashier/webhook
```
From: Kashier servers
Action: يحدّث payment_status في store_orders
```

---

## 10. Storefront Public APIs (لصفحات المتجر)

> هذه الـ queries تُنفّذ مباشرة في Server Components باستخدام Drizzle — ليست API routes.
> Dev 3 يستخدمها في صفحات `store/`.

```typescript
// جلب منتجات المتجر
const products = await db.select().from(storeProducts)
  .where(and(eq(storeProducts.storeId, store.id), eq(storeProducts.isActive, true)))

// جلب تصنيفات المتجر
const categories = await db.select().from(storeCategories)
  .where(and(eq(storeCategories.storeId, store.id), eq(storeCategories.isActive, true)))

// جلب hero slides
const slides = await db.select().from(storeHeroSlides)
  .where(and(eq(storeHeroSlides.storeId, store.id), eq(storeHeroSlides.isActive, true)))
```

---

## ملاحظات مهمة

1. **كل API route للداشبورد** يجب أن يبدأ بـ:
   ```typescript
   const { store } = await verifyStoreOwnership()
   if (!store) return ApiErrors.unauthorized()
   ```

2. **Pagination**: كل endpoint يُرجع قائمة يدعم `?page=1&limit=20`

3. **Search**: الـ endpoints التي تدعم البحث تقبل `?search=` ويبحث في `name`

4. **Sort**: الافتراضي `createdAt DESC` إلا إذا كان هناك `sortOrder`

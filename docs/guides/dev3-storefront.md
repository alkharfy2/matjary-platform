# دليل المطور 3 - واجهة المتجر (Storefront)

## مسؤولياتك

واجهة المتجر التي يراها العملاء النهائيون + سلة التسوق + Checkout.
كل شيء تحت `src/app/store/`.

> **ملاحظة مهمة**: صفحات المتجر موجودة تحت المسار الحقيقي `/store/` لكن الـ middleware يعمل rewrite شفاف. العميل يرى `ahmed.matjary.com/` لكن Next.js يخدّم `ahmed.matjary.com/store/` داخلياً.

## الملفات المسؤول عنها

```
src/app/store/
├── layout.tsx                    ← موجود (حسّنه - header/footer ديناميكي)
├── page.tsx                      ← الصفحة الرئيسية (hero + منتجات)
├── category/[slug]/page.tsx      ← صفحة التصنيف
├── product/[slug]/page.tsx       ← صفحة المنتج (الأهم!)
├── cart/page.tsx                 ← سلة التسوق
├── checkout/page.tsx             ← إتمام الطلب
├── order-success/page.tsx        ← تأكيد الطلب
└── page/[slug]/page.tsx          ← صفحات ثابتة (أنشئه)

src/lib/
├── stores/                       ← أنشئ هذا المجلد
│   └── cart-store.ts             ← Zustand cart store
└── tenant/
    └── store-context.tsx         ← موجود (استخدمه)
```

## المهام بالتفصيل

### المهمة 1: الصفحة الرئيسية للمتجر

```typescript
// src/app/store/page.tsx

// 1. جلب hero slides
const heroSlides = await db
  .select()
  .from(storeHeroSlides)
  .where(and(
    eq(storeHeroSlides.storeId, store.id),
    eq(storeHeroSlides.isActive, true)
  ))
  .orderBy(storeHeroSlides.sortOrder)

// 2. جلب التصنيفات
const categories = await db
  .select()
  .from(storeCategories)
  .where(eq(storeCategories.storeId, store.id))
  .orderBy(storeCategories.sortOrder)

// 3. جلب المنتجات المميزة
const featuredProducts = await db
  .select()
  .from(storeProducts)
  .where(and(
    eq(storeProducts.storeId, store.id),
    eq(storeProducts.isActive, true),
    eq(storeProducts.isFeatured, true)
  ))
  .limit(8)

// 4. جلب أحدث المنتجات
const latestProducts = await db
  .select()
  .from(storeProducts)
  .where(and(
    eq(storeProducts.storeId, store.id),
    eq(storeProducts.isActive, true)
  ))
  .orderBy(desc(storeProducts.createdAt))
  .limit(12)
```

### المهمة 2: صفحة المنتج (الأهم)

يجب أن تعرض:
- صور المنتج (gallery/carousel)
- الاسم والوصف
- السعر (والسعر قبل الخصم إن وُجد)
- اختيار المتغيرات (ألوان/أحجام)
- تعديل الكمية
- زر "أضف إلى السلة"
- المنتجات المشابهة

```typescript
// جلب المنتج
const product = await db
  .select()
  .from(storeProducts)
  .where(and(
    eq(storeProducts.storeId, store.id),
    eq(storeProducts.slug, slug),
    eq(storeProducts.isActive, true)
  ))
  .limit(1)

if (!product[0]) notFound()
```

### المهمة 3: سلة التسوق (Zustand)

```typescript
// src/lib/stores/cart-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CartItem = {
  productId: string
  productName: string
  productImage: string | null
  variantId: string | null
  variantLabel: string | null
  quantity: number
  unitPrice: number
}

type CartStore = {
  items: CartItem[]
  storeId: string | null
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, qty: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      
      addItem: (item) => set((state) => {
        // إذا كان من متجر مختلف، امسح السلة أولاً
        // يتم التعامل مع هذا عبر setStoreId() في store layout
        const existing = state.items.find(
        }
          (i) => i.productId === item.productId && i.variantId === item.variantId
        )
        
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.productId === item.productId && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          }
        }
        
        return { items: [...state.items, item] }
      }),
      
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),
      
      updateQuantity: (productId, variantId, qty) =>
        set((state) => ({
          items: qty <= 0
            ? state.items.filter(
                (i) => !(i.productId === productId && i.variantId === variantId)
              )
            : state.items.map((i) =>
                i.productId === productId && i.variantId === variantId
                  ? { ...i, quantity: qty }
                  : i
              ),
        })),
      
      clearCart: () => set({ items: [], storeId: null }),
      
      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      
      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'matjary-cart' }
  )
)
```

### المهمة 4: Checkout

```
1. العميل يملأ بيانات الشحن (اسم + هاتف + عنوان + محافظة)
2. يختار طريقة الدفع (COD أو Kashier)
3. يدخل كوبون خصم (اختياري)
4. يضغط "تأكيد الطلب"
5. API تحسب:
   - subtotal من cart items
   - shipping_cost من shipping_zones حسب المحافظة
   - discount_amount من coupon (إن وُجد)
   - total = subtotal + shipping - discount
6. تُنشئ order + order_items
7. تُنقص المخزون
8. إذا kashier → redirect للدفع
9. إذا COD → redirect لصفحة النجاح
```

**API Route:**
```
POST /api/checkout
Body: {
  storeId,
  items: [{ productId, variantId, quantity }],
  shipping: { fullName, phone, address, city, governorate },
  paymentMethod: 'cod' | 'kashier',
  couponCode?: string
}
```

### المهمة 5: التحقق من الكوبون

```
POST /api/coupons/validate
Body: { storeId, code, subtotal }
Response: { valid, type, value, discountAmount }
```

### المهمة 6: حساب تكلفة الشحن

```
POST /api/shipping/calculate
Body: { storeId, governorate }
Response: { cost, estimatedDays, freeShippingMin }
```

## Theme الديناميكي

Layout الـ storefront يطبّق ألوان المتجر:

```typescript
// في layout.tsx
<div
  style={{
    '--store-primary': store.theme.primaryColor,
    '--store-secondary': store.theme.secondaryColor,
  } as React.CSSProperties}
>
  {children}
</div>
```

ثم في CSS:
```css
.btn-primary {
  background-color: var(--store-primary);
}
```

## نصائح

1. **SEO**: استخدم `generateMetadata` في صفحات المنتجات
2. **Responsive**: التصميم mobile-first (أغلب المستخدمين على الموبايل)
3. **Loading States**: استخدم `loading.tsx` أو Suspense
4. **RTL**: كل شيء من اليمين لليسار
5. **formatPrice()**: استخدمه دائماً لعرض الأسعار

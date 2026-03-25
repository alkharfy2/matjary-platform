# اتفاقيات المكونات (Components Convention) - متجري

## هيكل المجلدات

```
src/
├── components/
│   ├── ui/                    ← مكونات عامة مشتركة (shadcn/ui style)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── data-table.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── shared/                ← مكونات مشتركة بين أكثر من قسم
│   │   ├── image-upload.tsx
│   │   ├── price-display.tsx
│   │   ├── status-badge.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-spinner.tsx
│   │   └── pagination.tsx
│   ├── dashboard/             ← مكونات خاصة بلوحة التحكم (Dev 2)
│   │   ├── sidebar.tsx
│   │   ├── stat-card.tsx
│   │   ├── product-form.tsx
│   │   ├── order-status-select.tsx
│   │   └── ...
│   └── store/                 ← مكونات خاصة بواجهة المتجر (Dev 3)
│       ├── product-card.tsx
│       ├── cart-drawer.tsx
│       ├── hero-slider.tsx
│       ├── category-grid.tsx
│       ├── checkout-form.tsx
│       └── ...
```

## قواعد أساسية

### 1. كل مكون في ملف مستقل

```typescript
// ✅ src/components/ui/button.tsx
export function Button({ children, ...props }) { ... }

// ❌ لا تضع عدة مكونات في ملف واحد
```

### 2. التسمية

| النوع | التسمية | مثال |
|-------|---------|------|
| ملف المكون | `kebab-case.tsx` | `product-card.tsx` |
| اسم المكون | `PascalCase` | `ProductCard` |
| Props type | `ComponentNameProps` | `ProductCardProps` |

### 3. البنية الأساسية لكل مكون

```typescript
// src/components/shared/price-display.tsx

import { formatPrice } from '@/lib/utils'

type PriceDisplayProps = {
  price: number
  compareAtPrice?: number | null
  size?: 'sm' | 'md' | 'lg'
}

export function PriceDisplay({
  price,
  compareAtPrice,
  size = 'md',
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold ${sizeClasses[size]}`}>
        {formatPrice(price)}
      </span>
      {compareAtPrice && compareAtPrice > price && (
        <span className="text-gray-400 line-through text-sm">
          {formatPrice(compareAtPrice)}
        </span>
      )}
    </div>
  )
}
```

### 4. Server vs Client Components

```typescript
// Server Component (default) — لا يحتاج 'use client'
// ✅ استخدمه عندما: لا يحتاج state أو event handlers
export function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}

// Client Component — يحتاج 'use client'
// ✅ استخدمه عندما: يحتاج state, effects, event handlers, browser APIs
'use client'

import { useState } from 'react'

export function QuantitySelector({ onChange }: QuantitySelectorProps) {
  const [qty, setQty] = useState(1)
  // ...
}
```

### 5. Tailwind فقط — لا CSS مخصص

```typescript
import { cn } from '@/lib/utils'

// ✅ استخدم cn() لدمج الأصناف الشرطية
export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variant === 'success' && 'bg-green-100 text-green-800',
        variant === 'warning' && 'bg-yellow-100 text-yellow-800',
        variant === 'danger' && 'bg-red-100 text-red-800',
      )}
    >
      {children}
    </span>
  )
}
```

## المكونات المشتركة التي يحتاجها الجميع

> **Dev 2 و Dev 3**: قبل بناء مكون جديد، تحقق هل يوجد في `components/shared/` أو `components/ui/`.
> إذا احتجت مكون مشترك، أنشئه في `components/shared/` مع توثيق بسيط.

### قائمة المكونات المشتركة المقترحة

| المكون | الاستخدام | المسؤول |
|--------|----------|---------|
| `Button` | أزرار بأحجام وألوان مختلفة | أول من يحتاجه |
| `Input` | حقول إدخال مع label وerror | أول من يحتاجه |
| `DataTable` | جداول مع pagination + sort + filter | Dev 2 (ينشئه أولاً) |
| `Dialog/Modal` | نوافذ منبثقة | أول من يحتاجه |
| `ImageUpload` | رفع صور مع preview | Dev 2 (ثم Dev 3 يستخدمه) |
| `PriceDisplay` | عرض السعر بالجنيه المصري | Dev 3 (ثم Dev 2 يستخدمه) |
| `StatusBadge` | شارة الحالة (نشط/معلق/...) | Dev 2 |
| `EmptyState` | حالة فارغة (لا منتجات/طلبات) | أول من يحتاجه |
| `LoadingSpinner` | مؤشر تحميل | أول من يحتاجه |
| `Pagination` | ترقيم الصفحات | Dev 2 (ثم Dev 3 يستخدمه) |
| `Toast/Notification` | إشعارات النجاح/الخطأ | أول من يحتاجه |
| `ProductCard` | بطاقة المنتج (grid) | Dev 3 |

## التنسيق مع الثيم الديناميكي

في واجهة المتجر (store/)، استخدم CSS variables المُحددة في globals.css:

```typescript
// components/store/product-card.tsx
export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="border rounded-[var(--store-radius)] overflow-hidden hover:shadow-lg transition">
      {/* ... */}
      <button className="w-full bg-[var(--store-primary)] text-white py-2 hover:opacity-90">
        أضف إلى السلة
      </button>
    </div>
  )
}
```

## RTL / التصميم العربي

- كل التصميم **RTL أولاً** (اللغة العربية)
- استخدم `gap` بدل `margin-left/right`
- استخدم `start/end` بدل `left/right` عند الحاجة:
  ```
  ✅ text-start, ps-4, pe-4, ms-auto, me-2
  ❌ text-left, pl-4, pr-4, ml-auto, mr-2
  ```
- استخدم `flex-row-reverse` فقط إذا كنت تحتاج LTR في سياق RTL

## Responsive Design

```typescript
// Mobile first — ابدأ بالشاشات الصغيرة
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {products.map(p => <ProductCard key={p.id} product={p} />)}
</div>
```

Breakpoints:
- `sm`: 640px+
- `md`: 768px+
- `lg`: 1024px+
- `xl`: 1280px+

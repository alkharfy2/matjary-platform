'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Star, ShoppingBag, GitCompareArrows } from 'lucide-react'
import { useCompareStore } from '@/lib/stores/compare-store'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'

type CompareProduct = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
  isFeatured: boolean
  shortDescription: string | null
  avgRating?: number
  totalReviews?: number
  categoryName?: string
}

type ComparePageContentProps = {
  storeId: string
  storeSlug: string
  currency: string
}

export function ComparePageContent({ storeId, storeSlug, currency }: ComparePageContentProps) {
  const { items, removeItem, clear } = useCompareStore()
  const [products, setProducts] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    const fetchProducts = async () => {
      setLoading(true)
      try {
        const ids = items.map(i => i.productId).join(',')
        const res = await fetch(`/api/storefront/products?ids=${encodeURIComponent(ids)}`)
        if (res.ok) {
          const json = await res.json()
          const arr = json?.data?.data ?? json?.data ?? []
          setProducts(Array.isArray(arr) ? arr : [])
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [items])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary,#000)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-6 py-14 text-center shadow-[var(--ds-shadow-sm)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
            <GitCompareArrows className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--ds-text)]">لا توجد منتجات للمقارنة</h1>
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">أضف منتجات للمقارنة من صفحات المنتجات أو التصنيفات.</p>
          <div className="mt-6">
            <Link
              href={storePath('/', { storeSlug })}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              تصفح المنتجات
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rows: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
    {
      label: 'الصورة',
      render: (p) => p.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.images[0]} alt={p.name} className="mx-auto h-32 w-32 rounded-xl object-cover" />
      ) : (
        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-xl bg-[var(--ds-surface-muted)] text-xs text-[var(--ds-text-soft)]">لا صورة</div>
      ),
    },
    {
      label: 'الاسم',
      render: (p) => (
        <Link
          href={storePath(`/product/${p.slug}` as `/${string}`, { storeSlug })}
          className="font-semibold text-[var(--ds-text)] hover:underline"
        >
          {p.name}
        </Link>
      ),
    },
    {
      label: 'السعر',
      render: (p) => (
        <div>
          <span className="text-lg font-black" style={{ color: 'var(--color-primary, #000)' }}>
            {formatPrice(Number(p.price), currency)}
          </span>
          {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && (
            <span className="mr-2 text-xs text-[var(--ds-text-muted)] line-through">
              {formatPrice(Number(p.compareAtPrice), currency)}
            </span>
          )}
        </div>
      ),
    },
    {
      label: 'التوفر',
      render: (p) => (
        <span className={p.stock > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
          {p.stock > 0 ? 'متوفر' : 'غير متوفر'}
        </span>
      ),
    },
    {
      label: 'التقييم',
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          {p.avgRating != null && p.totalReviews != null && p.totalReviews > 0 ? (
            <>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(p.avgRating!) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs text-[var(--ds-text-muted)]">({p.totalReviews})</span>
            </>
          ) : (
            <span className="text-xs text-[var(--ds-text-muted)]">لا تقييمات</span>
          )}
        </div>
      ),
    },
    {
      label: 'الوصف',
      render: (p) => (
        <p className="line-clamp-3 text-sm text-[var(--ds-text-muted)]">{p.shortDescription ?? '—'}</p>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[var(--ds-text)]">مقارنة المنتجات</h1>
        <button
          onClick={clear}
          className="text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        >
          مسح الكل
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="w-28" />
              {products.map((product) => (
                <th key={product.id} className="px-4 py-3 text-center">
                  <button
                    onClick={() => removeItem(product.id)}
                    className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ds-divider)] text-[var(--ds-text-muted)] hover:border-red-300 hover:text-red-500"
                    title="إزالة من المقارنة"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--ds-divider)]">
                <td className="px-4 py-3 text-sm font-semibold text-[var(--ds-text-muted)]">{row.label}</td>
                {products.map((product) => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/tenant/store-context'
import { useWishlistStore } from '@/lib/stores/wishlist-store'
import { storePath } from '@/lib/tenant/store-path'
import { formatPrice } from '@/lib/utils'
import { Heart, Trash2 } from 'lucide-react'
import { buildProductSlugSegment } from '@/lib/products/product-slug'

type WishlistProduct = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
}

export default function WishlistPage() {
  const store = useStore()
  const currency = store.settings.currency ?? 'EGP'
  const { items: localItems, removeItem } = useWishlistStore()
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadWishlist() {
      try {
        const res = await fetch('/api/storefront/wishlist')
        const data = await res.json()

        if (!cancelled && data?.success && data.data?.items?.length > 0) {
          // Each item has a nested .product from the DB relation
          const mapped = data.data.items
            .map((w: { product?: WishlistProduct }) => w.product)
            .filter(Boolean) as WishlistProduct[]
          setProducts(mapped)
          setLoading(false)
          return
        }
      } catch { /* fall through to local */ }

      // Fallback: load from local wishlist store IDs
      if (!cancelled && localItems.length > 0) {
        try {
          const ids = localItems.map((i) => i.productId).join(',')
          const res = await fetch(`/api/storefront/products?ids=${encodeURIComponent(ids)}`)
          const data = await res.json()
          if (!cancelled && data?.success) {
            setProducts(data.data ?? [])
          }
        } catch { /* ignore */ }
      }

      if (!cancelled) setLoading(false)
    }

    void loadWishlist()
    return () => { cancelled = true }
  }, [localItems])

  function handleRemove(productId: string) {
    removeItem(productId)
    setProducts((prev) => prev.filter((p) => p.id !== productId))

    // Also remove from server
    fetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary,#000)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel-elevated rounded-[28px] p-6">
        <h1 className="ds-heading text-2xl font-black text-[var(--ds-text)]">المفضلة</h1>
        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
          {products.length > 0 ? `${products.length} منتج في مفضلتك` : 'مفضلتك فارغة'}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="surface-panel-elevated flex flex-col items-center gap-4 rounded-[28px] p-10">
          <Heart className="h-16 w-16 text-[var(--ds-text-soft)]" />
          <p className="text-[var(--ds-text-muted)]">لم تقم بإضافة أي منتج للمفضلة بعد</p>
          <Link
            href={storePath('/', { storeSlug: store.slug })}
            className="rounded-[20px] px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow)]"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const numericPrice = Number(product.price)
            const numericCompare = product.compareAtPrice ? Number(product.compareAtPrice) : null
            const hasDiscount = numericCompare !== null && numericCompare > numericPrice
            const outOfStock = product.stock <= 0
            const productSegment = buildProductSlugSegment(product.id, product.slug)

            return (
              <div key={product.id} className="surface-panel-elevated group overflow-hidden rounded-[24px]">
                <Link href={storePath(`/product/${productSegment}`, { storeSlug: store.slug })}>
                  <div className="relative aspect-square overflow-hidden bg-[var(--surface-muted,#f1f5f9)]">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[var(--ds-text-soft)]">
                        لا توجد صورة
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-600">
                          غير متوفر
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={storePath(`/product/${productSegment}`, { storeSlug: store.slug })}>
                    <h3 className="text-sm font-bold text-[var(--ds-text)] line-clamp-2">{product.name}</h3>
                  </Link>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-base font-black" style={{ color: 'var(--color-primary, #000)' }}>
                      {formatPrice(numericPrice, currency)}
                    </span>
                    {hasDiscount && numericCompare !== null && (
                      <span className="text-xs text-[var(--ds-text-soft)] line-through">
                        {formatPrice(numericCompare, currency)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="flex items-center gap-1 rounded-xl border border-[var(--ds-danger)]/30 px-3 py-2 text-xs font-medium text-[var(--ds-danger)] transition-all hover:bg-[var(--ds-danger)]/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      إزالة
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

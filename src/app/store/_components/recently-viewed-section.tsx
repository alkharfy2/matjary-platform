'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed-store'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'
import Link from 'next/link'

type RecentProduct = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
}

type RecentlyViewedSectionProps = {
  storeSlug: string
  currency: string
  excludeProductId?: string
}

export function RecentlyViewedSection({ storeSlug, currency, excludeProductId }: RecentlyViewedSectionProps) {
  const items = useRecentlyViewedStore(state => state.items)
  const [products, setProducts] = useState<RecentProduct[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || items.length === 0) return

    const productIds = items
      .map(i => i.productId)
      .filter(id => id !== excludeProductId)
      .slice(0, 6)

    if (productIds.length === 0) {
      setProducts([])
      return
    }

    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/storefront/products?ids=${encodeURIComponent(productIds.join(','))}`)
        if (res.ok) {
          const json = await res.json()
          const arr = json?.data?.data ?? json?.data ?? []
          setProducts(Array.isArray(arr) ? arr : [])
        }
      } catch {
        // silent
      }
    }

    fetchProducts()
  }, [items, mounted, excludeProductId])

  if (!mounted || products.length === 0) return null

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5 text-[var(--color-primary,#000)]" />
        <h2 className="text-xl font-bold text-[var(--ds-text)]">شاهدته مؤخراً</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {(Array.isArray(products) ? products : []).map((product) => {
          const numericPrice = Number(product.price)
          const numericCompare = product.compareAtPrice ? Number(product.compareAtPrice) : null
          const hasDiscount = numericCompare !== null && numericCompare > numericPrice

          return (
            <Link
              key={product.id}
              href={storePath(`/product/${product.slug}` as `/${string}`, { storeSlug })}
              className="group flex w-40 shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] shadow-[var(--ds-shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--ds-shadow-lg)]"
            >
              <div className="aspect-square overflow-hidden bg-[var(--surface-muted,#f1f5f9)]">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--ds-text-soft)]">لا صورة</div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-[var(--ds-text)]">{product.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary, #000)' }}>
                    {formatPrice(numericPrice, currency)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-[var(--ds-text-muted)] line-through">
                      {formatPrice(numericCompare, currency)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

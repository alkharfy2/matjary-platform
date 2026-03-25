import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'
import { buildProductSlugSegment } from '@/lib/products/product-slug'
import type { ProductVariant } from '@/db/schema'

export type ProductCardProps = {
  id: string
  storeSlug: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
  isFeatured: boolean
  variants: ProductVariant[]
  currency?: string
}

function isSafeOptimizedImageSrc(src: string): boolean {
  if (src.startsWith('/')) return true

  try {
    const url = new URL(src)
    if (url.protocol !== 'https:') return false

    if (url.hostname === 'i.postimg.cc') return true

    const isSupabaseAsset =
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.startsWith('/storage/v1/object/public/')

    return isSupabaseAsset
  } catch {
    return false
  }
}

export function ProductCard({
  id,
  storeSlug,
  name,
  slug,
  price,
  compareAtPrice,
  images,
  stock,
  isFeatured,
  currency = 'EGP',
}: ProductCardProps) {
  const mainImage = images[0] ?? null
  const numericPrice = Number(price)
  const numericCompare = compareAtPrice ? Number(compareAtPrice) : null
  const hasDiscount = numericCompare !== null && numericCompare > numericPrice
  const outOfStock = stock <= 0
  const productSegment = buildProductSlugSegment(id, slug)

  return (
    <Link
      href={storePath(`/product/${productSegment}`, { storeSlug })}
      className="group block overflow-hidden rounded-[28px] border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] shadow-[var(--ds-shadow-sm)] transition-all duration-[var(--ds-motion-base)] hover:-translate-y-1.5 hover:border-[var(--border-strong,#d1d5db)] hover:bg-[var(--surface-card-hover,#fff)] hover:shadow-[var(--ds-shadow-lg)]"
    >
      <div className="relative aspect-[0.92] overflow-hidden bg-[var(--surface-muted,#f1f5f9)]">
        {mainImage ? (
          isSafeOptimizedImageSrc(mainImage) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-[var(--ds-text-soft)]">
              تعذر عرض الصورة من هذا المصدر
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--ds-text-soft)]">لا توجد صورة</div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.06)_55%,rgba(15,23,42,0.24)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {isFeatured ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-[var(--ds-shadow-sm)]"
              style={{ backgroundColor: 'var(--accent-soft, #eff6ff)', color: 'var(--color-accent, #3b82f6)' }}
            >
              <Sparkles className="h-3 w-3" />
              مميز
            </span>
          ) : null}

          {hasDiscount ? (
            <span
              className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-[var(--ds-shadow-sm)]"
              style={{ backgroundColor: 'var(--ds-danger)' }}
            >
              خصم
            </span>
          ) : null}

          {outOfStock ? (
            <span
              className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-[var(--ds-shadow-sm)]"
              style={{ backgroundColor: 'color-mix(in oklab, var(--ds-text) 72%, transparent)' }}
            >
              نفد المخزون
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-7 text-[var(--ds-text)]">{name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black" style={{ color: 'var(--color-primary, #000)' }}>
              {formatPrice(numericPrice, currency)}
            </span>
            {hasDiscount ? (
              <span className="text-xs text-[var(--ds-text-soft)] line-through">
                {formatPrice(numericCompare, currency)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[18px] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-3 py-2 text-sm shadow-[var(--ds-shadow-sm)]">
          <span className="font-medium text-[var(--ds-text-muted)]">{outOfStock ? 'غير متاح حاليًا' : 'استعرض التفاصيل'}</span>
          <span className="flex items-center gap-1 font-semibold text-[var(--color-primary,#000)]">
            عرض المنتج
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

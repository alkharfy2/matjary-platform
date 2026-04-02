'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import { PriceRangeSlider } from './price-range-slider'
import { RatingFilter } from './rating-filter'

type FilterValues = {
  minPrice?: number
  maxPrice?: number
  rating?: number
  inStock?: boolean
  onSale?: boolean
  sort: string
  page: number
  limit: number
}

type FilterSidebarProps = {
  filters: FilterValues
  categorySegment: string
}

function buildUrl(categorySegment: string, filters: FilterValues) {
  const params = new URLSearchParams()
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
  if (filters.rating) params.set('rating', String(filters.rating))
  if (filters.inStock) params.set('inStock', 'true')
  if (filters.onSale) params.set('onSale', 'true')
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort)
  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

export function FilterSidebar({ filters, categorySegment }: FilterSidebarProps) {
  const router = useRouter()
  const store = useStore()
  const [localFilters, setLocalFilters] = useState(filters)

  const hasActiveFilters = !!(
    localFilters.minPrice || localFilters.maxPrice || localFilters.rating || localFilters.inStock || localFilters.onSale
  )

  const applyFilters = useCallback(() => {
    const url = buildUrl(categorySegment, { ...localFilters, page: 1 })
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
  }, [localFilters, categorySegment, router, store.slug])

  const clearFilters = useCallback(() => {
    const cleared = { sort: 'newest', page: 1, limit: 20 } as FilterValues
    setLocalFilters(cleared)
    const url = `/category/${categorySegment}`
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
  }, [categorySegment, router, store.slug])

  return (
    <div className="sticky top-4 space-y-6 rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] p-5 shadow-[var(--ds-shadow-sm)]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ds-text)]">
          <SlidersHorizontal className="h-4 w-4" />
          الفلاتر
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            <X className="h-3 w-3" />
            مسح الكل
          </button>
        )}
      </div>

      {/* السعر */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">نطاق السعر ({store.settings.currency})</h4>
        <PriceRangeSlider
          minPrice={localFilters.minPrice}
          maxPrice={localFilters.maxPrice}
          currency={store.settings.currency}
          onChange={(min, max) => setLocalFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }))}
        />
      </div>

      {/* التقييم */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">التقييم</h4>
        <RatingFilter
          value={localFilters.rating}
          onChange={(r) => setLocalFilters(prev => ({ ...prev, rating: r }))}
        />
      </div>

      {/* التوفر */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--ds-text-muted)]">التوفر</h4>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ds-text)]">
          <input
            type="checkbox"
            checked={!!localFilters.inStock}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, inStock: e.target.checked || undefined }))}
            className="h-4 w-4 rounded border-[var(--ds-divider)] accent-[var(--color-primary,#000)]"
          />
          متوفر فقط
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ds-text)]">
          <input
            type="checkbox"
            checked={!!localFilters.onSale}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, onSale: e.target.checked || undefined }))}
            className="h-4 w-4 rounded border-[var(--ds-divider)] accent-[var(--color-primary,#000)]"
          />
          عروض فقط (بخصم)
        </label>
      </div>

      {/* أزرار */}
      <div className="space-y-2">
        <button
          onClick={applyFilters}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          تطبيق الفلاتر
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full rounded-xl border border-[var(--ds-divider)] py-2.5 text-sm font-medium text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-muted)]"
          >
            مسح الفلاتر
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

type FilterDrawerProps = {
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

export function FilterDrawer({ filters, categorySegment }: FilterDrawerProps) {
  const router = useRouter()
  const store = useStore()
  const [open, setOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState(filters)

  const hasActiveFilters = !!(
    filters.minPrice || filters.maxPrice || filters.rating || filters.inStock || filters.onSale
  )

  const applyFilters = useCallback(() => {
    const url = buildUrl(categorySegment, { ...localFilters, page: 1 })
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
    setOpen(false)
  }, [localFilters, categorySegment, router, store.slug])

  const clearFilters = useCallback(() => {
    const cleared = { sort: filters.sort, page: 1, limit: 20 } as FilterValues
    setLocalFilters(cleared)
    const url = `/category/${categorySegment}`
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
    setOpen(false)
  }, [categorySegment, router, store.slug, filters.sort])

  return (
    <>
      {/* Trigger Button — visible on mobile only */}
      <button
        onClick={() => { setLocalFilters(filters); setOpen(true) }}
        className="flex items-center gap-2 rounded-xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-3 py-2 text-sm font-medium text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        الفلاتر
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--color-primary, #000)' }}>
            !
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-80 max-w-[85vw] overflow-y-auto bg-[var(--surface-card,#fff)] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--ds-text)]">
                <SlidersHorizontal className="h-4 w-4" />
                الفلاتر
              </h3>
              <button onClick={() => setOpen(false)} className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
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
                <button
                  onClick={clearFilters}
                  className="w-full rounded-xl border border-[var(--ds-divider)] py-2.5 text-sm font-medium text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-muted)]"
                >
                  مسح الفلاتر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'

type SortSelectProps = {
  currentSort: string
  categorySegment: string
  filters: {
    minPrice?: number
    maxPrice?: number
    rating?: number
    inStock?: boolean
    onSale?: boolean
    sort: string
    page: number
    limit: number
  }
}

function buildUrl(categorySegment: string, filters: SortSelectProps['filters'], sort: string) {
  const params = new URLSearchParams()
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice))
  if (filters.rating) params.set('rating', String(filters.rating))
  if (filters.inStock) params.set('inStock', 'true')
  if (filters.onSale) params.set('onSale', 'true')
  if (sort !== 'newest') params.set('sort', sort)
  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

export function SortSelect({ currentSort, categorySegment, filters }: SortSelectProps) {
  const router = useRouter()
  const store = useStore()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = buildUrl(categorySegment, filters, e.target.value)
    router.push(storePath(url as `/${string}`, { storeSlug: store.slug }))
  }

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="rounded-xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-3 py-2 text-sm text-[var(--ds-text)] outline-none shadow-[var(--ds-shadow-sm)]"
    >
      <option value="newest">الأحدث</option>
      <option value="price-asc">السعر: الأقل أولاً</option>
      <option value="price-desc">السعر: الأعلى أولاً</option>
      <option value="name">الاسم</option>
    </select>
  )
}

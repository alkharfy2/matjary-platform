'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { storePath } from '@/lib/tenant/store-path'
import { buildProductSlugSegment } from '@/lib/products/product-slug'
import { formatPrice } from '@/lib/utils'

type SearchItem = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
}

type SearchState = 'idle' | 'loading' | 'success' | 'error'

type StoreSearchProps = {
  storeSlug: string
  currency?: string
  placeholder?: string
  className?: string
}

export function StoreSearch({
  storeSlug,
  currency = 'EGP',
  placeholder = 'ابحث عن منتج...',
  className = '',
}: StoreSearchProps) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [state, setState] = useState<SearchState>('idle')
  const [isOpen, setIsOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchResults = useCallback(
    (q: string) => {
      // نلغي أي طلب سابق لمنع السباق بين الاستجابات القديمة والجديدة.
      abortRef.current?.abort()

      if (q.trim().length < 2) {
        setItems([])
        setState('idle')
        setIsOpen(false)
        return
      }

      setState('loading')
      setIsOpen(true)

      const controller = new AbortController()
      abortRef.current = controller

      fetch(`/api/storefront/search?q=${encodeURIComponent(q.trim())}&limit=6&store=${encodeURIComponent(storeSlug)}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error('فشل البحث')
          return response.json() as Promise<{
            success: boolean
            data: { items: SearchItem[]; currency: string }
          }>
        })
        .then((json) => {
          if (!controller.signal.aborted) {
            setItems(json.data.items)
            setState('success')
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          if (!controller.signal.aborted) {
            setState('error')
          }
        })
    },
    [storeSlug]
  )

  function handleChange(value: string) {
    // Debounce بسيط لتقليل عدد الطلبات أثناء الكتابة السريعة.
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchResults(value), 280)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    // إغلاق قائمة النتائج عند الضغط خارج منطقة البحث.
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    // تنظيف المؤقت والطلب المعلّق عند إلغاء تركيب المكوّن.
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  function handleItemClick() {
    setIsOpen(false)
    setQuery('')
    setItems([])
    setState('idle')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            if (items.length > 0 || state === 'loading') setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="بحث المنتجات"
          className="h-11 w-full rounded-[18px] border py-2.5 pe-4 ps-10 text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-soft)] shadow-[var(--ds-shadow-sm)] transition-all focus:bg-[var(--surface-card-hover,var(--ds-surface-elevated))] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--color-primary,#111827)_22%,transparent)] focus:ring-offset-1 focus:ring-offset-[var(--ds-surface-elevated)]"
          style={{
            borderColor: 'var(--border-soft, #d1d5db)',
            backgroundColor: 'var(--surface-card, #ffffff)',
          }}
        />
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'var(--header-link, #6b7280)' }}
        />
        {state === 'loading' ? (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            <div
              className="h-4 w-4 animate-spin rounded-full border-2"
              style={{
                borderColor: 'color-mix(in oklab, var(--ds-border-strong) 55%, transparent)',
                borderTopColor: 'var(--ds-text-muted)',
              }}
            />
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className="surface-panel-elevated absolute top-full z-50 mt-2 w-full overflow-hidden rounded-[22px]"
          style={{ borderColor: 'var(--border-soft, #e5e7eb)', backgroundColor: 'var(--surface-base, #fff)' }}
        >
          {state === 'loading' && items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">جارٍ البحث...</div>
          ) : null}

          {state === 'success' && items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              لا توجد نتائج لـ &quot;{query.trim()}&quot;
            </div>
          ) : null}

          {state === 'error' ? (
            <div className="px-4 py-6 text-center text-sm text-red-500">حدث خطأ أثناء البحث</div>
          ) : null}

          {items.length > 0 ? (
            <ul className="max-h-80 divide-y divide-[var(--ds-divider)] overflow-y-auto">
              {items.map((item) => {
                const imgSrc = item.images[0] ?? '/placeholder.svg'
                const productSegment = buildProductSlugSegment(item.id, item.slug)

                return (
                  <li key={item.id}>
                    <Link
                      href={storePath(`/product/${productSegment}`, { storeSlug })}
                      onClick={handleItemClick}
                      className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-[var(--surface-card-hover,var(--ds-hover))]"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-muted,var(--ds-surface-muted))]">
                        <Image src={imgSrc} alt={item.name} fill className="object-cover" sizes="56px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--ds-text)]">{item.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: 'var(--color-primary, #000)' }}>
                            {formatPrice(Number(item.price), currency)}
                          </span>
                          {item.compareAtPrice ? (
                            <span className="text-xs text-[var(--ds-text-soft)] line-through">
                              {formatPrice(Number(item.compareAtPrice), currency)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

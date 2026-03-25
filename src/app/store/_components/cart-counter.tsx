'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { storePath } from '@/lib/tenant/store-path'

type CartCounterProps = {
  storeSlug: string
}

export function CartCounter({ storeSlug }: CartCounterProps) {
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  )

  useEffect(() => setMounted(true), [])

  return (
    <Link
      href={storePath('/cart', { storeSlug })}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] text-[var(--header-link,#374151)] shadow-[var(--ds-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-[var(--surface-card-hover,#f8fafc)]"
      aria-label="سلة التسوق"
    >
      <ShoppingCart className="h-5 w-5" />
      {mounted && itemCount > 0 ? (
        <span
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shadow-[var(--ds-shadow-sm)]"
          style={{ backgroundColor: 'var(--color-accent, #3b82f6)' }}
        >
          {itemCount}
        </span>
      ) : null}
    </Link>
  )
}

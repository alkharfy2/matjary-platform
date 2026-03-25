'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type MobileStickyCartProps = {
  price: number | null
  compareAtPrice?: number | null
  currency: string
  onAddToCart: () => void
  disabled?: boolean
  loading?: boolean
}

export function MobileStickyCart({
  price,
  compareAtPrice,
  currency,
  onAddToCart,
  disabled = false,
  loading = false,
}: MobileStickyCartProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById('add-to-cart-btn')
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry ? !entry.isIntersecting : false)
      },
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const hasDiscount =
    price !== null &&
    compareAtPrice !== null &&
    compareAtPrice !== undefined &&
    compareAtPrice > price

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t px-4 py-3 shadow-[0_-10px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        borderColor: 'var(--border-strong, #e5e7eb)',
        backgroundColor: 'color-mix(in oklab, var(--color-secondary, #fff) 88%, white)',
      }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black" style={{ color: 'var(--color-primary, #000)' }}>
            {price !== null ? formatPrice(price, currency) : 'اختر التركيبة'}
          </span>
          {hasDiscount ? (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(compareAtPrice, currency)}
            </span>
          ) : null}
        </div>

        <button
          onClick={onAddToCart}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-[18px] py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <ShoppingBag className="h-4.5 w-4.5" />
          )}
          {loading ? 'جارٍ الإضافة...' : 'أضف إلى السلة'}
        </button>
      </div>
    </div>
  )
}

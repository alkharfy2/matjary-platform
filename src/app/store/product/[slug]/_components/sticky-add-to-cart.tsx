'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type StickyAddToCartProps = {
  productName: string
  productImage: string | null
  price: number | null
  compareAtPrice?: number | null
  currency: string
  onAddToCart: () => void
  disabled?: boolean
  loading?: boolean
}

export function StickyAddToCart({
  productName,
  productImage,
  price,
  compareAtPrice,
  currency,
  onAddToCart,
  disabled = false,
  loading = false,
}: StickyAddToCartProps) {
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
      className={`fixed inset-x-0 bottom-0 z-50 border-t px-4 py-3 shadow-[0_-10px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-300 hidden md:block ${
        visible ? 'md:translate-y-0' : 'md:translate-y-full'
      }`}
      style={{
        borderColor: 'var(--border-strong, #e5e7eb)',
        backgroundColor: 'color-mix(in oklab, var(--color-secondary, #fff) 88%, white)',
      }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
        {/* Product Info */}
        <div className="flex items-center gap-3">
          {productImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImage} alt={productName} className="h-10 w-10 rounded-lg object-cover" />
          )}
          <span className="line-clamp-1 text-sm font-semibold text-[var(--ds-text)]">{productName}</span>
        </div>

        {/* Price + Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black" style={{ color: 'var(--color-primary, #000)' }}>
              {price !== null ? formatPrice(price, currency) : 'اختر التركيبة'}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(compareAtPrice, currency)}
              </span>
            )}
          </div>

          <button
            onClick={onAddToCart}
            disabled={disabled}
            className="flex items-center gap-2 rounded-[18px] px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            {loading ? (
              <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
            {loading ? 'جارٍ الإضافة...' : 'أضف إلى السلة'}
          </button>
        </div>
      </div>
    </div>
  )
}

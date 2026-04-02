'use client'

import { useState, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/lib/stores/wishlist-store'

type WishlistButtonProps = {
  productId: string
  variantId?: string
  className?: string
  size?: 'sm' | 'md'
}

export function WishlistButton({
  productId,
  variantId,
  className = '',
  size = 'md',
}: WishlistButtonProps) {
  const { isInWishlist, addItem, removeItem } = useWishlistStore()
  const isWished = isInWishlist(productId, variantId)
  const [animating, setAnimating] = useState(false)

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setAnimating(true)
      setTimeout(() => setAnimating(false), 300)

      if (isWished) {
        removeItem(productId, variantId)
        // Also remove from server (fire & forget)
        fetch(`/api/storefront/wishlist/${productId}`, { method: 'DELETE' }).catch(() => {})
      } else {
        addItem(productId, variantId)
        // Also add to server (fire & forget)
        fetch('/api/storefront/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, variantId: variantId ?? '' }),
        }).catch(() => {})
      }
    },
    [isWished, productId, variantId, addItem, removeItem]
  )

  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <button
      onClick={handleToggle}
      aria-label={isWished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      className={`inline-flex items-center justify-center rounded-full border transition-all ${
        isWished
          ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'border-[var(--ds-border)] bg-[var(--ds-surface-glass)] text-[var(--ds-text-soft)] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500'
      } ${sizeClasses} ${animating ? 'scale-125' : ''} ${className}`}
    >
      <Heart
        className={`${iconSize} transition-all ${isWished ? 'fill-current' : ''}`}
      />
    </button>
  )
}
